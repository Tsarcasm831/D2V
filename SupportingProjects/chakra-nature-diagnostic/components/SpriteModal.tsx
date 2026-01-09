
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Gamepad2, Sparkles, Download, Zap } from 'lucide-react';

interface SpriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  isLoading: boolean;
  elementTitle: string;
  onGenerate: () => void;
}

const SpriteModal: React.FC<SpriteModalProps> = ({ isOpen, onClose, imageUrl, isLoading, elementTitle, onGenerate }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/95 backdrop-blur-2xl"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-slate-900 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh]"
          >
            <div className="p-5 bg-slate-800/50 flex justify-between items-center border-b border-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-xl">
                  <Gamepad2 className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-sm font-ninja text-white tracking-widest uppercase">UNIT SPRITE</h2>
                  <p className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em]">Game Ready • Idle Pose</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full text-white/50 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-white/5 border border-white/5 flex items-center justify-center shadow-inner">
                {isLoading ? (
                  <div className="text-center space-y-3">
                    <Loader2 className="w-10 h-10 text-indigo-500/40 animate-spin mx-auto" />
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40">Compiling Asset...</p>
                  </div>
                ) : imageUrl ? (
                  <>
                    <img 
                      src={imageUrl} 
                      alt="Shinobi Sprite" 
                      className="w-full h-full object-contain p-4"
                    />
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 pointer-events-none">
                       <Sparkles className="w-3 h-3 text-indigo-400" />
                       <span className="text-[7px] font-black text-white/40 uppercase tracking-widest">Isolated</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-4 p-8">
                    <Zap className="w-12 h-12 text-white/10 mx-auto" />
                    <button 
                      onClick={onGenerate}
                      className="px-8 py-3 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl text-indigo-200 font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 mx-auto"
                    >
                      <Sparkles className="w-3 h-3" />
                      Manifest Sprite
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                   <p className="text-[9px] font-black text-indigo-400 uppercase mb-0.5">Asset State</p>
                   <p className="text-xs text-white font-medium">Idle Neutral</p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                   <p className="text-[9px] font-black text-indigo-400 uppercase mb-0.5">Affinity</p>
                   <p className="text-xs text-white font-medium capitalize">{elementTitle.split(' ')[0]}</p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                {imageUrl && (
                  <button 
                    onClick={() => {
                      if (imageUrl) {
                        const link = document.createElement('a');
                        link.href = imageUrl;
                        link.download = `Shinobi_Sprite_${elementTitle.replace(' ', '_')}.png`;
                        link.click();
                      }
                    }}
                    className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 uppercase tracking-widest"
                  >
                    <Download className="w-4 h-4" /> EXPORT
                  </button>
                )}
                <button 
                  onClick={onClose}
                  className="px-6 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold border border-white/10 transition-all text-xs uppercase tracking-widest"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SpriteModal;
