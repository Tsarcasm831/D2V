
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Terminal, ChevronLeft, ChevronRight, Flame, Wind, Zap, Waves, Shield, Shuffle, BookOpen } from 'lucide-react';
import { Element } from '../types';

interface DevSidebarProps {
  onForceResult: (element: Element | 'random') => void;
  onShowAllTrees: () => void;
}

const DevSidebar: React.FC<DevSidebarProps> = ({ onForceResult, onShowAllTrees }) => {
  const [isOpen, setIsOpen] = useState(false);

  const elements = [
    { id: Element.FIRE, icon: Flame, color: 'text-red-500', label: 'Force Fire' },
    { id: Element.WIND, icon: Wind, color: 'text-emerald-400', label: 'Force Wind' },
    { id: Element.LIGHTNING, icon: Zap, color: 'text-indigo-400', label: 'Force Lightning' },
    { id: Element.WATER, icon: Waves, color: 'text-blue-500', label: 'Force Water' },
    { id: Element.EARTH, icon: Shield, color: 'text-yellow-600', label: 'Force Earth' },
  ];

  return (
    <motion.div
      initial={false}
      animate={{ x: isOpen ? 0 : -280 }}
      transition={{ type: 'spring', damping: 25, stiffness: 120 }}
      className="fixed left-0 bottom-4 z-[200] flex items-end"
    >
      <div className="w-[280px] bg-slate-950/90 backdrop-blur-xl border-y border-r border-white/10 rounded-r-[2rem] shadow-[20px_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
            <Terminal className="w-5 h-5 text-orange-500" />
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Dev Console</h3>
              <p className="text-[9px] text-slate-500 uppercase tracking-tighter">Bypass Diagnostic Logic</p>
            </div>
          </div>

          <div className="space-y-2">
            {elements.map((el) => (
              <button
                key={el.id}
                onClick={() => onForceResult(el.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group"
              >
                <el.icon className={`w-4 h-4 ${el.color} group-hover:scale-110 transition-transform`} />
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">{el.label}</span>
              </button>
            ))}
            
            <div className="pt-4 border-t border-white/5 mt-4 space-y-2">
              <button
                onClick={onShowAllTrees}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all group"
              >
                <BookOpen className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Mastery Archive</span>
              </button>
              
              <button
                onClick={() => onForceResult('random')}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 transition-all group"
              >
                <Shuffle className="w-4 h-4 text-orange-500 group-hover:rotate-180 transition-transform duration-500" />
                <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Random Outcome</span>
              </button>
            </div>
          </div>

          <p className="mt-8 text-[8px] text-slate-600 uppercase tracking-widest font-black text-center">
            Root Access • Sector 7
          </p>
        </div>
      </div>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 mb-6 -ml-px bg-slate-950 border-y border-r border-white/10 rounded-r-xl shadow-xl hover:bg-slate-900 transition-colors group"
      >
        {isOpen ? (
          <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-white" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white" />
        )}
      </button>
    </motion.div>
  );
};

export default DevSidebar;
