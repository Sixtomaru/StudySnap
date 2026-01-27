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
    if (onProgress) onProgress("Iniciando motor OCR...", 10);
    
    try {
        // CORRECCIÓN CRÍTICA: El logger debe pasarse en createWorker, no en recognize.
        // Pasar funciones en recognize causa DataCloneError porque intenta enviarlas al worker.
        const worker = await createWorker('spa', 1, {
            logger: m => {
                if (m.status === 'recognizing text') {
                    // m.progress es un valor de 0 a 1
                    const p = Math.round(m.progress * 100);
                    // Mapeamos el progreso del OCR (0-100) al rango de la UI (20-90)
                    if (onProgress) onProgress("Escaneando texto...", 20 + Math.round(p * 0.7));
                }
            }
        });
        
        const ret = await worker.recognize(`data:image/png;base64,${base64Data}`);
        await worker.terminate();
        return ret.data.text;
    } catch (e) {
        console.error("Error OCR:", e);
        throw new Error("Error al procesar la imagen. Intenta con una imagen más clara.");
    }
};

// --- 2. LÓGICA DE PARSEO (EL CEREBRO SIN IA) ---

const parseTextToQuestions = (text: string): Question[] => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const questions: Question[] = [];
    
    let currentQuestion: Question | null = null;
    
    // Regex mejoradas
    // Detecta: "1.", "1-", "1)", "1 " al inicio, O líneas que empiezan con "¿" si no hay número
    const questionStartRegex = /^(\d+)[\.\)\-\s]+(.+)/;
    const questionImplicitRegex = /^¿(.+)/; 
    
    // Detecta: "a.", "a)", "a-", "A.", "A)" al inicio de línea
    const optionStartRegex = /^([a-zA-Z])[\.\)\-\s]+(.+)/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 1. ¿Es una nueva pregunta explícita (con número)?
        let questionMatch = line.match(questionStartRegex);
        
        // Si no tiene número, ¿parece una pregunta (empieza por ¿)?
        if (!questionMatch && !currentQuestion) {
             const implicit = line.match(questionImplicitRegex);
             if (implicit) {
                 // Simulamos match structure: [full, "0", text]
                 questionMatch = [line, "0", line]; 
             }
        }

        if (questionMatch) {
            // Guardar pregunta anterior
            if (currentQuestion) {
                questions.push(currentQuestion);
            }
            
            // Iniciar nueva pregunta
            currentQuestion = {
                id: generateId(),
                text: questionMatch[2].trim(), 
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

        // 3. Texto continuado
        if (currentQuestion) {
            if (currentQuestion.options.length > 0) {
                const lastOption = currentQuestion.options[currentQuestion.options.length - 1];
                lastOption.text += " " + line;
            } else {
                currentQuestion.text += " " + line;
            }
        }
    }

    if (currentQuestion) {
        questions.push(currentQuestion);
    }

    // Post-procesado: Si detectamos una pregunta sin opciones, creamos placeholders
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

    if (mimeType.includes('pdf')) {
        rawText = await extractTextFromPDF(base64Data, onProgress);
    } else {
        rawText = await extractTextFromImage(base64Data, onProgress);
    }

    if (onProgress) onProgress("Analizando estructura...", 90);

    const questions = parseTextToQuestions(rawText);

    if (onProgress) onProgress("Finalizado", 100);

    // Fallback mejorado: Si no saca preguntas estructuradas, devuelve el texto en bruto
    if (questions.length === 0) {
         if (rawText.trim().length > 0) {
             return [{
                 id: generateId(),
                 text: "Texto extraído (Edita esto para crear tu pregunta):\n\n" + rawText.substring(0, 800) + (rawText.length > 800 ? "..." : ""),
                 options: Array(4).fill(null).map(() => ({ id: generateId(), text: '' })),
                 correctOptionId: ""
             }];
         }
         throw new Error("No se pudo leer texto de la imagen.");
    }

    return questions;
};
