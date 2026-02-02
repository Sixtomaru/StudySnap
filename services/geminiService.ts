import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Question } from "../types";
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';

// Configurar el worker de PDF.js desde CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

const generateId = () => Math.random().toString(36).substring(2, 9);
const MODEL_NAME = "gemini-flash-latest"; 

// --- UTILIDADES ---

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const compressImage = (base64Str: string, mimeType: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = `data:${mimeType};base64,${base64Str}`;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      const MAX_SIZE = 1024; 
      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
          resolve(base64Str);
          return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const newDataUrl = canvas.toDataURL('image/jpeg', 0.6);
      resolve(newDataUrl.split(',')[1]);
    };
    img.onerror = (e) => {
      console.warn("Error comprimiendo imagen", e);
      resolve(base64Str);
    };
  });
};

// --- PDF HELPERS ---

export const getPDFPageCount = async (base64Data: string): Promise<number> => {
    try {
        const pdfData = atob(base64Data);
        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        const pdf = await loadingTask.promise;
        return pdf.numPages;
    } catch (e) {
        console.error("Error contando páginas", e);
        return 0;
    }
};

const extractTextFromPDFRange = async (base64Data: string, startPage: number, endPage: number, onProgress?: (msg: string, percent: number) => void): Promise<string> => {
  try {
    const pdfData = atob(base64Data);
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    
    let fullText = "";
    const totalPagesToRead = endPage - startPage + 1;
    let pagesRead = 0;

    for (let i = startPage; i <= endPage; i++) {
      if (i > pdf.numPages) break;
      
      const percent = Math.round((pagesRead / totalPagesToRead) * 50);
      if (onProgress) onProgress(`Leyendo página ${i}...`, percent);
      
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += `--- Page ${i} ---\n${pageText}\n`;
      pagesRead++;
    }
    return fullText;
  } catch (error) {
    console.error("Error PDF:", error);
    return "";
  }
};

// --- CORE AI LOGIC ---

const generateQuestionsFromContent = async (contentToSend: any, onProgress?: (msg: string, percent: number) => void): Promise<Question[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey.includes("TU_CLAVE")) throw new Error("Falta la API Key en el archivo .env");

  const ai = new GoogleGenAI({ apiKey: apiKey });

  if (onProgress) onProgress("La IA está analizando...", 60);

  const systemInstruction = `
    You are an expert exam parser. Your goal is to extract multiple-choice questions from the provided content.
    
    CRITICAL INSTRUCTIONS FOR ANSWERS:
    1. Look for marked answers (bold text, asterisks '*', underlined).
    2. Look for an "Answer Key" or "Soluciones" section at the end of the text.
    3. If you find an answer key (e.g., "1-A, 2-C"), match it to the question number.
    4. If NO answer is indicated/found, set 'c' to -1. Do NOT guess unless obvious.
    
    STRICT JSON OUTPUT RULES:
    1. Output MUST be a valid JSON array.
    2. Clean up the text (remove "1.", "a)" from the start of the content).
    
    JSON Structure:
    [
      {
        "q": "Question text here",
        "o": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "c": 0 // Index of correct answer (0-3). -1 if unknown.
      }
    ]
  `;

  const MAX_RETRIES = 3; 
  let lastError: any;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (onProgress && attempt > 1) onProgress(`Reintentando (${attempt}/${MAX_RETRIES})...`, 70);
      
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: {
          role: 'user',
          parts: [
            contentToSend,
            ...(contentToSend.text ? [] : [{ text: "Extract questions and answers. Return JSON." }])
          ]
        },
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.1, 
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                q: { type: Type.STRING },
                o: { type: Type.ARRAY, items: { type: Type.STRING } },
                c: { type: Type.INTEGER }
              },
              required: ["q", "o", "c"]
            }
          }
        }
      });

      if (onProgress) onProgress("Procesando...", 90);

      const responseText = response.text;
      if (!responseText) throw new Error("La IA devolvió una respuesta vacía.");

      let jsonString = responseText.trim();
      if (jsonString.startsWith('```json')) jsonString = jsonString.replace(/^```json/, '').replace(/```$/, '').trim();
      else if (jsonString.startsWith('```')) jsonString = jsonString.replace(/^```/, '').replace(/```$/, '').trim();

      const rawData = JSON.parse(jsonString);
      if (!Array.isArray(rawData)) throw new Error("La IA no devolvió un formato válido.");

      if (onProgress) onProgress("Listo!", 100);

      return rawData.map((item: any) => {
        let cleanText = item.q || "Sin pregunta";
        cleanText = cleanText.replace(/^(\d+[\.\)\-]\s*)+/, "").trim();

        const options = (item.o || []).map((optText: string) => ({
          id: generateId(),
          text: optText.replace(/^([a-zA-Z][\.\)\-]\s*)+/, "").trim()
        }));

        let correctOptionId = "";
        if (typeof item.c === 'number' && item.c >= 0 && item.c < options.length) {
          correctOptionId = options[item.c].id;
        }

        return {
          id: generateId(),
          text: cleanText,
          options: options,
          correctOptionId: correctOptionId
        };
      });

    } catch (error: any) {
      lastError = error;
      const msg = error.message?.toLowerCase() || "";
      console.warn(`Intento ${attempt} fallido:`, msg);

      if (msg.includes("404") || msg.includes("not found")) {
         throw new Error(`El modelo IA (${MODEL_NAME}) no está disponible.`);
      }

      if (msg.includes("429") || msg.includes("503") || msg.includes("quota")) {
         if (attempt === MAX_RETRIES) throw new Error("QUOTA_EXCEEDED");
         const delay = 4000 * attempt;
         if (onProgress) onProgress(`Servidor ocupado. Esperando...`, 65);
         await wait(delay);
         continue;
      } else if (msg.includes("api key")) {
          throw new Error("API Key inválida.");
      } else {
        if (attempt === MAX_RETRIES) break;
      }
    }
  }

  if (lastError) {
      if (lastError.message === "QUOTA_EXCEEDED") {
        throw new Error("⚠️ Servidor saturado. Intenta subir menos páginas.");
      }
      throw new Error(`Error: ${lastError.message}`);
  }
  
  throw new Error("No se pudo analizar el documento.");
}

// --- EXPORTED FUNCTIONS ---

export const parseFileToQuiz = async (
    base64Data: string, 
    mimeType: string, 
    onProgress?: (msg: string, percent: number) => void
): Promise<Question[]> => {
    
  let contentToSend: any = null;

  if (mimeType.includes('pdf')) {
     // Default behavior for "Drag and drop" -> Read first 10 pages
     return processPDFBatch(base64Data, 1, 10, onProgress);
  } else if (mimeType.startsWith('image/')) {
    if (onProgress) onProgress("Optimizando imagen...", 20);
    const compressedBase64 = await compressImage(base64Data, mimeType);
    contentToSend = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: compressedBase64
      }
    };
  } else {
      contentToSend = { inlineData: { mimeType: mimeType, data: base64Data } };
  }

  return generateQuestionsFromContent(contentToSend, onProgress);
};

export const processPDFBatch = async (
    base64Data: string, 
    startPage: number, 
    numPagesToRead: number,
    onProgress?: (msg: string, percent: number) => void
): Promise<Question[]> => {
    
    if (onProgress) onProgress(`Leyendo páginas ${startPage}-${startPage + numPagesToRead - 1}...`, 10);
    
    const endPage = startPage + numPagesToRead - 1;
    const extractedText = await extractTextFromPDFRange(base64Data, startPage, endPage, onProgress);
    
    if (!extractedText || extractedText.length < 50) {
        throw new Error("No se encontró texto suficiente en este rango de páginas.");
    }

    const contentToSend = { text: `Extract questions from these pages (${startPage}-${endPage}):\n\n${extractedText}` };
    return generateQuestionsFromContent(contentToSend, onProgress);
};