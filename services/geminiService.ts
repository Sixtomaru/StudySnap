import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Question } from "../types";
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';

// Configurar el worker de PDF.js desde CDN para evitar problemas de bundler
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

const generateId = () => Math.random().toString(36).substring(2, 9);
const MODEL_NAME = "gemini-2.0-flash"; // Modelo más estable y rápido para Free Tier

// --- UTILIDADES ---

// Espera asíncrona para reintentos
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Función para comprimir imágenes usando Canvas (Redimensiona a máx 1024px y baja calidad a 0.7)
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
      const newDataUrl = canvas.toDataURL('image/jpeg', 0.7);
      resolve(newDataUrl.split(',')[1]);
    };
    img.onerror = (e) => {
      console.warn("Error comprimiendo imagen, usando original", e);
      resolve(base64Str);
    };
  });
};

// Extracción de texto PDF local con reporte de progreso REAL (0-60%)
const extractTextFromPDF = async (base64Data: string, onProgress?: (msg: string, percent: number) => void): Promise<string> => {
  try {
    const pdfData = atob(base64Data);
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    
    let fullText = "";
    const numPages = pdf.numPages;

    for (let i = 1; i <= numPages; i++) {
      // Calculamos porcentaje del 0 al 60% asignado a la lectura
      const percent = Math.round((i / numPages) * 60);
      if (onProgress) onProgress(`Leyendo página ${i} de ${numPages}...`, percent);
      
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += `--- Page ${i} ---\n${pageText}\n`;
    }
    return fullText;
  } catch (error) {
    console.error("Error extrayendo texto PDF:", error);
    return "";
  }
};

// --- FUNCIÓN PRINCIPAL CON REINTENTOS ---

// Modificamos la firma para aceptar (msg, percent)
export const parseFileToQuiz = async (
    base64Data: string, 
    mimeType: string, 
    onProgress?: (msg: string, percent: number) => void
): Promise<Question[]> => {
    
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("Falta la API Key.");

  const ai = new GoogleGenAI({ apiKey: apiKey });
  let contentToSend: any = null;

  // Fase 1: PREPARACIÓN (0% - 60%)
  if (mimeType.includes('pdf')) {
    if (onProgress) onProgress("Iniciando lectura PDF...", 5);
    const extractedText = await extractTextFromPDF(base64Data, onProgress);
    if (extractedText && extractedText.length > 50) {
       contentToSend = { text: `Extract questions from this text:\n\n${extractedText}` };
    }
  } else if (mimeType.startsWith('image/')) {
    if (onProgress) onProgress("Optimizando imagen...", 10);
    const compressedBase64 = await compressImage(base64Data, mimeType);
    if (onProgress) onProgress("Imagen lista...", 40);
    contentToSend = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: compressedBase64
      }
    };
  }

  // Fallback
  if (!contentToSend) {
    contentToSend = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data
      }
    };
  }

  // Fase 2: CONEXIÓN IA (60% - 90%)
  if (onProgress) onProgress("Conectando con la IA...", 60);

  const systemInstruction = `
    You are an expert exam creator. Extract multiple-choice questions.
    Ignore headers, footers, page numbers.
    RULES:
    1. Output strictly JSON array.
    2. Remove numbering (e.g. "1. Question" -> "Question").
    3. If correct answer is found, set 'c' to index (0-3), else -1.
    4. Short keys: "q" (question), "o" (options), "c" (correct index).
  `;

  const MAX_RETRIES = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (onProgress && attempt > 1) onProgress(`Reintentando conexión (${attempt}/${MAX_RETRIES})...`, 60);
      
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: {
          role: 'user',
          parts: [
            contentToSend,
            ...(contentToSend.text ? [] : [{ text: "Extract all multiple choice questions." }])
          ]
        },
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
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

      if (onProgress) onProgress("Procesando respuesta...", 90);

      const responseText = response.text;
      if (!responseText) throw new Error("Respuesta vacía de la IA.");

      // Limpieza de JSON
      let jsonString = responseText.trim();
      if (jsonString.startsWith('```json')) jsonString = jsonString.replace(/^```json/, '').replace(/```$/, '').trim();
      else if (jsonString.startsWith('```')) jsonString = jsonString.replace(/^```/, '').replace(/```$/, '').trim();

      const rawData = JSON.parse(jsonString);
      if (!Array.isArray(rawData)) throw new Error("Formato inválido.");

      if (onProgress) onProgress("Finalizando...", 100);

      return rawData.map((item: any) => {
        let cleanText = item.q || "Sin pregunta";
        cleanText = cleanText.replace(/^(\d+[\.\)\-]\s*)+/, "").trim();

        const options = (item.o || []).map((optText: string) => ({
          id: generateId(),
          text: optText.replace(/^([a-zA-Z\d][\.\)\-]\s*)+/, "").trim()
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
      console.warn(`Intento ${attempt} fallido:`, error.message);
      
      if (error.message?.includes("429") || error.message?.includes("503") || error.message?.includes("quota")) {
         if (attempt < MAX_RETRIES) {
            const delay = 2000 * attempt;
            // No bajamos la barra de progreso, solo actualizamos mensaje
            if (onProgress) onProgress(`IA saturada. Esperando ${delay/1000}s...`, 65);
            await wait(delay);
            continue;
         }
      } else {
        break;
      }
    }
  }

  if (lastError?.message?.includes("429")) {
      throw new Error("⚠️ El sistema está muy saturado. Por favor, espera 1 minuto.");
  }
  throw new Error("No se pudo analizar el documento. Intenta con una imagen más clara o menos páginas.");
};