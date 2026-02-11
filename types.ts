export interface DailyForecast {
  date: string; // YYYY-MM-DD
  dayName: string; // Lunes, Martes...
  avgMaxTemp: number;
  avgMinTemp: number;
  avgWindSpeed: number; // km/h
  avgRainProb: number; // %
  conditionText: string; // "Soleado", "Nublado", etc.
  // Updated list based on user request
  iconCode: 'sunny' | 'partly-cloudy' | 'sun-rain' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog';
}

export interface HourlyForecast {
  time: string; // "14:00"
  dayLabel: string; // "Lunes", "Martes" (Used to detect day change)
  temp: number;
  precipProb: number;
  conditionText: string;
  iconCode: DailyForecast['iconCode'];
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface WeatherData {
  city: string;
  daily: DailyForecast[];
  hourly: HourlyForecast[];
  sources: GroundingSource[];
  analysisTimestamp: string;
}

export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}