import React from 'react';
import { Boss } from '../types';
import { Play, Trophy, Book, Skull } from 'lucide-react';
import { soundManager } from '../utils/sound';
import { MONSTER_DB } from '../constants';

interface MainMenuProps {
    onStartArcade: () => void;
    onOpenGallery: () => void;
    collectionSize: number;
    onStartFinalBoss: () => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStartArcade, onOpenGallery, collectionSize, onStartFinalBoss }) => {
    // Check if player has all regular monsters (DB length minus the secret boss if it's in there, 
    // but secret boss is not in main DB usually or checked differently)
    // Assuming MONSTER_DB contains the 30 base monsters.
    const isComplete = collectionSize >= MONSTER_DB.length;

    return (
        <div className="absolute inset-0 z-50 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black flex flex-col items-center justify-center p-6 text-center overflow-hidden">
            {/* Rich Background elements */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 animate-pulse"></div>
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/30 rounded-full blur-[100px] animate-blob"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/30 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px]"></div>

            <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-orange-400 to-red-500 mb-12 filter drop-shadow-[0_0_20px_rgba(234,179,8,0.5)] leading-tight relative z-10">
                MONSTEMOJIS<br/>SHUFFLERIANOS
            </h1>

            <div className="flex flex-col gap-4 w-full max-w-xs relative z-10">
                <button 
                    onClick={() => { soundManager.playButton(); onStartArcade(); }}
                    className="w-full bg-white/95 hover:bg-white text-slate-900 font-black text-xl py-4 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.5)] active:scale-95 transition-all flex items-center justify-center gap-3 group border border-white/50 backdrop-blur"
                >
                    <div className="bg-gradient-to-br from-red-500 to-pink-600 text-white p-2 rounded-full group-hover:rotate-12 transition-transform shadow-lg">
                        <Play fill="currentColor" size={24} />
                    </div>
                    MODO MARATÓN
                </button>
                
                {isComplete && (
                    <button 
                        onClick={() => { soundManager.playButton(); onStartFinalBoss(); }}
                        className="w-full bg-red-950/80 hover:bg-red-900 text-red-100 font-black text-xl py-4 rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.3)] hover:shadow-[0_0_50px_rgba(220,38,38,0.6)] active:scale-95 transition-all flex items-center justify-center gap-3 border border-red-500/50 animate-pulse"
                    >
                        <Skull size={24} className="text-red-500" />
                        DESAFÍO FINAL
                    </button>
                )}

                <button 
                    onClick={() => { soundManager.playButton(); onOpenGallery(); }}
                    className="w-full bg-slate-800/80 hover:bg-slate-800 text-white font-bold text-lg py-4 rounded-2xl shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 border border-slate-600 backdrop-blur-sm"
                >
                    <Book size={24} className="text-indigo-400" />
                    MONSTEMOJIS ({collectionSize}/{MONSTER_DB.length})
                </button>
            </div>
            
            <p className="absolute bottom-8 text-xs text-indigo-200/60 font-bold tracking-[0.5em] uppercase animate-pulse">
                ¡Atrápalos a todos!
            </p>
        </div>
    );
};

export default MainMenu;