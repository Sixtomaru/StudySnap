import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Question } from "../types";
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';

// Configurar el worker de PDF.js desde CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

const generateId = () => Math.random().toString(36).substring(2, 9);

// CAMBIO: Usamos el alias 'gemini-flash-latest'.
// Esto apunta automáticamente a la versión Flash estable más reciente (actualmente 1.5 Flash).
// Tiene un límite gratuito alto (1500 RPM) y es muy rápido.
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

const extractTextFromPDF = async (base64Data: string, onProgress?: (msg: string, percent: number) => void): Promise<string> => {
  try {
    const pdfData = atob(base64Data);
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    
    let fullText = "";
    const numPages = pdf.numPages;
    const maxPages = Math.min(numPages, 10); 

    for (let i = 1; i <= maxPages; i++) {
      const percent = Math.round((i / maxPages) * 60);
      if (onProgress) onProgress(`Leyendo página ${i} de ${numPages}...`, percent);
      
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += `--- Page ${i} ---\n${pageText}\n`;
    }
    return fullText;
  } catch (error) {
    console.error("Error PDF:", error);
    return "";
  }
};

// --- FUNCIÓN PRINCIPAL ---

export const parseFileToQuiz = async (
    base64Data: string, 
    mimeType: string, 
    onProgress?: (msg: string, percent: number) => void
): Promise<Question[]> => {
    
  // CLAVE DIRECTA DEL ENTORNO
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey.includes("TU_CLAVE")) throw new Error("Falta la API Key en el archivo .env (o en la configuración de Netlify).");

  const ai = new GoogleGenAI({ apiKey: apiKey });
  let contentToSend: any = null;

  if (mimeType.includes('pdf')) {
    if (onProgress) onProgress("Procesando PDF...", 10);
    const extractedText = await extractTextFromPDF(base64Data, onProgress);
    if (extractedText && extractedText.length > 50) {
       contentToSend = { text: `Extract questions from this text:\n\n${extractedText}` };
    }
  } else if (mimeType.startsWith('image/')) {
    if (onProgress) onProgress("Optimizando imagen...", 20);
    const compressedBase64 = await compressImage(base64Data, mimeType);
    contentToSend = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: compressedBase64
      }
    };
  }

  if (!contentToSend) {
    contentToSend = { inlineData: { mimeType: mimeType, data: base64Data } };
  }

  if (onProgress) onProgress("La IA está leyendo el examen...", 60);

  const systemInstruction = `
    You are an expert exam parser. Your goal is to extract multiple-choice questions from the provided image or text.
    STRICT RULES:
    1. Output MUST be a valid JSON array.
    2. Handle mixed layouts (columns, messy text).
    3. Identify questions that start with numbers (1., 2., 3...) or look like questions.
    4. Identify options labeled with letters (a), b), c)... or a., b., c....).
    5. Clean up the text (remove "1.", "a)" from the content, keep only the text).
    6. If you cannot find options for a question, leave the options array empty.
    
    JSON Structure:
    [
      {
        "q": "Question text here",
        "o": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "c": 0 // Index of correct answer if marked (0-3), otherwise -1
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
            ...(contentToSend.text ? [] : [{ text: "Extract questions carefully. Return JSON." }])
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
         // Si falla el modelo, probamos sin retry inmediato para cambiar estrategia si implementáramos fallback
         throw new Error(`El modelo IA (${MODEL_NAME}) no está disponible o no existe.`);
      }

      if (msg.includes("429") || msg.includes("503") || msg.includes("quota") || msg.includes("exhausted")) {
         if (attempt === MAX_RETRIES) {
             throw new Error("QUOTA_EXCEEDED");
         }
         const delay = 4000 * attempt;
         if (onProgress) onProgress(`Servidor ocupado. Esperando...`, 65);
         await wait(delay);
         continue;
      } else if (msg.includes("api key") || msg.includes("auth")) {
          throw new Error("Tu API Key no es válida. Revisa el archivo .env");
      } else {
        // Otros errores (parsing, network)
        if (attempt === MAX_RETRIES) break;
      }
    }
  }

  // Error final más descriptivo
  if (lastError) {
      if (lastError.message === "QUOTA_EXCEEDED" || lastError.message?.includes("429")) {
        throw new Error("⚠️ Servidor saturado (Límite diario alcanzado).");
      }
      throw new Error(`Error: ${lastError.message}`);
  }
  
  throw new Error("No se pudo analizar el documento. Intenta con una imagen más clara.");
};