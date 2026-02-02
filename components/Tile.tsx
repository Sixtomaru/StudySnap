import React, { useState } from 'react';
import { TileData } from '../types';
import { TYPE_PASTELS } from '../constants';
import { motion } from 'framer-motion';

interface TileProps {
  tile: TileData;
  isSelected: boolean;
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
}

const Tile: React.FC<TileProps> = React.memo(({ tile, isSelected, isDragging, onPointerDown }) => {
  const [imgError, setImgError] = useState(false);
  
  const isRock = tile.status === 'rock';
  const isSteel = tile.status === 'steel';
  const isFrozen = tile.status === 'ice';
  
  // Disable interaction for Rock, Steel, and Frozen tiles
  const isInteractive = !isRock && !isSteel && !isFrozen; 

  // Normal tiles get type-based color, Frozen tiles preserve type color but lighter/blue-tinted via overlay
  const typeStyle = !isRock && !isSteel ? (TYPE_PASTELS[tile.type] || 'bg-slate-700') : '';

  // Configuración del "Motor de Física" - Gravedad Independiente por Columna
  // REDUCED STIFFNESS AGAIN to ~50 for even slower/floatier fall
  const springConfig = {
    type: "spring" as const,
    stiffness: 50 + (tile.x % 3) * 10, // Reduced from 70+
    damping: 15 + (tile.x % 2) * 2,    
    mass: 1       
  };

  return (
    <motion.div
      onPointerDown={(e) => isInteractive && onPointerDown(e, tile.id)}
      
      // Initial state
      initial={tile.id.startsWith('spawn') ? { 
          x: `${tile.x * 100}%`, 
          y: '-150%', 
          opacity: 0 
      } : false}
      
      // The Physics Target
      animate={{
        x: `${tile.x * 100}%`,
        y: `${tile.y * 100}%`,
        scale: tile.isMatched ? 0 : (isSelected ? 1.1 : 1),
        opacity: isDragging ? 0 : (tile.isMatched ? 0 : 1),
        rotate: tile.isMatched ? 180 : 0, 
        filter: tile.isMatched ? 'brightness(2)' : 'brightness(1)',
      }}
      
      transition={springConfig}

      style={{
        width: '16.666%', 
        height: '16.666%',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: isDragging ? 100 : (tile.isMatched ? 50 : 10),
      }}
      
      draggable={false}
      className={`
        p-1 touch-none select-none will-change-transform
        ${!isInteractive ? 'cursor-not-allowed' : ''}
      `}
    >
      <div
        className={`
          w-full h-full flex items-center justify-center 
          text-3xl sm:text-4xl md:text-5xl 
          rounded-xl border-[3px] relative overflow-hidden
          ${isInteractive ? 'cursor-grab active:cursor-grabbing' : ''}
          ${isSelected 
            ? 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)]' 
            : 'hover:brightness-110 shadow-sm'
          }
          ${isRock ? 'bg-stone-700 border-stone-500 shadow-inner' : 
            isSteel ? 'bg-slate-800 border-slate-400 shadow-inner' : 
            typeStyle}
        `}
      >
        {isRock ? (
             <div className="relative w-full h-full flex items-center justify-center">
                 <span className="text-4xl filter grayscale contrast-125">🪨</span>
             </div>
        ) : isSteel ? (
             <div className="flex flex-col items-center justify-center w-full h-full bg-slate-800 relative">
                 <div className="absolute inset-0 border-4 border-slate-500 opacity-50 rounded-xl"></div>
                 <div className="w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center border border-slate-500 z-10">
                    <span className="text-[10px] font-bold text-white">{tile.statusLife}</span>
                 </div>
                 <span className="absolute text-2xl opacity-50">🛡️</span>
             </div>
        ) : (
             <>
                {/* Regular Monster Visual */}
                <div className={`relative z-10 w-full h-full flex items-center justify-center ${isFrozen ? 'opacity-80' : ''}`}>
                    {tile.image && !imgError ? (
                        <img 
                            src={tile.image} 
                            alt={tile.emoji} 
                            className="w-full h-full object-contain p-0.5 select-none" 
                            draggable={false}
                            onDragStart={(e) => e.preventDefault()} 
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <span className="select-none">{tile.emoji}</span>
                    )}
                </div>

                {/* Ice Frame Overlay - Transparent center to see monster */}
                {isFrozen && (
                    <>
                        <div className="absolute inset-0 z-20 pointer-events-none rounded-xl border-[4px] border-cyan-300/90 shadow-[inset_0_0_15px_rgba(34,211,238,0.6)] bg-blue-400/20 backdrop-brightness-110">
                             <div className="absolute top-0 right-0 p-0.5 bg-cyan-200/90 rounded-bl-lg text-[10px] shadow-sm">❄️</div>
                        </div>
                        {/* Frost Texture overlay */}
                        <div className="absolute inset-0 z-10 bg-gradient-to-tr from-white/30 via-transparent to-transparent pointer-events-none"></div>
                    </>
                )}
             </>
        )}
      </div>
    </motion.div>
  );
});

export default Tile;