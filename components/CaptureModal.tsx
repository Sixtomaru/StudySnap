import React, { useEffect, useState } from 'react';
import { Boss } from '../types';
import { TYPE_VIVID } from '../constants';
import { soundManager } from '../utils/sound';

interface CaptureModalProps {
    boss: Boss;
    chance: number;
    onCaptureEnd: (caught: boolean) => void;
}

const CaptureModal: React.FC<CaptureModalProps> = ({ boss, chance, onCaptureEnd }) => {
    const [imgError, setImgError] = useState(false);
    // Phases: 
    // idle: waiting for interaction
    // scanning: beam is active, LEDs lighting up
    // absorbing: success! monster shrinks into device
    // result: show "ATRAPADO" or flee
    const [phase, setPhase] = useState<'idle' | 'scanning' | 'absorbing' | 'result'>('idle');
    const [ledsLit, setLedsLit] = useState(0);
    const [caught, setCaught] = useState(false);
    
    // Dynamic multicolored background
    const baseColor = TYPE_VIVID[boss.type] || 'bg-slate-900';
    
    const handleActivate = () => {
        if (phase === 'idle') {
            soundManager.playBeam(); // Use beam sound
            setPhase('scanning');
        }
    };

    // Logic Sequence
    useEffect(() => {
        if (phase === 'scanning') {
            const roll = Math.random() * 100;
            const isSuccess = roll <= chance;
            
            // Logic: Max 3 steps (LEDs).
            // If fail, it stops at 0, 1 or 2. If success, goes to 3.
            const maxLeds = isSuccess ? 3 : Math.floor(Math.random() * 3);
            
            let currentLed = 0;
            
            // Initial delay before first check
            const startDelay = setTimeout(() => {
                const interval = setInterval(() => {
                    if (currentLed < maxLeds) {
                        currentLed++;
                        setLedsLit(currentLed);
                        soundManager.playButton(); // Bip sound for LED
                    } else {
                        clearInterval(interval);
                        // Finished scanning
                        if (isSuccess && currentLed === 3) {
                            setCaught(true);
                            setPhase('absorbing');
                            soundManager.playCaptureSuccess();
                            // Wait for absorption anim then show text
                            setTimeout(() => setPhase('result'), 1500);
                            // End modal
                            setTimeout(() => onCaptureEnd(true), 3500); 
                        } else {
                            setCaught(false);
                            setPhase('result'); // Boss flees
                            soundManager.playLose();
                            setTimeout(() => onCaptureEnd(false), 3500); // Increased time to see the sad text
                        }
                    }
                }, 800); // Time between LEDs
                return () => clearInterval(interval);
            }, 500);

            return () => clearTimeout(startDelay);
        }
    }, [phase, chance, onCaptureEnd]);

    return (
        <div className={`absolute inset-0 z-50 flex flex-col items-center justify-end py-10 overflow-hidden transition-all duration-1000`}>
            {/* Background Layers */}
            <div className={`absolute inset-0 ${baseColor} transition-colors duration-1000`}></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/50 via-transparent to-yellow-500/30 mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 to-black/60"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>

            {/* Content Container */}
            <div className="relative w-full h-full flex flex-col items-center justify-between pointer-events-none">
                
                {/* 1. BOSS AREA (Top/Center) */}
                <div className={`
                    relative flex-1 w-full flex items-center justify-center transition-all duration-1000 ease-in-out
                    ${phase === 'absorbing' ? 'translate-y-[20rem] scale-0 opacity-0' : 'translate-y-0 scale-100'}
                `}>
                    {/* The Boss */}
                    {phase !== 'result' && (
                         <div className={`
                            w-48 h-48 transition-all duration-500 filter drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] flex items-center justify-center 
                            ${phase === 'idle' ? 'animate-bounce' : ''}
                            ${phase === 'scanning' ? 'animate-scan-tremble' : ''}
                            ${phase === 'absorbing' ? 'animate-struggle' : ''}
                         `}>
                             {boss.image && !imgError ? (
                                <img 
                                    src={boss.image} 
                                    alt={boss.emoji} 
                                    className="w-full h-full object-contain" 
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <span className="text-9xl">{boss.emoji}</span>
                            )}
                         </div>
                    )}

                    {/* Fleeing Animation (Fail) */}
                    {phase === 'result' && !caught && (
                        <div className="absolute text-8xl animate-flee flex items-center justify-center w-32 h-32">
                             {boss.image && !imgError ? (
                                <img src={boss.image} alt={boss.emoji} className="w-full h-full object-contain" />
                            ) : (
                                <span className="text-9xl">{boss.emoji}</span>
                            )}
                        </div>
                    )}
                </div>

                {/* 2. THE BEAM (Connecting Device to Boss) - ELECTRIC EFFECT - INFINITE HEIGHT */}
                {/* UPDATED: Only show beam during active scanning or absorbing. Stops immediately on result/fail. */}
                {(phase === 'scanning' || phase === 'absorbing') && (
                    <div className="absolute bottom-40 left-1/2 transform -translate-x-1/2 w-16 md:w-32 h-[150vh] z-20 origin-bottom pointer-events-none">
                        {/* Core Beam */}
                        <div className="w-full h-full bg-gradient-to-t from-indigo-400 via-cyan-300 to-transparent opacity-60 animate-beam-pulse blur-xl"></div>
                        
                        {/* Energy Flow (Waves) */}
                        <div className="absolute inset-0 w-full h-full bg-[linear-gradient(to_top,transparent_0%,rgba(255,255,255,0.5)_50%,transparent_100%)] bg-[length:100%_50%] animate-energy-flow opacity-80 mix-blend-overlay"></div>
                        
                        {/* Electric Strands (No Radar) */}
                        <div className="absolute inset-0 border-x-4 border-cyan-200/60 blur-[1px] animate-electric-1"></div>
                        <div className="absolute inset-x-2 inset-y-0 border-x-2 border-white/80 blur-[2px] animate-electric-2"></div>
                        <div className="absolute inset-0 bg-white/10 animate-pulse-fast"></div>
                    </div>
                )}
                
                {/* 3. "¡ATRAPADO!" TEXT (Success) - PROPERLY CENTERED */}
                {phase === 'result' && caught && (
                    <div className="absolute top-1/3 inset-x-0 z-[60] flex items-center justify-center pointer-events-none">
                        <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-[0_5px_0_#fff] animate-zoom-stamp text-center tracking-tighter w-full">
                            ¡ATRAPADO!
                        </h1>
                    </div>
                )}

                {/* 4. "¡ESCAPÓ!" TEXT (Fail) - DROOPING SAD ANIMATION */}
                {phase === 'result' && !caught && (
                    <div className="absolute top-1/3 inset-x-0 z-[60] flex items-center justify-center pointer-events-none">
                        <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-slate-300 to-slate-500 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] animate-droop text-center tracking-tighter w-full transform origin-top-left">
                            ¡ESCAPÓ!
                        </h1>
                    </div>
                )}

                {/* 5. THE DEVICE (Pokedex Style - Bottom) */}
                <div className="relative z-30 mb-8 pointer-events-auto">
                    
                    {/* Prompt Text */}
                    {phase === 'idle' && (
                         <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-white animate-pulse text-sm font-bold uppercase tracking-[0.2em] drop-shadow-md text-center whitespace-nowrap">
                             TOCA PARA CAPTURAR
                         </div>
                    )}

                    {/* Main Body */}
                    <button 
                        onClick={handleActivate}
                        disabled={phase !== 'idle'}
                        className={`
                            w-64 h-40 bg-red-600 rounded-t-3xl rounded-b-xl border-4 border-red-800 shadow-[0_20px_50px_rgba(0,0,0,0.6)] 
                            flex flex-col items-center justify-start pt-4 relative overflow-hidden transition-transform
                            ${phase === 'idle' ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}
                        `}
                    >
                        {/* Glass Reflection */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                        {/* LEDs Container */}
                        <div className="flex gap-4 mb-4 bg-red-900/50 p-2 rounded-full border border-red-950 shadow-inner">
                            {[1, 2, 3].map((ledNum) => (
                                <div 
                                    key={ledNum}
                                    className={`
                                        w-6 h-6 rounded-full border-2 border-slate-900 shadow-md transition-all duration-300
                                        ${ledsLit >= ledNum 
                                            ? (caught 
                                                ? 'bg-green-500 shadow-[0_0_20px_green]' // All Green if caught
                                                : 'bg-yellow-400 shadow-[0_0_15px_yellow]' // All Yellow while scanning
                                              )
                                            : 'bg-slate-700'
                                        }
                                    `}
                                ></div>
                            ))}
                        </div>

                        {/* Screen / Lens */}
                        <div className={`
                            w-32 h-16 bg-slate-900 rounded-lg border-2 border-slate-600 shadow-inner flex items-center justify-center relative overflow-hidden
                            ${phase === 'scanning' || phase === 'absorbing' ? 'bg-indigo-950' : ''}
                        `}>
                            {/* Grid/Scanlines Background */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.1)_1px,transparent_1px)] bg-[size:10px_10px] opacity-30"></div>
                            
                            {/* Lens Animation Overlay */}
                            {(phase === 'scanning' || phase === 'absorbing') && (
                                <div className="absolute inset-0 bg-indigo-500/10 animate-pulse"></div>
                            )}

                            {/* PERCENTAGE DISPLAY - CENTERED */}
                            <div className="relative z-10 flex flex-col items-center justify-center">
                                <span className="text-[10px] text-slate-500 font-mono uppercase leading-none mb-1">Probabilidad</span>
                                <span className="text-2xl font-black font-mono text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">
                                    {Math.floor(chance)}%
                                </span>
                            </div>
                        </div>

                        {/* Bottom Grill */}
                        <div className="mt-auto mb-2 flex gap-2">
                             <div className="w-16 h-2 bg-red-800 rounded-full"></div>
                             <div className="w-4 h-2 bg-red-800 rounded-full"></div>
                        </div>
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes beam-pulse {
                    0%, 100% { opacity: 0.8; height: 150vh; }
                    50% { opacity: 0.6; height: 155vh; }
                }
                .animate-beam-pulse {
                    animation: beam-pulse 0.2s infinite;
                }
                
                @keyframes electric-1 {
                    0%, 100% { transform: scaleX(1) translateX(0); opacity: 0.4; }
                    25% { transform: scaleX(1.2) translateX(-2px); opacity: 0.8; }
                    75% { transform: scaleX(0.9) translateX(2px); opacity: 0.6; }
                }
                .animate-electric-1 {
                    animation: electric-1 0.1s linear infinite;
                }

                @keyframes electric-2 {
                    0%, 100% { transform: scaleX(1); opacity: 0.3; }
                    50% { transform: scaleX(1.5); opacity: 0.7; }
                }
                .animate-electric-2 {
                    animation: electric-2 0.15s linear infinite reverse;
                }
                
                @keyframes energy-flow {
                    0% { background-position: 0% 100%; }
                    100% { background-position: 0% 0%; }
                }
                .animate-energy-flow {
                    animation: energy-flow 1s linear infinite;
                }

                @keyframes zoom-stamp {
                    0% { transform: scale(0) rotate(-10deg); opacity: 0; }
                    70% { transform: scale(1.2) rotate(5deg); opacity: 1; }
                    100% { transform: scale(1) rotate(0deg); opacity: 1; }
                }
                .animate-zoom-stamp {
                    animation: zoom-stamp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
                
                /* SIMPLIFIED DROOP ANIMATION - REDUCED TILT */
                @keyframes droop {
                    0% { transform: rotate(0deg) scale(0.8); opacity: 0; }
                    20% { transform: rotate(0deg) scale(1); opacity: 1; }
                    40% { transform: rotate(0deg); } /* Hold steady */
                    100% { transform: rotate(10deg) translateY(20px); opacity: 1; } /* Reduced drop and tilt by half */
                }
                .animate-droop {
                    animation: droop 1.5s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards;
                }

                @keyframes shake-device {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-2px); }
                    75% { transform: translateX(2px); }
                }
                .animate-shake-device {
                    animation: shake-device 0.1s linear infinite;
                }

                @keyframes scan-tremble {
                    0%, 100% { opacity: 1; transform: translateX(0); }
                    25% { opacity: 0.6; transform: translateX(-2px); }
                    50% { opacity: 1; transform: translateX(0); }
                    75% { opacity: 0.6; transform: translateX(2px); }
                }
                .animate-scan-tremble {
                    animation: scan-tremble 0.1s linear infinite;
                }

                @keyframes struggle {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(-10deg) translateX(-5px); }
                    50% { transform: rotate(5deg) translateX(5px); }
                    75% { transform: rotate(-5deg) translateX(-5px); }
                }
                .animate-struggle {
                    animation: struggle 0.2s ease-in-out infinite;
                }

                @keyframes flee {
                    0% { transform: scale(1) translateX(0); opacity: 1; filter: blur(0); }
                    30% { transform: scale(1.1) translateX(-20px) skewX(-10deg); }
                    100% { transform: scale(0.5) translateX(300px) skewX(20deg); opacity: 0; filter: blur(4px); }
                }
                .animate-flee {
                    animation: flee 0.8s cubic-bezier(0.55, 0.055, 0.675, 0.19) forwards;
                }
                
                .animate-pulse-fast {
                    animation: pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}</style>
        </div>
    );
};

export default CaptureModal;