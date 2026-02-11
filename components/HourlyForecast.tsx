import React from 'react';
import { HourlyForecast as HourlyForecastType } from '../types';
import { 
  Cloud, 
  CloudLightning, 
  CloudRain, 
  CloudSnow, 
  Sun, 
  Moon, 
  CloudMoon, 
  CloudSun, 
  Wind, 
  Droplets,
  CloudFog,
  CloudSunRain,
  CloudMoonRain
} from 'lucide-react';

interface HourlyForecastProps {
  data: HourlyForecastType[];
}

const HourlyForecast: React.FC<HourlyForecastProps> = ({ data }) => {
  
  const getIcon = (code: string, precipProb: number, time: string, size = 24) => {
    // Parse hour from "14:00" or "14:30"
    const hour = parseInt(time.split(':')[0], 10);
    const isNight = !isNaN(hour) && (hour >= 20 || hour <= 7);

    // --- CLIENT SIDE SAFETY CHECK ---
    // If API returns a rain icon but probability is very low (< 20%), force cloudy/partly-cloudy
    if ((code === 'rain' || code === 'sun-rain' || code === 'storm') && precipProb < 20) {
        code = 'partly-cloudy';
    }
    // If probability is high (> 60%) but API returned sun, force rain
    if (code === 'sunny' && precipProb > 60) {
        code = 'rain';
    }
    // -------------------------------

    switch (code) {
      case 'sunny': 
        return isNight 
          ? <Moon className="text-blue-100" size={size} /> 
          : <Sun className="text-yellow-400" size={size} />;
      
      case 'partly-cloudy':
        return isNight 
          ? <CloudMoon className="text-blue-200" size={size} />
          : <CloudSun className="text-yellow-400" size={size} />;
          
      case 'sun-rain':
         return isNight
           ? <CloudMoonRain className="text-blue-300" size={size} />
           : <CloudSunRain className="text-blue-400" size={size} />;

      case 'cloudy': return <Cloud className="text-gray-300" size={size} />;
      
      case 'rain': return <CloudRain className="text-blue-500" size={size} />;
      
      case 'storm': return <CloudLightning className="text-purple-400" size={size} />;
      
      case 'snow': return <CloudSnow className="text-white" size={size} />;
      
      case 'fog': return <CloudFog className="text-gray-400" size={size} />;
      
      case 'windy': return <Wind className="text-gray-400" size={size} />;
      
      default: return <Sun className="text-yellow-400" size={size} />;
    }
  };

  return (
    <div className="w-full bg-black/20 backdrop-blur-md border border-white/5 rounded-3xl p-6 overflow-hidden animate-fade-in-up">
      <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
        Próximas 24 Horas
      </h3>
      
      <div className="flex overflow-x-auto pb-4 pt-3 gap-4 
        [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']
        md:[&::-webkit-scrollbar]:block md:[scrollbar-width:auto] md:[-ms-overflow-style:auto]
        md:[&::-webkit-scrollbar]:h-2
        md:[&::-webkit-scrollbar-track]:bg-white/5 md:[&::-webkit-scrollbar-track]:rounded-full
        md:[&::-webkit-scrollbar-thumb]:bg-white/20 md:[&::-webkit-scrollbar-thumb]:rounded-full md:[&::-webkit-scrollbar-thumb]:hover:bg-white/30
      ">
        {data.map((hour, idx) => {
            const isNewDay = hour.time.startsWith('00') || hour.time.startsWith('0:') || (idx > 0 && data[idx-1].dayLabel !== hour.dayLabel);

            return (
              <div key={idx} className={`relative flex-shrink-0 flex flex-col items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-4 min-w-[100px] h-[160px] hover:bg-white/10 transition-colors ${isNewDay ? 'bg-blue-500/10 border-blue-500/30' : ''}`}>
                
                {isNewDay && (
                  <div className="absolute top-1 left-1/2 transform -translate-x-1/2 bg-blue-600/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest whitespace-nowrap shadow-sm z-10">
                    {hour.dayLabel}
                  </div>
                )}

                <span className={`text-sm font-medium text-slate-300 ${isNewDay ? 'mt-3' : 'mt-1'}`}>{hour.time}</span>
                <div className="my-2 transform scale-110">
                  {getIcon(hour.iconCode, hour.precipProb, hour.time)}
                </div>
                <div className="text-center">
                  <span className="text-xl font-bold block">{Math.round(hour.temp)}°</span>
                  <div className="flex items-center gap-1 text-xs text-blue-300 mt-1">
                    <Droplets size={10} />
                    <span>{hour.precipProb}%</span>
                  </div>
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
};

export default HourlyForecast;