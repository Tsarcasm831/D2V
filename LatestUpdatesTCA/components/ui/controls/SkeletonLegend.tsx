
import React from 'react';

const JOINT_LEGEND = [
    { label: 'Head', color: '#FF0000' },
    { label: 'Neck', color: '#FF69B4' },
    { label: 'Shoulders Base', color: '#222222' },
    { label: 'Torso', color: '#888888' },
    { label: 'Hips', color: '#FFFFFF' },
    // Left Arm
    { label: 'L. Shoulder', color: '#FF4500' },
    { label: 'L. Elbow', color: '#FFA500' },
    { label: 'L. Wrist', color: '#FFFF00' },
    { label: 'L. Fingers', color: '#FFD700' },
    // Right Arm
    { label: 'R. Shoulder', color: '#4B0082' },
    { label: 'R. Elbow', color: '#EE82EE' },
    { label: 'R. Wrist', color: '#FF00FF' },
    { label: 'R. Fingers', color: '#FF1493' },
    // Left Leg
    { label: 'L. Hip', color: '#006400' },
    { label: 'L. Knee', color: '#32CD32' },
    { label: 'L. Ankle', color: '#98FB98' },
    { label: 'L. Toes', color: '#00FA9A' },
    // Right Leg
    { label: 'R. Hip', color: '#000080' },
    { label: 'R. Knee', color: '#0000FF' },
    { label: 'R. Ankle', color: '#00FFFF' },
    { label: 'R. Toes', color: '#1E90FF' },
];

export const SkeletonLegend: React.FC = () => {
    return (
        <div className="absolute top-32 left-6 w-48 bg-white/90 backdrop-blur-md shadow-2xl rounded-xl p-4 border border-white/50 animate-[fadeIn_0.3s_ease-out] z-20 h-[60vh] overflow-y-auto scrollbar-hide">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-200 pb-2">Skeleton Legend</h3>
            <div className="grid grid-cols-1 gap-1.5">
                {JOINT_LEGEND.map((item) => (
                    <div key={item.label} className="flex items-center justify-between group">
                        <span className="text-[10px] font-bold text-gray-600 uppercase group-hover:text-gray-900">{item.label}</span>
                        <div 
                            className="w-3 h-3 rounded-full shadow-sm border border-black/10 ring-1 ring-inset ring-black/5" 
                            style={{ backgroundColor: item.color }} 
                        />
                    </div>
                ))}
            </div>
            <p className="mt-3 text-[9px] text-gray-400 text-center border-t border-gray-200 pt-2">Press 'J' to Toggle Mode</p>
        </div>
    );
};
