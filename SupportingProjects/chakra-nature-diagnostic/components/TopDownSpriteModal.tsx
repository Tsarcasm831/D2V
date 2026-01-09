
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Map as MapIcon, Download, Sparkles, Zap } from 'lucide-react';

interface TopDownSpriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  isLoading: boolean;
  elementTitle: string;
  onGenerate: () => void;
}

const TopDownSpriteModal: React.FC<TopDownSpriteModalProps> = ({ isOpen, onClose, imageUrl, isLoading, elementTitle, onGenerate }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/95 backdrop-blur-2xl" />
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.9, opacity: 0, y: 20 }} 
            className="relative w-full max-w-md bg-slate-950 border border-emerald-500/20 rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(16,185,129,0.15)] flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-5 bg-emerald-950/20 flex justify-between items-center border-b border-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-xl">
                  <MapIcon className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-sm font-ninja text-white tracking-widest uppercase">90° VERTICAL ASSET</h2>
                  <p className="text-[9px] text-emerald-500/60 uppercase font-black tracking-[0.2em]">{elementTitle.split(' ')[0]}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/50 hover:text-white transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Asset Display */}
            <div className="p-6 overflow-y-auto">
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-white/5 border border-white/5 flex items-center justify-center group shadow-inner">
                {isLoading ? (
                  <div className="text-center space-y-3">
                    <Loader2 className="w-10 h-10 text-emerald-500/40 animate-spin mx-auto" />
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40">Syncing Perspective...</p>
                  </div>
                ) : imageUrl ? (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    className="relative w-full h-full flex items-center justify-center"
                  >
                    <img src={imageUrl} alt="Top-Down View" className="w-full h-full object-contain p-4" />
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 pointer-events-none">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span className="text-[7px] font-black text-white/40 uppercase tracking-widest">Map Ready</span>
                    </div>
                  </motion.div>
                ) : (
                  <div className="text-center space-y-4 p-8">
                    <Zap className="w-12 h-12 text-white/10 mx-auto" />
                    <button 
                      onClick={onGenerate}
                      className="px-8 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-emerald-200 font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 mx-auto"
                    >
                      <Sparkles className="w-3 h-3" />
                      Manifest Map View
                    </button>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="mt-6 space-y-4">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-[9px] font-black text-emerald-400 uppercase mb-1">Integration Data</p>
                  <p className="text-xs text-white/60 leading-relaxed italic">
                    Orthographic bird's-eye view. Optimized for 2D map movement engines requiring a strict vertical perspective.
                  </p>
                </div>

                <div className="flex gap-3">
                  {imageUrl && (
                    <button 
                      onClick={() => {
                        if (imageUrl) {
                          const link = document.createElement('a');
                          link.href = imageUrl;
                          link.download = `Shinobi_Vertical_TopDown.png`;
                          link.click();
                        }
                      }}
                      className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 uppercase tracking-widest"
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
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TopDownSpriteModal;
