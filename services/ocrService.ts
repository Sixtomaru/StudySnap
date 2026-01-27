import { createWorker } from 'tesseract.js';
import { Question } from '../types';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';

// Configuración de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

const generateId = () => Math.random().toString(36).substring(2, 9);

// --- 1. LÓGICA DE EXTRACCIÓN DE TEXTO (OCR) ---

const extractTextFromPDF = async (base64Data: string, onProgress?: (msg: string, percent: number) => void): Promise<string> => {
  try {
    const pdfData = atob(base64Data);
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    
    let fullText = "";
    const numPages = pdf.numPages;
    const maxPages = Math.min(numPages, 10); 

    for (let i = 1; i <= maxPages; i++) {
      if (onProgress) onProgress(`Leyendo página PDF ${i}/${maxPages}...`, Math.round((i / maxPages) * 50));
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      // Unir ítems con salto de línea si están lejos verticalmente, o espacio si están cerca
      // Simplificación: unimos con saltos de línea para facilitar el parseo posterior
      const pageText = textContent.items.map((item: any) => item.str).join('\n');
      fullText += `\n${pageText}\n`;
    }
    return fullText;
  } catch (error) {
    console.error("Error PDF:", error);
    throw new Error("No se pudo leer el PDF.");
  }
};

const extractTextFromImage = async (base64Data: string, onProgress?: (msg: string, percent: number) => void): Promise<string> => {
    const worker = await createWorker('spa'); // Cargar idioma español
    
    if (onProgress) onProgress("Iniciando motor OCR...", 10);
    
    const ret = await worker.recognize(`data:image/png;base64,${base64Data}`, {}, {
        logger: m => {
            if (m.status === 'recognizing text') {
                if (onProgress) onProgress("Escaneando texto...", 20 + Math.round(m.progress * 60));
            }
        }
    });
    
    await worker.terminate();
    return ret.data.text;
};

// --- 2. LÓGICA DE PARSEO (EL CEREBRO SIN IA) ---

/**
 * Convierte texto crudo en estructura de preguntas usando Expresiones Regulares.
 * Detecta patrones como:
 * "1. ¿Qué hora es?"
 * "a) Las cinco"
 * "b) Las seis"
 */
const parseTextToQuestions = (text: string): Question[] => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const questions: Question[] = [];
    
    let currentQuestion: Question | null = null;
    
    // Regex para detectar inicio de pregunta: "1.", "1-", "1)", "1 " al inicio de línea
    const questionStartRegex = /^(\d+)[\.\)\-\s]+(.+)/;
    
    // Regex para detectar inicio de opción: "a.", "a)", "a-", "A.", "A)" al inicio de línea
    const optionStartRegex = /^([a-zA-Z])[\.\)\-\s]+(.+)/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 1. ¿Es una nueva pregunta?
        const questionMatch = line.match(questionStartRegex);
        if (questionMatch) {
            // Guardar pregunta anterior si existe
            if (currentQuestion) {
                // Si no tiene opciones, intentamos buscarlas en líneas siguientes que no parezcan opciones explícitas
                // pero por ahora cerramos la pregunta
                questions.push(currentQuestion);
            }
            
            // Iniciar nueva pregunta
            currentQuestion = {
                id: generateId(),
                text: questionMatch[2].trim(), // El texto después del número
                options: [],
                correctOptionId: ""
            };
            continue;
        }

        // 2. ¿Es una opción de respuesta?
        const optionMatch = line.match(optionStartRegex);
        if (optionMatch && currentQuestion) {
            const optText = optionMatch[2].trim();
            currentQuestion.options.push({
                id: generateId(),
                text: optText
            });
            continue;
        }

        // 3. Si no es ni inicio de pregunta ni inicio de opción:
        //    Añadir al contexto actual (multilínea)
        if (currentQuestion) {
            // Si ya tenemos opciones, probablemente sea una continuación de la última opción
            if (currentQuestion.options.length > 0) {
                const lastOption = currentQuestion.options[currentQuestion.options.length - 1];
                lastOption.text += " " + line;
            } else {
                // Si no hay opciones aún, es continuación del texto de la pregunta
                currentQuestion.text += " " + line;
            }
        }
    }

    // Empujar la última pregunta
    if (currentQuestion) {
        questions.push(currentQuestion);
    }

    // FILTRADO FINAL Y LIMPIEZA
    // Si una pregunta no tiene opciones detectadas, generamos 4 vacías para que el usuario las rellene
    return questions.map(q => {
        if (q.options.length === 0) {
            return {
                ...q,
                options: Array(4).fill(null).map(() => ({ id: generateId(), text: '' }))
            };
        }
        return q;
    });
};


// --- FUNCIÓN PRINCIPAL EXPORTADA ---

export const parseFileToQuiz = async (
    base64Data: string, 
    mimeType: string, 
    onProgress?: (msg: string, percent: number) => void
): Promise<Question[]> => {
    
    let rawText = "";

    // Paso 1: Obtener texto plano (OCR o PDF Parser)
    if (mimeType.includes('pdf')) {
        rawText = await extractTextFromPDF(base64Data, onProgress);
    } else {
        rawText = await extractTextFromImage(base64Data, onProgress);
    }

    if (onProgress) onProgress("Analizando estructura...", 90);

    // Paso 2: Convertir texto plano a objetos Question
    const questions = parseTextToQuestions(rawText);

    if (onProgress) onProgress("Finalizado", 100);

    // Si no se detectó nada, devolver al menos un bloque con el texto crudo para edición manual
    if (questions.length === 0) {
         if (rawText.trim().length > 0) {
             // Fallback: poner todo el texto en una pregunta para que el usuario lo edite
             return [{
                 id: generateId(),
                 text: "No se detectó el formato automático. Texto extraído:\n\n" + rawText.substring(0, 500) + "...",
                 options: Array(4).fill(null).map(() => ({ id: generateId(), text: '' })),
                 correctOptionId: ""
             }];
         }
         throw new Error("No se pudo extraer texto legible de la imagen.");
    }

    return questions;
};
