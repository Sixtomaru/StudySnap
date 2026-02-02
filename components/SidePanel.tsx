import React from 'react';
import { Boss } from '../types';
import { Zap } from 'lucide-react';

interface LeftPanelProps {
    monsters: Boss[];
    activeId: string;
    onSelect: (id: string) => void;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({ monsters, activeId, onSelect }) => {
    return (
        <div className="h-full bg-slate-950 border-r border-slate-800 p-2 flex flex-col w-20 md:w-64 relative z-20 shadow-2xl">
            <h3 className="hidden md:block text-slate-500 font-bold uppercase text-[10px] mb-2 tracking-widest border-b border-slate-800 pb-2">Base de Datos</h3>
            <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-2 pb-20">
                {monsters.map(m => (
                    <button
                        key={m.id}
                        onClick={() => onSelect(m.id)}
                        className={`
                            flex items-center gap-3 p-2 rounded-lg border transition-all text-left group relative overflow-hidden
                            ${m.id === activeId 
                                ? 'bg-indigo-900/30 border-indigo-500/50' 
                                : 'bg-slate-900 border-slate-800 hover:bg-slate-800'
                            }
                        `}
                    >
                        {m.id === activeId && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>}
                        <div className="w-10 h-10 flex-none bg-slate-950 rounded md:rounded-lg flex items-center justify-center text-xl shadow-inner border border-slate-800 group-hover:scale-110 transition-transform">
                            {m.emoji}
                        </div>
                        <div className="hidden md:block min-w-0">
                            <div className={`font-bold text-sm truncate ${m.id === activeId ? 'text-indigo-300' : 'text-slate-300'}`}>
                                {m.name}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate font-mono">
                                Tipo: {m.type}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

interface RightPanelProps {
    activeMonster: Boss;
    charge: number;
    canUseSkill: boolean;
    onUseSkill: () => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({ activeMonster, charge, canUseSkill, onUseSkill }) => {
    return (
        <div className="h-full bg-slate-950 border-l border-slate-800 flex flex-col w-24 md:w-72 relative z-20 shadow-2xl">
             
             {/* Device Header */}
             <div className="bg-slate-900 p-2 border-b border-slate-800">
                 <div className="flex justify-between items-center">
                    <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">RESONADOR v2.0</span>
                 </div>
             </div>

             <div className="flex-1 flex flex-col items-center p-4 relative overflow-hidden">
                 {/* Background Grid Pattern */}
                 <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>

                 <h3 className="text-center text-indigo-400 font-bold text-xs uppercase tracking-widest mb-6 relative z-10">Unidad Activa</h3>
                 
                 {/* Monster Display */}
                 <div className="relative group cursor-default">
                     <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 rounded-full group-hover:opacity-30 transition-opacity"></div>
                     <div className="w-20 h-20 md:w-40 md:h-40 bg-slate-900 rounded-full border-4 border-slate-800 shadow-2xl flex items-center justify-center text-5xl md:text-8xl mb-4 relative z-10">
                         {activeMonster.emoji}
                     </div>
                 </div>
                 
                 <div className="text-center mb-6 relative z-10">
                     <h2 className="text-lg md:text-2xl font-bold text-white mb-1">{activeMonster.name}</h2>
                     <div className="inline-block bg-slate-800 px-3 py-1 rounded text-[10px] md:text-xs font-mono text-slate-400 border border-slate-700">
                        {activeMonster.skillDescription}
                     </div>
                 </div>

                 {/* Charge Bar & Button */}
                 <div className="mt-auto w-full flex flex-col items-center gap-4 relative z-10 bg-slate-900/50 p-4 rounded-xl border border-slate-800 backdrop-blur-sm">
                    <div className="w-full flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                        <span>Carga</span>
                        <span>{Math.floor(charge)}%</span>
                    </div>
                    
                    <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 shadow-inner">
                         <div 
                            className={`h-full transition-all duration-300 ${charge >= 100 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-indigo-600'}`}
                            style={{ width: `${Math.min(100, charge)}%` }}
                        />
                    </div>

                    <button
                        onClick={onUseSkill}
                        disabled={!canUseSkill}
                        className={`
                            w-full py-4 rounded-xl flex items-center justify-center gap-2 border-t border-b-4 transition-all shadow-lg text-sm md:text-base font-bold tracking-wider
                            ${canUseSkill 
                                ? 'bg-indigo-600 border-indigo-800 hover:bg-indigo-500 hover:border-indigo-700 text-white shadow-indigo-900/50 active:translate-y-1 active:border-b-0 cursor-pointer animate-pulse-slow' 
                                : 'bg-slate-800 border-slate-900 text-slate-600 cursor-not-allowed'
                            }
                        `}
                    >
                        <Zap size={20} fill={canUseSkill ? "currentColor" : "none"} />
                        <span>ACTIVAR</span>
                    </button>
                 </div>
             </div>
        </div>
    );
};