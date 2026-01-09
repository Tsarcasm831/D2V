import React from 'react';

interface InteractionOverlayProps {
    text: string | null;
    progress: number | null;
}

export const InteractionOverlay: React.FC<InteractionOverlayProps> = ({ text, progress }) => {
    return (
        <>
            {text && !progress && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-12 bg-black/60 backdrop-blur-sm px-6 py-3 rounded-xl text-white text-sm font-bold animate-pulse shadow-lg pointer-events-none z-40 border border-white/10">
                    {text}
                </div>
            )}
            
            {progress !== null && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-20 w-48 z-40">
                    <div className="w-full h-3 bg-gray-800/80 rounded-full overflow-hidden border border-white/20 shadow-xl backdrop-blur-sm">
                        <div 
                            className="h-full bg-yellow-500 transition-all duration-75 ease-linear shadow-[0_0_10px_rgba(234,179,8,0.5)]" 
                            style={{ width: `${progress * 100}%` }} 
                        />
                    </div>
                    <p className="text-center text-[10px] font-bold text-yellow-200 mt-1 uppercase tracking-widest text-shadow-sm">Skinning...</p>
                </div>
            )}
        </>
    );
};