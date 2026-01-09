
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Scroll } from 'lucide-react';
import { ELEMENT_LORE } from '../constants';
import { Element } from '../types';
import AbilityTree from './AbilityTree';

interface AllAbilityTreesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AllAbilityTreesModal: React.FC<AllAbilityTreesModalProps> = ({ isOpen, onClose }) => {
  const elements = [Element.FIRE, Element.WIND, Element.LIGHTNING, Element.WATER, Element.EARTH];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/95 backdrop-blur-3xl"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 100 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 100 }}
            className="relative w-full max-w-5xl h-[90vh] bg-slate-950 border border-white/10 rounded-[3rem] overflow-hidden shadow-[0_0_150px_rgba(0,0,0,1)] flex flex-col"
          >
            {/* Header */}
            <div className="p-8 bg-slate-900 border-b border-white/10 flex justify-between items-center z-20 shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600/20 rounded-2xl border border-blue-500/20">
                  <BookOpen className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-3xl font-ninja text-white tracking-widest uppercase">Mastery Archive</h2>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.4em] mt-1">Full Elemental Technique Index</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all transform hover:rotate-90"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-24 pb-32">
              <div className="max-w-3xl mx-auto space-y-6 text-center mb-16">
                 <div className="flex justify-center mb-4">
                   <Scroll className="w-12 h-12 text-blue-500/20" />
                 </div>
                 <h3 className="text-xl font-ninja text-slate-400 tracking-wider">The Great Library of Jutsu</h3>
                 <p className="text-sm text-slate-500 leading-relaxed font-light italic">
                   "To understand one's nature is the beginning. To understand the world's nature is the path to divinity. Herein lies the progression of every fundamental chakra release known to the Hidden Villages."
                 </p>
              </div>

              {elements.map((el) => {
                const lore = ELEMENT_LORE[el];
                return (
                  <div key={el} className="space-y-10">
                    <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                       <div className={`w-3 h-12 rounded-full bg-gradient-to-b ${lore.color}`} />
                       <h2 className="text-4xl font-ninja text-white tracking-tighter uppercase">{lore.title}</h2>
                    </div>
                    <AbilityTree skills={lore.tree} elementColor={lore.color} />
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-900 border-t border-white/10 flex justify-center z-20 shrink-0">
              <button 
                onClick={onClose}
                className="px-12 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black border border-white/10 transition-all uppercase tracking-widest text-xs"
              >
                Close Archive
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AllAbilityTreesModal;
