import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DailyForecast } from '../types';

interface TemperatureChartProps {
  data: DailyForecast[];
}

const TemperatureChart: React.FC<TemperatureChartProps> = ({ data }) => {
  const chartData = data.map(day => ({
    name: day.dayName.substring(0, 3),
    max: day.avgMaxTemp,
    min: day.avgMinTemp,
    fullDate: day.date
  }));

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-lg">
      <h3 className="text-white text-lg font-semibold mb-6 flex items-center gap-2">
        Tendencia de Temperatura
      </h3>
      {/* Explicit style added to wrapper div to fix ResponsiveContainer warning */}
      <div style={{ width: '100%', height: '300px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{
              top: 10,
              right: 10,
              left: -20,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient id="colorMax" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fca5a5" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#fca5a5" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorMin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#93c5fd" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
            <XAxis 
                dataKey="name" 
                stroke="rgba(255,255,255,0.5)" 
                tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
            />
            <YAxis 
                stroke="rgba(255,255,255,0.5)"
                tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
            />
            <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: 'white' }}
                itemStyle={{ color: '#e2e8f0' }}
            />
            <Area 
                type="monotone" 
                dataKey="max" 
                stroke="#fca5a5" 
                fillOpacity={1} 
                fill="url(#colorMax)" 
                name="Máxima Media"
            />
            <Area 
                type="monotone" 
                dataKey="min" 
                stroke="#93c5fd" 
                fillOpacity={1} 
                fill="url(#colorMin)" 
                name="Mínima Media"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TemperatureChart;