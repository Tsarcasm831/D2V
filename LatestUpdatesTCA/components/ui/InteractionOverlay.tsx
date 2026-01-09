
import React from 'react';

interface InteractionOverlayProps {
    text: string | null;
    progress: number | null;
}

export const InteractionOverlay: React.FC<InteractionOverlayProps> = ({ text, progress }) => {
    
    // Check if we are showing a power meter (text === 'Power')
    const isPowerMeter = text === 'Power';
    
    // For standard interactions, text is shown only when NO progress bar is active.
    // For power meter, we might want both or just the bar.
    // Logic: If isPowerMeter, show bar with gradient. If standard, show yellow bar.
    
    return (
        <>
            {/* Text Label (Only show if not a progress bar, or if it is a Power meter label) */}
            {(text && !progress) && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-12 bg-black/60 backdrop-blur-sm px-6 py-3 rounded-xl text-white text-sm font-bold animate-pulse shadow-lg pointer-events-none z-40 border border-white/10">
                    {text}
                </div>
            )}
            
            {/* Progress Bar Container */}
            {progress !== null && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-20 w-48 z-40">
                    <div className="w-full h-3 bg-gray-800/80 rounded-full overflow-hidden border border-white/20 shadow-xl backdrop-blur-sm relative">
                        {isPowerMeter ? (
                            // Power Meter (Gradient)
                            <div 
                                className="h-full transition-all duration-75 ease-linear"
                                style={{ 
                                    width: `${progress * 100}%`,
                                    background: 'linear-gradient(90deg, #10b981 0%, #f59e0b 60%, #ef4444 100%)',
                                    boxShadow: '0 0 15px rgba(255,255,255,0.3)'
                                }} 
                            />
                        ) : (
                            // Standard Action Bar (Yellow)
                            <div 
                                className="h-full bg-yellow-500 transition-all duration-75 ease-linear shadow-[0_0_10px_rgba(234,179,8,0.5)]" 
                                style={{ width: `${progress * 100}%` }} 
                            />
                        )}
                    </div>
                    
                    <p className={`text-center text-[10px] font-bold mt-1 uppercase tracking-widest text-shadow-sm ${isPowerMeter ? 'text-white' : 'text-yellow-200'}`}>
                        {text || 'Processing...'}
                    </p>
                </div>
            )}
        </>
    );
};
