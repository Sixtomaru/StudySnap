import React, { useEffect, useState } from 'react';
import { DialogLine, DialogChoice } from '../types';

interface StoryOverlayProps {
    lines: DialogLine[];
    choice?: { question: string; options: DialogChoice[] };
    onComplete: (choiceEffect?: 'empathy' | 'efficiency') => void;
    backgroundClass: string;
}

const StoryOverlay: React.FC<StoryOverlayProps> = ({ lines, choice, onComplete, backgroundClass }) => {
    const [lineIdx, setLineIdx] = useState(0);
    const [displayedText, setDisplayedText] = useState('');
    const [charIndex, setCharIndex] = useState(0);
    const [showChoice, setShowChoice] = useState(false);

    const currentLine = lines[lineIdx];

    // Reset when lines change
    useEffect(() => {
        setLineIdx(0);
        setDisplayedText('');
        setCharIndex(0);
        setShowChoice(false);
    }, [lines]);

    // Typewriter effect
    useEffect(() => {
        if (!currentLine) return;

        if (charIndex < currentLine.text.length) {
            const timeout = setTimeout(() => {
                setDisplayedText(prev => prev + currentLine.text[charIndex]);
                setCharIndex(prev => prev + 1);
            }, 25);
            return () => clearTimeout(timeout);
        } else {
            // Text finished
            if (lineIdx === lines.length - 1 && choice) {
                setShowChoice(true);
            }
        }
    }, [charIndex, currentLine, lineIdx, lines.length, choice]);

    const handleNext = () => {
        if (showChoice) return; // Must choose
        if (!currentLine) return;

        if (charIndex < currentLine.text.length) {
            // Instant finish
            setDisplayedText(currentLine.text);
            setCharIndex(currentLine.text.length);
        } else {
            // Next line
            if (lineIdx < lines.length - 1) {
                setLineIdx(prev => prev + 1);
                setDisplayedText('');
                setCharIndex(0);
            } else {
                if (!choice) {
                    onComplete();
                }
            }
        }
    };

    const handleChoiceSelection = (effect: 'empathy' | 'efficiency') => {
        onComplete(effect);
    };

    if (!currentLine) return null;

    // Determine avatar/color based on speaker
    const getSpeakerStyle = (speaker: string) => {
        switch(speaker) {
            case 'Bit': return { color: 'text-blue-400', bg: 'bg-blue-900/50', avatar: '🤖' };
            case 'Boss': return { color: 'text-red-400', bg: 'bg-red-900/50', avatar: '⚠️' };
            case 'System': return { color: 'text-green-400', bg: 'bg-green-900/50', avatar: '📟' };
            case 'Unknown': return { color: 'text-purple-400', bg: 'bg-purple-900/50', avatar: '?' };
            default: return { color: 'text-slate-300', bg: 'bg-slate-800/50', avatar: '📄' };
        }
    };

    const style = getSpeakerStyle(currentLine.speaker);

    return (
        <div 
            className={`absolute inset-0 z-50 flex flex-col items-center justify-end pb-8 md:pb-16 transition-all duration-1000 ${backgroundClass}`}
        >
            {/* Background Overlay to darken slightly for text readability */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={handleNext}></div>

            {/* Character Standing Art (Simplified as Emoji) */}
            <div className="absolute top-1/4 animate-float-slow opacity-80 filter drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                 <span className="text-[10rem] md:text-[14rem]">{style.avatar}</span>
            </div>

            {/* Dialog Box */}
            <div className="relative w-full max-w-3xl px-4 z-10">
                <div 
                    className="bg-slate-900/95 border border-slate-600 rounded-2xl p-6 md:p-8 shadow-2xl min-h-[180px] flex flex-col"
                    onClick={handleNext}
                >
                    <div className="flex items-center gap-3 mb-4 border-b border-slate-700 pb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border border-white/20 ${style.bg}`}>
                            {style.avatar}
                        </div>
                        <span className={`font-bold uppercase tracking-widest ${style.color}`}>
                            {currentLine.speaker}
                        </span>
                    </div>

                    <p className="text-lg md:text-xl text-slate-100 font-medium leading-relaxed font-sans">
                        {displayedText}
                        {charIndex < currentLine.text.length && <span className="animate-pulse">_</span>}
                    </p>

                    {!showChoice && charIndex === currentLine.text.length && (
                         <div className="mt-auto self-end text-xs text-slate-500 animate-bounce pt-4">
                            ▼ Clic para continuar
                        </div>
                    )}
                </div>

                {/* Choices */}
                {showChoice && (
                    <div className="absolute bottom-full mb-4 left-0 w-full px-4 flex flex-col gap-3 animate-in slide-in-from-bottom-5 fade-in">
                        <div className="bg-black/80 text-white text-center py-2 rounded-lg backdrop-blur mb-2 border border-slate-600">
                            {choice?.question}
                        </div>
                        <div className="flex flex-col md:flex-row gap-4 justify-center">
                            {choice?.options.map((opt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleChoiceSelection(opt.effect)}
                                    className="bg-slate-800 hover:bg-indigo-600 border-2 border-slate-600 hover:border-indigo-400 text-white py-4 px-6 rounded-xl font-bold transition-all transform hover:scale-105 shadow-xl text-left md:text-center"
                                >
                                    {opt.text}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            
            <style>{`
                @keyframes float-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-20px); }
                }
                .animate-float-slow { animation: float-slow 6s ease-in-out infinite; }
            `}</style>
        </div>
    );
};

export default StoryOverlay;