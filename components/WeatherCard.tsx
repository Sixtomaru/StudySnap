import React from 'react';
import { DailyForecast } from '../types';
import { 
  Cloud, 
  CloudRain, 
  CloudLightning, 
  CloudSnow, 
  Sun, 
  CloudSun, 
  Wind, 
  Droplets, 
  ArrowDown, 
  ArrowUp,
  CloudFog,
  CloudSunRain
} from 'lucide-react';

interface WeatherCardProps {
  day: DailyForecast;
  isToday?: boolean;
}

const WeatherCard: React.FC<WeatherCardProps> = ({ day, isToday = false }) => {
  const getIcon = (code: string) => {
    switch (code) {
      case 'sunny': 
        return <Sun className="text-yellow-400" size={isToday ? 64 : 32} />;
      
      case 'partly-cloudy': 
        // Sol con una nube
        return <CloudSun className="text-yellow-400" size={isToday ? 64 : 32} />;
      
      case 'sun-rain':
        // Sol con una nube con lluvia
        return <CloudSunRain className="text-blue-400" size={isToday ? 64 : 32} />;

      case 'cloudy': 
        // Nube
        return <Cloud className="text-gray-300" size={isToday ? 64 : 32} />;
      
      case 'rain': 
        // Nube con lluvia
        return <CloudRain className="text-blue-500" size={isToday ? 64 : 32} />;
      
      case 'storm': 
        // Nube con rayo
        return <CloudLightning className="text-purple-400" size={isToday ? 64 : 32} />;
      
      case 'snow': 
        // Nieve
        return <CloudSnow className="text-white" size={isToday ? 64 : 32} />;
      
      case 'fog': 
        // Niebla
        return <CloudFog className="text-gray-400" size={isToday ? 64 : 32} />;
      
      default: 
        return <Sun className="text-yellow-400" size={isToday ? 64 : 32} />;
    }
  };

  if (isToday) {
    return (
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 animate-fade-in-up">
        <div className="flex flex-col items-center md:items-start">
            <span className="bg-blue-500/30 text-blue-100 text-xs font-bold px-3 py-1 rounded-full mb-2 border border-blue-400/30">HOY</span>
            <h2 className="text-4xl font-bold mb-1">{day.dayName}</h2>
            <p className="text-blue-100 text-lg opacity-80">{day.date}</p>
            <div className="mt-4 flex items-center gap-2">
                <span className="text-2xl font-light capitalize">{day.conditionText}</span>
            </div>
        </div>

        <div className="flex flex-col items-center">
            {getIcon(day.iconCode)}
            <div className="flex items-center mt-2 gap-4">
                <div className="text-center">
                    <p className="text-5xl font-bold">{Math.round(day.avgMaxTemp)}°</p>
                    <p className="text-sm opacity-60">Máx</p>
                </div>
                <div className="h-12 w-px bg-white/20"></div>
                <div className="text-center">
                    <p className="text-3xl font-light opacity-90">{Math.round(day.avgMinTemp)}°</p>
                    <p className="text-sm opacity-60">Mín</p>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
            <div className="bg-black/20 rounded-xl p-3 flex items-center gap-3">
                <Droplets className="text-blue-300" size={20} />
                <div>
                    <p className="text-sm opacity-70">Lluvia</p>
                    <p className="font-bold">{day.avgRainProb}%</p>
                </div>
            </div>
            <div className="bg-black/20 rounded-xl p-3 flex items-center gap-3">
                <Wind className="text-gray-300" size={20} />
                <div>
                    <p className="text-sm opacity-70">Viento</p>
                    <p className="font-bold">{day.avgWindSpeed} <span className="text-xs">km/h</span></p>
                </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-white hover:bg-white/10 transition-colors flex flex-col items-center justify-between h-full min-h-[200px]">
      <div className="text-center">
        <p className="font-semibold text-lg">{day.dayName}</p>
        <p className="text-xs opacity-50">{day.date.substring(5)}</p>
      </div>
      
      <div className="my-4 transform scale-90">
        {getIcon(day.iconCode)}
      </div>
      
      <div className="w-full">
        <div className="flex justify-between items-center mb-2 px-2">
            <span className="flex items-center gap-1 font-bold text-lg"><ArrowUp size={14} className="text-red-300"/>{Math.round(day.avgMaxTemp)}°</span>
            <span className="flex items-center gap-1 opacity-70"><ArrowDown size={14} className="text-blue-300"/>{Math.round(day.avgMinTemp)}°</span>
        </div>
        
        <div className="flex justify-center gap-3 text-xs opacity-60 border-t border-white/10 pt-2">
            <span className="flex items-center gap-1"><Droplets size={10}/> {day.avgRainProb}%</span>
            <span className="flex items-center gap-1"><Wind size={10}/> {day.avgWindSpeed} <span className="scale-75 origin-left">km/h</span></span>
        </div>
      </div>
    </div>
  );
};

export default WeatherCard;