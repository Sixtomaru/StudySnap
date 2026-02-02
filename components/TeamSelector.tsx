import React, { useState, useRef, useMemo } from 'react';
import { Boss, ElementType } from '../types';
import { ChevronRight, ChevronLeft, ArrowLeft } from 'lucide-react';
import { soundManager } from '../utils/sound';
import { getLevelBackground, TYPE_PASTELS, TYPE_ICONS } from '../constants';

interface TeamSelectorProps {
    collection: Boss[];
    currentTeam: Boss[];
    onUpdateTeam: (newTeam: Boss[]) => void;
    onStart: () => void;
    nextLevel: number;
    nextEnemy: Boss;
    movesLeft: number; 
    onBackToMenu: () => void;
}

const ITEMS_PER_PAGE = 12; // 3 rows * 4 columns

const TeamSelector: React.FC<TeamSelectorProps> = ({ collection, currentTeam, onUpdateTeam, onStart, nextLevel, nextEnemy, movesLeft, onBackToMenu }) => {
    // Modal State for Long Press
    const [detailModalMonster, setDetailModalMonster] = useState<Boss | null>(null);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
    const [currentPage, setCurrentPage] = useState(0);
    
    // Custom Touch Drag State
    const [dragMonster, setDragMonster] = useState<Boss | null>(null);
    const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
    
    const isTeamValid = currentTeam.length === 4;

    const handleImageError = (id: string) => {
        setImgErrors(prev => ({ ...prev, [id]: true }));
    };

    // Sort Collection by Type Alphabetically
    const sortedCollection = useMemo(() => {
        return [...collection].sort((a, b) => a.type.localeCompare(b.type));
    }, [collection]);

    const totalPages = Math.ceil(sortedCollection.length / ITEMS_PER_PAGE);
    const currentMonsters = sortedCollection.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

    // --- NAVIGATION ---
    const nextPage = () => {
        if (currentPage < totalPages - 1) {
            setCurrentPage(p => p + 1);
            soundManager.playButton();
        }
    };

    const prevPage = () => {
        if (currentPage > 0) {
            setCurrentPage(p => p - 1);
            soundManager.playButton();
        }
    };

    // --- DESKTOP DND HANDLERS ---
    const handleDragStart = (e: React.DragEvent, monster: Boss) => {
        e.dataTransfer.setData('monsterId', monster.id);
        // Clear long press if dragging starts
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };

    const handleDrop = (e: React.DragEvent, slotIndex: number) => {
        e.preventDefault();
        const monsterId = e.dataTransfer.getData('monsterId');
        if (monsterId) {
             const monster = collection.find(m => m.id === monsterId);
             if (monster) equipMonster(monster, slotIndex);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    // --- TOUCH & LONG PRESS HANDLERS ---
    const handlePointerDown = (e: React.PointerEvent | React.TouchEvent, monster: Boss) => {
        // Start Long Press Timer (Changed to 200ms)
        longPressTimer.current = setTimeout(() => {
            setDetailModalMonster(monster);
            soundManager.playButton();
        }, 200);

        if ('touches' in e) {
            const touch = e.touches[0];
            setDragMonster(monster);
            setDragPos({ x: touch.clientX, y: touch.clientY });
        }
    };

    const handlePointerUp = () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        setDetailModalMonster(null); // Close modal on release
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        // If moved, cancel long press
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }

        if (dragMonster) {
            if (e.cancelable) e.preventDefault(); 
            const touch = e.touches[0];
            setDragPos({ x: touch.clientX, y: touch.clientY });
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        handlePointerUp(); // Handle modal close
        
        if (dragMonster) {
            const touch = e.changedTouches[0];
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            
            const slotElement = target?.closest('[data-slot-index]');
            if (slotElement) {
                const index = parseInt(slotElement.getAttribute('data-slot-index') || '-1');
                if (index >= 0) {
                    equipMonster(dragMonster, index);
                    soundManager.playSwap();
                }
            }
            setDragMonster(null);
        }
    };

    const equipMonster = (monster: Boss, slotIndex: number) => {
        const newTeam = [...currentTeam];
        const existingIdx = newTeam.findIndex(m => m.id === monster.id);
        if (existingIdx >= 0) {
             newTeam[existingIdx] = newTeam[slotIndex]; 
        }
        
        const slots = [0,1,2,3].map(i => currentTeam[i] || null);
        slots[slotIndex] = monster;
        
        const uniqueTeam: Boss[] = [];
        const seen = new Set();
        slots.forEach(m => {
            if (m && !seen.has(m.id)) {
                uniqueTeam.push(m);
                seen.add(m.id);
            }
        });
        onUpdateTeam(uniqueTeam);
    };

    return (
        <div className={`absolute inset-0 z-50 flex flex-col items-center pt-8 pb-4 px-4 overflow-hidden transition-all duration-1000 ${getLevelBackground(nextLevel, nextEnemy.type)}`}>
            {/* Lighter overlay */}
            <div className="absolute inset-0 bg-slate-900/40 pointer-events-none"></div>

            {/* BACK TO MENU BUTTON */}
            <button 
                onClick={() => { soundManager.playButton(); onBackToMenu(); }} 
                className="absolute top-4 left-4 z-50 p-3 bg-slate-800/80 rounded-full border border-slate-600 text-slate-300 hover:bg-red-900/80 hover:text-white hover:border-red-500 shadow-lg backdrop-blur-sm transition-all active:scale-95"
            >
                <ArrowLeft size={20} />
            </button>

            <div className="relative z-10 w-full flex flex-col items-center flex-1 overflow-hidden max-w-xl mx-auto">
                <h1 className="text-3xl font-black text-white italic mb-2 uppercase tracking-widest drop-shadow-md">
                    Fase {nextLevel}
                </h1>
                
                {/* VS Panel */}
                <div className="w-full bg-slate-800/90 backdrop-blur-md rounded-2xl p-4 border border-slate-600 flex items-center gap-4 mb-2 shadow-xl">
                    <div className="flex-1 text-right">
                        <span className="text-xs text-red-400 font-bold uppercase block">Enemigo</span>
                        <span className="text-xl font-bold text-white">{nextEnemy.name}</span>
                        <span className="text-xs text-slate-400 block">HP: {nextEnemy.maxHp}</span>
                    </div>
                    <div className="w-16 h-16 flex items-center justify-center filter drop-shadow-lg animate-bounce">
                        {nextEnemy.image && !imgErrors[nextEnemy.id] ? (
                            <img 
                                src={nextEnemy.image} 
                                alt={nextEnemy.emoji} 
                                className="w-full h-full object-contain" 
                                onError={() => handleImageError(nextEnemy.id)}
                            />
                        ) : (
                            <span className="text-5xl">{nextEnemy.emoji}</span>
                        )}
                    </div>
                    <div className="flex-1">
                         <span className="bg-slate-900 text-sm px-3 py-1.5 rounded-full text-slate-300 border border-slate-700 font-bold uppercase flex items-center gap-2 w-fit">
                            Tipo: <span className="text-xl">{TYPE_ICONS[nextEnemy.type]}</span>
                        </span>
                    </div>
                </div>

                {/* Moves Info - REDUCED MARGIN BOTTOM */}
                <div className="mb-2 bg-black/40 px-4 py-1.5 rounded-full text-xs text-slate-300 font-mono border border-white/10 shadow-lg">
                    TURNOS DISPONIBLES: <span className="text-white font-bold text-base ml-1">{movesLeft}</span>
                </div>

                {/* Active Team Slots */}
                <div className="w-full mb-4">
                    <span className="text-sm font-bold text-white uppercase drop-shadow block mb-2 text-center">Tu Equipo</span>
                    <div className="flex gap-2 h-24">
                        {[0, 1, 2, 3].map(idx => {
                            const member = currentTeam[idx];
                            return (
                                <div 
                                    key={idx} 
                                    data-slot-index={idx}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, idx)}
                                    className="flex-1 bg-slate-800/80 backdrop-blur-sm rounded-xl border-2 border-dashed border-slate-600 flex items-center justify-center relative group transition-all hover:border-indigo-400 shadow-inner"
                                >
                                    {member ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-indigo-900/40 rounded-xl">
                                            <div className="w-10 h-10 mb-1 flex items-center justify-center filter drop-shadow-md">
                                                {member.image && !imgErrors[member.id] ? (
                                                    <img 
                                                        src={member.image} 
                                                        alt={member.emoji} 
                                                        className="w-full h-full object-contain" 
                                                        onError={() => handleImageError(member.id)}
                                                    />
                                                ) : (
                                                    <span className="text-3xl">{member.emoji}</span>
                                                )}
                                            </div>
                                            <div className="text-[10px] font-bold text-indigo-200 truncate w-full text-center px-1">{member.name}</div>
                                            <div className="absolute -top-1 -right-1 flex items-center justify-center text-lg pointer-events-none filter drop-shadow-md">
                                                {TYPE_ICONS[member.type]}
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-slate-500 font-bold text-xs opacity-50">VACÍO</span>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Collection - Grid with Pages */}
                <div className="flex-1 w-full bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 relative flex flex-col shadow-2xl mb-4 overflow-hidden">
                    <div className="flex items-center justify-center py-2 bg-black/20">
                        <span className="text-xs text-white font-bold uppercase tracking-widest text-shadow">MONSTEMOJIS DISPONIBLES</span>
                        <span className="text-[10px] text-slate-300 ml-2">({currentPage + 1}/{totalPages || 1})</span>
                    </div>
                    
                    {/* Navigation Arrows */}
                    <button 
                        onClick={prevPage}
                        disabled={currentPage === 0}
                        className={`absolute left-0 top-10 bottom-2 w-10 z-30 rounded-r-xl border-y border-r border-white/20 transition-all flex items-center justify-center ${currentPage === 0 ? 'bg-black/20 text-slate-500 cursor-not-allowed' : 'bg-black/40 hover:bg-black/60 active:bg-indigo-600 text-white'}`}
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <button 
                        onClick={nextPage}
                        disabled={currentPage >= totalPages - 1}
                        className={`absolute right-0 top-10 bottom-2 w-10 z-30 rounded-l-xl border-y border-l border-white/20 transition-all flex items-center justify-center ${currentPage >= totalPages - 1 ? 'bg-black/20 text-slate-500 cursor-not-allowed' : 'bg-black/40 hover:bg-black/60 active:bg-indigo-600 text-white'}`}
                    >
                        <ChevronRight size={24} />
                    </button>

                    {/* GRID DISPLAY */}
                    <div className="flex-1 p-4 px-12 flex items-center justify-center">
                        <div className="grid grid-cols-4 grid-rows-3 gap-2 w-full h-full place-items-center">
                            {currentMonsters.map(monster => {
                                const isSelected = currentTeam.find(m => m.id === monster.id);
                                const bgColor = TYPE_PASTELS[monster.type] || 'bg-slate-800 border-slate-700';
                                
                                return (
                                    <div
                                        key={monster.id}
                                        draggable={true}
                                        onDragStart={(e) => handleDragStart(e, monster)}
                                        
                                        // Touch / Mouse Down for Long Press
                                        onMouseDown={(e) => handlePointerDown(e as any, monster)}
                                        onMouseUp={handlePointerUp}
                                        onMouseLeave={handlePointerUp}

                                        onTouchStart={(e) => handlePointerDown(e, monster)}
                                        onTouchMove={handleTouchMove}
                                        onTouchEnd={handleTouchEnd}
                                        
                                        className={`
                                            w-full aspect-square max-w-[5rem] rounded-xl flex flex-col items-center justify-center border-2 relative cursor-grab active:cursor-grabbing transition-transform select-none flex-shrink-0
                                            ${bgColor}
                                            ${isSelected 
                                                ? 'opacity-40 grayscale scale-95' 
                                                : 'hover:scale-105 shadow-md'
                                            }
                                        `}
                                    >
                                        <div className="w-8 h-8 md:w-10 md:h-10 mb-0.5 flex items-center justify-center filter drop-shadow-sm pointer-events-none">
                                            {monster.image && !imgErrors[monster.id] ? (
                                                <img 
                                                    src={monster.image} 
                                                    alt={monster.emoji} 
                                                    className="w-full h-full object-contain" 
                                                    onError={() => handleImageError(monster.id)}
                                                />
                                            ) : (
                                                <span className="text-2xl md:text-3xl">{monster.emoji}</span>
                                            )}
                                        </div>
                                        <div className="text-[8px] font-bold text-slate-800 truncate w-full text-center bg-white/50 rounded px-1 pointer-events-none mx-1">{monster.name}</div>
                                        {/* Larger Type Icon */}
                                        <div className="absolute -top-1 -right-1 flex items-center justify-center text-lg pointer-events-none filter drop-shadow-md">
                                            {TYPE_ICONS[monster.type]}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Fight Button */}
                <button 
                    onClick={() => { soundManager.playButton(); onStart(); }}
                    disabled={!isTeamValid}
                    className={`
                        w-full max-w-sm py-4 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)] mb-2 border-2 border-white/20
                        ${isTeamValid 
                            ? 'bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white transform hover:scale-105 hover:shadow-[0_0_30px_rgba(34,197,94,0.6)]' 
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed grayscale'
                        }
                    `}
                >
                    ¡A LUCHAR! <ChevronRight size={28} strokeWidth={3} />
                </button>
            </div>

            {/* DETAILS MODAL (LONG PRESS) */}
            {detailModalMonster && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
                    <div className="bg-slate-900/95 p-6 rounded-3xl border-2 border-yellow-500 shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-in zoom-in duration-200 flex flex-col items-center max-w-xs text-center backdrop-blur-xl">
                         <h3 className="text-2xl font-black text-yellow-400 mb-2">{detailModalMonster.skillName}</h3>
                         <p className="text-white font-bold mb-4">{detailModalMonster.skillDescription}</p>
                         <div className="text-xs text-slate-400 italic">Coste: {detailModalMonster.skillCost}</div>
                    </div>
                </div>
            )}

            {/* Mobile Drag Ghost Element */}
            {dragMonster && (
                <div 
                    className="fixed z-[100] flex items-center justify-center pointer-events-none transform -translate-x-1/2 -translate-y-1/2 opacity-70"
                    style={{ left: dragPos.x, top: dragPos.y }}
                >
                     {dragMonster.image && !imgErrors[dragMonster.id] ? (
                        <img src={dragMonster.image} alt={dragMonster.emoji} className="w-24 h-24 object-contain" />
                    ) : (
                        <span className="text-8xl">{dragMonster.emoji}</span>
                    )}
                </div>
            )}

            <style>{`
                .text-shadow {
                    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
                }
            `}</style>
        </div>
    );
};

export default TeamSelector;