
import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ current, total }) => {
  const progress = ((current + 1) / total) * 100;

  return (
    <div className="w-full mb-8">
      <div className="flex justify-between items-end mb-2">
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Chakra Synchronization</span>
        </div>
        <span className="text-[10px] text-slate-400 font-bold bg-slate-800/50 px-2 py-0.5 rounded-md border border-slate-700/50">
          Node {current + 1} / {total}
        </span>
      </div>
      <div className="w-full bg-slate-800/50 h-2 rounded-full overflow-hidden relative border border-slate-700/30">
        <div 
          className="h-full bg-gradient-to-r from-orange-600 via-orange-400 to-red-500 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(234,88,12,0.3)]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
