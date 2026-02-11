import React, { useState, useEffect } from 'react';
import SearchBar from './components/SearchBar';
import WeatherCard from './components/WeatherCard';
import TemperatureChart from './components/TemperatureChart';
import HourlyForecast from './components/HourlyForecast';
import { WeatherData, LoadingState } from './types';
import { fetchAggregatedWeather } from './services/weatherService';
import { CloudSun, ExternalLink, Info, MapPin, Clock, RotateCw, CalendarClock } from 'lucide-react';

const CACHE_KEY_WEATHER = 'climeta_last_weather';
const CACHE_KEY_TIMESTAMP = 'climeta_weather_ts';
const CACHE_KEY_HISTORY = 'climeta_search_history';
const MAX_HISTORY_ITEMS = 5;

const App: React.FC = () => {
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isCachedData, setIsCachedData] = useState(false);
  const [cacheAgeLabel, setCacheAgeLabel] = useState<string>('');

  // 1. INITIAL LOAD
  useEffect(() => {
    // History
    const storedHistory = localStorage.getItem(CACHE_KEY_HISTORY);
    if (storedHistory) {
      try {
        setRecentSearches(JSON.parse(storedHistory));
      } catch (e) { console.error(e); }
    }

    // Weather Data
    const storedWeather = localStorage.getItem(CACHE_KEY_WEATHER);
    const storedTs = localStorage.getItem(CACHE_KEY_TIMESTAMP);

    if (storedWeather && storedTs) {
        try {
            const data = JSON.parse(storedWeather);
            setWeatherData(data);
            setLoadingState(LoadingState.SUCCESS);
            setIsCachedData(true);
            
            // Calculate age for label
            const diff = Date.now() - parseInt(storedTs, 10);
            const minutes = Math.floor(diff / 60000);
            if (minutes < 60) {
                setCacheAgeLabel(`Hace ${minutes} min`);
            } else if (minutes < 1440) { // Less than 24h
                 setCacheAgeLabel(`Hace ${Math.floor(minutes / 60)}h`);
            } else {
                 setCacheAgeLabel(`Hace ${Math.floor(minutes / 1440)} días`);
            }
        } catch (e) { 
            console.error(e); 
        }
    }
  }, []);

  // Progress Bar
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (loadingState === LoadingState.LOADING) {
      setProgress(5); 
      interval = setInterval(() => {
        setProgress((prev) => {
          const remaining = 95 - prev;
          if (remaining <= 0.5) return prev; 
          const increment = (remaining / 20) + (Math.random() * 0.5);
          return prev + increment;
        });
      }, 150);
    } else if (loadingState === LoadingState.SUCCESS) {
      setProgress(100);
    }
    return () => clearInterval(interval);
  }, [loadingState]);

  const updateHistory = (city: string) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== city.toLowerCase());
      const newHistory = [city, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      localStorage.setItem(CACHE_KEY_HISTORY, JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const handleSearch = async (city: string, forceRefresh = false) => {
    if (!forceRefresh && weatherData && weatherData.city.toLowerCase() === city.toLowerCase()) {
        console.log("Blocking redundant search for displayed city to save quota.");
        return; 
    }

    setLoadingState(LoadingState.LOADING);
    setErrorMsg('');
    
    if (weatherData && weatherData.city.toLowerCase() !== city.toLowerCase()) {
        setWeatherData(null);
    }

    try {
      const data = await fetchAggregatedWeather(city);
      
      setWeatherData(data);
      setLoadingState(LoadingState.SUCCESS);
      setIsCachedData(false);
      setCacheAgeLabel('Ahora mismo');
      
      localStorage.setItem(CACHE_KEY_WEATHER, JSON.stringify(data));
      localStorage.setItem(CACHE_KEY_TIMESTAMP, Date.now().toString());
      
      updateHistory(data.city);

    } catch (err: any) {
      console.error(err);
      setLoadingState(LoadingState.ERROR);
      
      if (err.message === 'not_found') {
        setErrorMsg('Lugar no encontrado. Por favor, verifica el nombre.');
      } else if (err.message === 'quota_exceeded') {
        setErrorMsg('Límite de uso diario alcanzado (Error 429).');
      } else if (err.message === 'server_overload') {
        setErrorMsg('Servidores saturados (Error 503). Inténtalo en unos segundos.');
      } else if (err.message === 'invalid_api_key' || err.message === 'api_key_missing') {
        setErrorMsg('Clave API inválida o ausente. Revisa tu configuración.');
      } else {
        // Muestra el error real si no es uno de los anteriores
        setErrorMsg(`Error inesperado: ${err.message || 'Error de conexión'}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white selection:bg-blue-500 selection:text-white font-sans select-none">
      
      <header className="p-6 flex justify-between items-center backdrop-blur-sm bg-black/10 border-b border-white/5 sticky top-0 z-50">
        <div className="flex items-center gap-2">
            <div className="bg-blue-500 p-2 rounded-lg">
                <CloudSun className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
                Climeta
            </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 flex flex-col items-center gap-12">
        
        <div className="text-center space-y-4 max-w-3xl animate-fade-in">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter">
                El Tiempo, <span className="text-blue-400">Promediado.</span>
            </h2>
            <p className="text-lg md:text-xl text-slate-300 leading-relaxed">
                Media aritmética inteligente de AEMET, Weather.com, Windy y más.
            </p>
        </div>

        <div className="w-full max-w-2xl flex flex-col gap-4 relative z-10">
            <SearchBar onSearch={(c) => handleSearch(c, true)} isLoading={loadingState === LoadingState.LOADING} />
            
            {recentSearches.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 animate-fade-in">
                {recentSearches.map((term, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSearch(term, term.toLowerCase() === weatherData?.city.toLowerCase())}
                    disabled={loadingState === LoadingState.LOADING}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-white/5 hover:bg-white/15 border border-white/10 rounded-full text-sm text-blue-100 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Clock size={12} className="opacity-70" />
                    {term}
                  </button>
                ))}
              </div>
            )}
        </div>

        {loadingState === LoadingState.LOADING && (
            <div className="w-full max-w-2xl flex flex-col items-center gap-4 mt-4 animate-fade-in">
                <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden border border-white/5 shadow-inner relative">
                    <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                        style={{ width: `${progress}%` }}
                    >
                        <div className="absolute inset-0 progress-bar-shine"></div>
                    </div>
                </div>
                <p className="text-blue-200 text-sm font-mono">{Math.round(progress)}% - Analizando fuentes por horas...</p>
            </div>
        )}

        {loadingState === LoadingState.ERROR && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-6 rounded-2xl max-w-lg text-center animate-fade-in-up">
                <p className="font-semibold text-lg mb-1">¡Ups! Algo salió mal</p>
                <p className="opacity-90">{errorMsg}</p>
            </div>
        )}

        {loadingState === LoadingState.SUCCESS && weatherData && (
            <div className="w-full max-w-6xl space-y-8 animate-fade-in-up">
                
                {/* City Header & Actions */}
                <div className="flex flex-col md:flex-row justify-between items-end border-b border-white/10 pb-4">
                    <div>
                        <div className="flex items-center gap-2 text-blue-300 mb-1">
                            <MapPin size={18} />
                            <span className="text-sm uppercase tracking-wider font-semibold">Informe Meteorológico</span>
                        </div>
                        <h3 className="text-5xl font-bold">{weatherData.city}</h3>
                    </div>
                    <div className="text-right mt-4 md:mt-0 flex flex-col items-end gap-2">
                        <button 
                            onClick={() => handleSearch(weatherData.city, true)}
                            className="flex items-center gap-2 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white transition-colors border border-white/10"
                            title="Recargar datos (consume cuota)"
                        >
                            <RotateCw size={12} />
                            Actualizar datos
                        </button>
                        
                        <div className="flex items-center gap-2 text-slate-400 bg-black/30 px-3 py-1 rounded-md border border-white/5">
                            {isCachedData ? <Clock size={14} className="text-yellow-500"/> : <RotateCw size={14} className="text-green-500"/>}
                            <div className="text-right leading-tight">
                                <p className="text-[10px] uppercase font-bold tracking-wider">{isCachedData ? 'Guardado' : 'En vivo'}</p>
                                <p className="text-xs font-mono text-white">{cacheAgeLabel || weatherData.analysisTimestamp}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {weatherData.daily.length > 0 && (
                    <div className="w-full">
                        <WeatherCard day={weatherData.daily[0]} isToday={true} />
                    </div>
                )}

                {weatherData.hourly && weatherData.hourly.length > 0 && (
                    <HourlyForecast data={weatherData.hourly} />
                )}

                <div className="space-y-4">
                    <h4 className="text-2xl font-bold flex items-center gap-2">
                        Próximos 7 Días
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                        {weatherData.daily.slice(1).map((day, idx) => (
                            <WeatherCard key={idx} day={day} />
                        ))}
                    </div>
                </div>

                <TemperatureChart data={weatherData.daily} />

                <div className="bg-black/20 rounded-2xl p-6 border border-white/5 mt-12">
                    <div className="flex items-center gap-2 mb-4 text-blue-300">
                        <Info size={20} />
                        <h5 className="font-semibold">Fuentes Consultadas</h5>
                    </div>
                    <p className="text-sm text-slate-400 mb-4">
                        Promedio calculado de: AEMET, Weather.com, AccuWeather, Foreca, Meteoblue, Eltiempo.es y Windy.com.
                    </p>
                    
                    {weatherData.sources.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {weatherData.sources.map((source, idx) => (
                                <a 
                                    key={idx} 
                                    href={source.uri} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-xs text-blue-100 group"
                                >
                                    <span className="truncate mr-2">{source.title}</span>
                                    <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-500 italic">Datos procesados por Gemini AI.</p>
                    )}
                </div>

            </div>
        )}
      </main>

      <footer className="border-t border-white/5 bg-black/20 p-8 text-center text-slate-500 text-sm">
        <p>Climeta. Datos procesados por Gemini AI.</p>
      </footer>
    </div>
  );
};

export default App;