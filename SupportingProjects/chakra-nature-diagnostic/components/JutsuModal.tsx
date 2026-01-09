
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, Info, ScrollText } from 'lucide-react';
import { JutsuInfo } from '../constants';

interface JutsuModalProps {
  jutsu: JutsuInfo | null;
  onClose: () => void;
  elementColor: string;
}

const JutsuModal: React.FC<JutsuModalProps> = ({ jutsu, onClose, elementColor }) => {
  if (!jutsu) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className={`relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl shadow-black/50`}
        >
          {/* Header Graphic */}
          <div className={`h-24 bg-gradient-to-r ${elementColor} flex items-end p-6 relative`}>
            <div className="absolute top-4 right-4">
              <button 
                onClick={onClose}
                className="p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                <ScrollText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-ninja text-white leading-none">{jutsu.name}</h2>
                <div className="mt-1 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-black/30 rounded text-[10px] font-bold text-white/80 uppercase">Rank: {jutsu.rank}</span>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < (5 - (jutsu.rank.charCodeAt(0) - 65)) ? 'bg-white' : 'bg-white/20'}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            <section>
              <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
                <Info className="w-3 h-3 text-blue-400" /> Technical Data
              </h3>
              <p className="text-slate-300 leading-relaxed font-medium">
                {jutsu.description}
              </p>
            </section>

            <div className="h-px bg-slate-800" />

            <section>
              <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
                <Award className="w-3 h-3 text-orange-400" /> Historical Lore
              </h3>
              <p className="text-slate-400 italic leading-relaxed text-sm">
                "{jutsu.lore}"
              </p>
            </section>

            <button 
              onClick={onClose}
              className={`w-full py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all border border-slate-700`}
            >
              Close Scroll
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default JutsuModal;
