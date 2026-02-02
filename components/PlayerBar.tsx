import React, { useState } from 'react';
import { Boss } from '../types';
import { Zap, Info } from 'lucide-react';

interface PlayerBarProps {
    ownedMonsters: Boss[];
    activeMonsterId: string;
    setActiveMonsterId: (id: string) => void;
    charge: number; // 0 to 100
    onUseSkill: () => void;
    canUseSkill: boolean;
}

const PlayerBar: React.FC<PlayerBarProps> = ({ 
    ownedMonsters, 
    activeMonsterId, 
    setActiveMonsterId, 
    charge, 
    onUseSkill, 
    canUseSkill 
}) => {
    const activeMonster = ownedMonsters.find(m => m.id === activeMonsterId) || ownedMonsters[0];
    const [hoveredMonster, setHoveredMonster] = useState<Boss | null>(null);

    return (
        <div className="w-full max-w-md mt-4 px-4 flex flex-col gap-2">
            
            {/* Tooltip Area - Fixed height to prevent jumping */}
            <div className="h-8 flex items-center justify-center text-xs">
                 {(hoveredMonster || activeMonster) && (
                     <div className="bg-slate-800/80 backdrop-blur px-3 py-1 rounded-full border border-slate-600 text-slate-300 flex gap-2 animate-in fade-in slide-in-from-bottom-2">
                        <span className="text-yellow-400 font-bold">
                            {(hoveredMonster || activeMonster).skillName || "Skill"}:
                        </span>
                        <span>
                            {(hoveredMonster || activeMonster).skillDescription || "No effect"}
                        </span>
                     </div>
                 )}
            </div>

            {/* Main Bar */}
            <div className="bg-slate-800 rounded-2xl p-2 border border-slate-700 shadow-xl flex items-center gap-3 relative overflow-visible">
                
                {/* Scrollable Monster List */}
                <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar pb-1 px-1 mask-linear-fade">
                    {ownedMonsters.map(monster => (
                        <button
                            key={monster.id}
                            onClick={() => setActiveMonsterId(monster.id)}
                            onMouseEnter={() => setHoveredMonster(monster)}
                            onMouseLeave={() => setHoveredMonster(null)}
                            className={`
                                flex-none w-12 h-12 rounded-xl flex items-center justify-center text-2xl border-2 transition-all relative
                                ${activeMonsterId === monster.id 
                                    ? 'bg-slate-700 border-yellow-400 scale-105 shadow-lg shadow-yellow-500/20' 
                                    : 'bg-slate-900 border-slate-700 opacity-60 hover:opacity-100 hover:scale-105'
                                }
                            `}
                        >
                            {monster.emoji}
                            {/* Skill Type Icon Badge */}
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-950 flex items-center justify-center border border-slate-600">
                                {(monster.skillType.includes('damage') || monster.skillType === 'nuke') && <div className="w-2 h-2 bg-red-500 rounded-full" />}
                                {monster.skillType === 'heal_turns' && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                                {(monster.skillType.includes('clear') || monster.skillType === 'convert_type') && <div className="w-2 h-2 bg-green-500 rounded-full" />}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Divider */}
                <div className="w-px h-10 bg-slate-700 flex-none"></div>

                {/* Charge & Action Button */}
                <div className="flex-none flex items-center gap-3">
                    <div className="flex flex-col items-end justify-center w-16">
                         <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Energy</span>
                         <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-600">
                            <div 
                                className={`h-full transition-all duration-300 ${charge >= 100 ? 'bg-yellow-400 animate-pulse' : 'bg-indigo-500'}`}
                                style={{ width: `${Math.min(100, charge)}%` }}
                            />
                        </div>
                    </div>

                    <button
                        onClick={onUseSkill}
                        disabled={!canUseSkill}
                        className={`
                            w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all shadow-lg
                            ${canUseSkill 
                                ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 border-indigo-300 text-white shadow-indigo-500/50 scale-105 active:scale-95 cursor-pointer animate-pulse-slow' 
                                : 'bg-slate-700 border-slate-600 text-slate-500 cursor-not-allowed grayscale'
                            }
                        `}
                    >
                        <Zap size={28} fill={canUseSkill ? "currentColor" : "none"} strokeWidth={canUseSkill ? 0 : 2} />
                    </button>
                </div>
            </div>
            
            <style>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};

export default PlayerBar;