import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Question } from "../types";

const generateId = () => Math.random().toString(36).substring(2, 9);

export const parseFileToQuiz = async (base64Data: string, mimeType: string, onProgress?: (msg: string) => void): Promise<Question[]> => {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    throw new Error("Falta la API Key.");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

  if (onProgress) onProgress("Analizando documento con IA...");

  // PROMPT OPTIMIZADO:
  // 1. Pide explícitamente ignorar saltos de sección.
  // 2. Pide NO incluir la numeración original (1., 2., etc).
  // 3. Usa claves cortas en el JSON (q, o, c) para ahorrar Output Tokens y permitir más preguntas por respuesta.
  const prompt = `
    Analyze the provided document. It is a multiple choice test.
    Extract ALL questions found in the document, regardless of section headers, page breaks, or topic changes. Do not stop until the end of the document.

    Rules:
    1. REMOVE any numbering from the question text (e.g., change "1. What is..." to "What is...").
    2. Identify the correct answer if marked. Set "c" to the 0-based index. If not marked, set "c" to -1.
    3. Return a JSON array using these short keys to save space:
       "q": Question text.
       "o": Array of options text.
       "c": Correct option index.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        // Max output tokens increased slightly if possible by model defaults, 
        // but schema minimization is the best strategy here.
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

    if (onProgress) onProgress("Procesando respuestas...");

    const responseText = response.text;
    if (!responseText) throw new Error("La IA no devolvió datos.");

    let jsonString = responseText.trim();
    // Limpieza básica de markdown json si existiera
    if (jsonString.startsWith('```json')) jsonString = jsonString.replace(/^```json/, '').replace(/```$/, '').trim();
    else if (jsonString.startsWith('```')) jsonString = jsonString.replace(/^```/, '').replace(/```$/, '').trim();

    let rawData;
    try {
      rawData = JSON.parse(jsonString);
    } catch (e) {
      throw new Error("Error de formato en la respuesta de la IA.");
    }

    if (!Array.isArray(rawData)) throw new Error("Formato inválido.");

    return rawData.map((item: any) => {
      // Limpieza extra de numeración por si la IA falló en la instrucción
      let cleanText = item.q || "Sin pregunta";
      cleanText = cleanText.replace(/^\d+[\.\)\-]\s*/, ""); 

      const options = (item.o || []).map((optText: string) => ({
        id: generateId(),
        text: optText.replace(/^[a-zA-Z][\.\)\-]\s*/, "") // Limpiar también "a) " de las opciones
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
    console.error("Gemini Error:", error);
    if (error.message.includes("429")) {
        throw new Error("⚠️ Límite de IA alcanzado. Espera un minuto.");
    }
    throw new Error("Error al escanear: " + error.message);
  }
};