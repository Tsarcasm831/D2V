
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TreePine, Scroll } from 'lucide-react';
import { Skill } from '../types';
import AbilityTree from './AbilityTree';

interface AbilityTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  skills: Skill[];
  elementTitle: string;
  elementColor: string;
}

const AbilityTreeModal: React.FC<AbilityTreeModalProps> = ({ isOpen, onClose, skills, elementTitle, elementColor }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/95 backdrop-blur-2xl"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 50 }}
            className="relative w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col"
          >
            {/* Header */}
            <div className={`p-6 bg-gradient-to-r ${elementColor} flex justify-between items-center shadow-xl z-10 shrink-0`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md">
                  <TreePine className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-ninja text-white tracking-widest uppercase">{elementTitle.split(' ')[0]} Mastery</h2>
                  <p className="text-[9px] text-white/60 uppercase font-black tracking-[0.2em] mt-0.5">Full Elemental Advancement Path</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2.5 bg-black/20 hover:bg-black/40 rounded-full text-white transition-all transform hover:rotate-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900/50">
               <div className="p-6 md:p-10 space-y-8">
                 <div className="flex items-center gap-3 p-5 bg-white/5 rounded-2xl border border-white/5 italic text-slate-400">
                    <Scroll className="w-5 h-5 text-orange-400 shrink-0" />
                    <p className="text-xs">"Each node represents a deepening bond between your spirit and the fundamental elements."</p>
                 </div>
                 
                 <AbilityTree skills={skills} elementColor={elementColor} />
               </div>
            </div>

            {/* Footer */}
            <div className="p-5 bg-slate-950/50 border-t border-white/5 flex justify-center shrink-0">
              <button 
                onClick={onClose}
                className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-black border border-white/10 transition-all uppercase tracking-widest text-[10px]"
              >
                Close Mastery Scroll
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AbilityTreeModal;
