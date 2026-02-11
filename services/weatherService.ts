import { GoogleGenAI } from "@google/genai";
import { WeatherData, DailyForecast, HourlyForecast, GroundingSource } from "../types";

// Helper to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// LISTA DE MODELOS
const MODELS_TO_TRY = [
  'gemini-2.0-flash', 
  'gemini-1.5-flash', 
  'gemini-1.5-pro'    
];

export const fetchAggregatedWeather = async (city: string): Promise<WeatherData> => {
  if (!process.env.API_KEY) {
    console.error("API Key is missing.");
    throw new Error("api_key_missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Actúa como un meteorólogo experto.
    
    OBJETIVO:
    Obtener previsión para: "${city}".
    
    REGLAS DE COHERENCIA OBLIGATORIAS:
    1. SI "precipProb" < 20%, EL ICONO NO PUEDE SER 'rain', 'storm' NI 'sun-rain'.
    2. SI "precipProb" > 60%, EL ICONO DEBE SER 'rain' o 'storm'.
    3. Para 'daily', debes generar OBLIGATORIAMENTE 7 días (empezando hoy).

    ESTRUCTURA JSON:
    {
      "cityName": "Nombre oficial",
      "daily": [ 
        {
          "date": "YYYY-MM-DD",
          "dayName": "Lunes",
          "avgMaxTemp": 20,
          "avgMinTemp": 10,
          "avgWindSpeed": 15,
          "avgRainProb": 5,
          "conditionText": "Soleado",
          "iconCategory": "sunny" // options: sunny, partly-cloudy, sun-rain, cloudy, rain, storm, snow, fog
        }
        // ... repite hasta tener 7 días exactos
      ],
      "hourly": [
        {
          "time": "HH:00",
          "dayLabel": "Lunes",
          "temp": 18,
          "precipProb": 0,
          "conditionText": "Despejado",
          "iconCategory": "sunny"
        }
        // ... repite para próximas 24h
      ]
    }
    
    IMPORTANTE: Responde ÚNICAMENTE con el bloque JSON.
  `;

  let lastError = null;

  // Try models in sequence
  for (const modelName of MODELS_TO_TRY) {
    try {
      console.log(`Attempting weather fetch with model: ${modelName}`);
      
      const response = await ai.models.generateContent({
        model: modelName, 
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          maxOutputTokens: 4000, 
        },
      });

      let jsonText = response.text;
      if (!jsonText) throw new Error("empty_response");

      jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      // Attempt to clean JSON
      const firstBracket = jsonText.indexOf('{');
      const lastBracket = jsonText.lastIndexOf('}');
      if (firstBracket !== -1 && lastBracket !== -1) {
          jsonText = jsonText.substring(firstBracket, lastBracket + 1);
      }
      
      const rawData = JSON.parse(jsonText);

      if (rawData.error === 'not_found') {
          throw new Error("city_not_found_logic"); 
      }

      // Process Data
      const mapToValidIcon = (apiIcon: string): DailyForecast['iconCode'] => {
        const validIcons = ['sunny', 'partly-cloudy', 'sun-rain', 'cloudy', 'rain', 'storm', 'snow', 'fog'];
        return validIcons.includes(apiIcon) ? (apiIcon as DailyForecast['iconCode']) : 'sunny';
      };

      const dailyForecast: DailyForecast[] = (rawData.daily || []).map((day: any) => ({
        ...day,
        iconCode: mapToValidIcon(day.iconCategory)
      }));

      const hourlyForecast: HourlyForecast[] = (rawData.hourly || []).map((hour: any) => ({
        ...hour,
        iconCode: mapToValidIcon(hour.iconCategory)
      }));

      // Extract sources
      const sources: GroundingSource[] = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          sources.push({ title: chunk.web.title, uri: chunk.web.uri });
        }
      });
      const uniqueSources = Array.from(new Map(sources.map(item => [item.uri, item])).values());

      return {
        city: rawData.cityName || city,
        daily: dailyForecast,
        hourly: hourlyForecast,
        sources: uniqueSources,
        analysisTimestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      };

    } catch (error: any) {
      console.warn(`Model ${modelName} failed:`, error.message || error);
      lastError = error;

      // CRITICAL: Check for Auth errors immediately and STOP.
      // 400: Invalid Argument (often Bad Key)
      // 403: Permission Denied (Invalid Key)
      if (error.status === 400 || error.status === 403 || error.message?.includes('API key')) {
        throw new Error("invalid_api_key");
      }

      // If logic error "city_not_found", stop immediately.
      if (error.message === 'city_not_found_logic') {
        throw new Error("not_found");
      }

      // If last model, stop loop
      if (modelName === MODELS_TO_TRY[MODELS_TO_TRY.length - 1]) {
        break;
      }

      await delay(1000);
    }
  }

  // Determine specific error to return based on lastError
  console.error("All models failed. Last error:", lastError);
  
  if (lastError?.message === 'not_found' || lastError?.message === 'city_not_found_logic') {
      throw new Error("not_found");
  }
  
  if (lastError?.status === 429 || lastError?.message?.includes('429') || lastError?.message?.includes('quota')) {
      throw new Error("quota_exceeded");
  }

  if (lastError?.status === 503) {
      throw new Error("server_overload");
  }

  // If we don't know what it is, throw the raw error message so we can see it in console/UI
  throw new Error("unknown_error");
};