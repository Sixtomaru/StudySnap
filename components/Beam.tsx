import React, { useMemo } from 'react';

interface ProjectileProps {
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    color: string;
    icon?: string;
}

const AttackProjectile: React.FC<ProjectileProps> = ({ startX, startY, targetX, targetY, color }) => {
    
    // Calculate curve parameters
    const midX = (startX + targetX) / 2;
    const midY = (startY + targetY) / 2;
    
    // Random offset for curvature
    // Use useMemo to keep the randomness stable during render life of this component instance
    const curveOffset = useMemo(() => (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 80 + 40), []);
    
    const controlX = midX + curveOffset;
    const controlY = midY; 

    // Determine Shape randomly
    const shapeType = useMemo(() => {
        const types = ['circle', 'square', 'diamond', 'triangle'];
        return types[Math.floor(Math.random() * types.length)];
    }, []);

    const pathString = `path("M ${startX},${startY} Q ${controlX},${controlY} ${targetX},${targetY}")`;

    // Dynamic Shape Styles
    const getShapeStyle = () => {
        const base = {
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}`,
        };

        switch (shapeType) {
            case 'circle':
                return { ...base, borderRadius: '50%' };
            case 'square':
                return { ...base, borderRadius: '4px' };
            case 'diamond':
                return { ...base, borderRadius: '2px', transform: 'rotate(45deg)' }; // Initial rotation
            case 'triangle':
                return { 
                    backgroundColor: 'transparent',
                    boxShadow: 'none',
                    width: 0,
                    height: 0,
                    borderLeft: '15px solid transparent',
                    borderRight: '15px solid transparent',
                    borderBottom: `30px solid ${color}`,
                    filter: `drop-shadow(0 0 5px ${color})`
                };
            default:
                return base;
        }
    };

    return (
        <div 
            className="fixed z-50 pointer-events-none animate-projectile-curve"
            style={{
                width: '30px',
                height: '30px',
                offsetPath: pathString,
                offsetRotate: 'auto', 
            } as React.CSSProperties}
        >
             {/* The Shape Visual */}
             <div 
                className="w-full h-full opacity-60 animate-spin-fast"
                style={getShapeStyle()}
             >
                 {/* Inner light for "Energy" feel (except triangle which handles its own borders) */}
                 {shapeType !== 'triangle' && (
                     <div className="w-full h-full bg-white/30 mix-blend-overlay"></div>
                 )}
             </div>

             <style>{`
                @keyframes move-curve {
                    0% { offset-distance: 0%; transform: scale(0.5); }
                    10% { transform: scale(1.2); }
                    100% { offset-distance: 100%; transform: scale(0.8); }
                }
                .animate-projectile-curve {
                    animation: move-curve 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
                }
                @keyframes spin-fast {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-fast {
                    animation: spin-fast 0.6s linear infinite;
                }
             `}</style>
        </div>
    );
};

export default AttackProjectile;