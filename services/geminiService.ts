import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Question } from "../types";

const generateId = () => Math.random().toString(36).substring(2, 9);

export const parseFileToQuiz = async (base64Data: string, mimeType: string): Promise<Question[]> => {
  // Comprobación segura de process.env para evitar crash si no está definido
  const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : null;

  if (!apiKey) {
    throw new Error("Falta la API Key. En Netlify, ve a 'Site Settings > Environment Variables' y añade una variable llamada API_KEY con tu clave de Google.");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

  const prompt = `
    Analyze the provided document (image or PDF). It contains multiple choice test questions.
    Extract all questions, their options, and identify the correct answer if it is marked (circled, bolded, ticked, etc.).
    
    If the correct answer is NOT marked, set "correctOptionIndex" to -1.
    If the correct answer IS marked, set "correctOptionIndex" to the 0-based index of the correct option in the list.

    Return the data in a strict JSON array format.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
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
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              questionText: { type: Type.STRING },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              },
              correctOptionIndex: { type: Type.INTEGER, description: "-1 if unknown, 0-N if known" }
            },
            required: ["questionText", "options", "correctOptionIndex"],
            propertyOrdering: ["questionText", "options", "correctOptionIndex"]
          }
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("La IA no devolvió ningún resultado. La imagen podría estar borrosa o vacía.");
    }

    let jsonString = responseText.trim();
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (jsonString.startsWith('```')) {
       jsonString = jsonString.replace(/^```/, '').replace(/```$/, '').trim();
    }

    let rawData;
    try {
      rawData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, "Response Text:", responseText);
      throw new Error("Error al leer la respuesta de la IA (formato inválido).");
    }

    if (!Array.isArray(rawData)) {
      throw new Error("La IA devolvió un formato incorrecto (se esperaba una lista).");
    }

    return rawData.map((item: any) => {
      const options = (item.options || []).map((optText: string) => ({
        id: generateId(),
        text: optText
      }));

      let correctOptionId = "";
      if (typeof item.correctOptionIndex === 'number' && item.correctOptionIndex >= 0 && item.correctOptionIndex < options.length) {
        correctOptionId = options[item.correctOptionIndex].id;
      }

      return {
        id: generateId(),
        text: item.questionText || "Sin pregunta",
        options: options,
        correctOptionId: correctOptionId
      };
    });

  } catch (error: any) {
    console.error("Gemini Error Completo:", error);
    
    // Convertimos el error a string asegurándonos de capturar todo el detalle (incluyendo propiedades no enumerables si es posible)
    const errorStr = JSON.stringify(error, Object.getOwnPropertyNames(error)) + " " + String(error);

    // Detección robusta del error de API Key
    if (errorStr.includes("API_KEY_INVALID") || errorStr.includes("API key not valid") || errorStr.includes("400")) {
      throw new Error(
        "❌ CLAVE API RECHAZADA\n\n" +
        "Google ha rechazado tu clave. Revisa esto:\n" +
        "1. ¿Has copiado bien la clave en Netlify? (Sin espacios extra)\n" +
        "2. IMPORTANTE: Si pusiste restricciones HTTP en Google Cloud, debes añadir este dominio: " + window.location.hostname + "\n" +
        "3. ¿Está habilitada la 'Generative Language API' en tu proyecto de Google?"
      );
    }
    
    // Propagar mensaje original si no es de API Key
    throw new Error(error.message || "Ocurrió un error al procesar el archivo con la IA.");
  }
};