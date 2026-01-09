
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Sparkles, Sword, Download, Zap } from 'lucide-react';

interface UnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  isLoading: boolean;
  elementTitle: string;
  elementColor: string;
  onGenerate: () => void;
}

const UnitModal: React.FC<UnitModalProps> = ({ isOpen, onClose, imageUrl, isLoading, elementTitle, elementColor, onGenerate }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className={`p-6 bg-gradient-to-r ${elementColor} flex justify-between items-center shrink-0`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                  <Sword className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-ninja text-white tracking-wider uppercase">UNIT PROFILE</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar">
              <div className="relative aspect-[3/4] w-full rounded-3xl overflow-hidden bg-slate-800 border border-white/5 flex items-center justify-center group shadow-2xl">
                {isLoading ? (
                  <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 text-white/20 animate-spin mx-auto" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Manifesting Form...</p>
                  </div>
                ) : imageUrl ? (
                  <>
                    <img 
                      src={imageUrl} 
                      alt="Shinobi Unit" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                    <div className="absolute bottom-6 left-6 right-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-orange-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Unique Identity</span>
                      </div>
                      <h3 className="text-3xl font-ninja text-white leading-none">{elementTitle.split(' ')[0]} Prodigy</h3>
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-4 p-8">
                    <Zap className="w-16 h-16 text-white/10 mx-auto" />
                    <button 
                      onClick={onGenerate}
                      className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-black uppercase tracking-widest text-xs transition-all flex items-center gap-3 mx-auto"
                    >
                      <Sparkles className="w-4 h-4 text-orange-400" />
                      Manifest Profile Art
                    </button>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Chakra Synchronization Required</p>
                  </div>
                )}
              </div>

              <div className="mt-8 p-6 bg-white/5 rounded-2xl border border-white/5 text-center italic text-sm text-slate-400 leading-relaxed">
                "A true shinobi is defined not by their rank, but by the will that guides their chakra."
              </div>

              <div className="mt-8 flex gap-4">
                {imageUrl && (
                  <button 
                    onClick={() => {
                      if (imageUrl) {
                        const link = document.createElement('a');
                        link.href = imageUrl;
                        link.download = `Shinobi_Profile_${elementTitle.replace(' ', '_')}.png`;
                        link.click();
                      }
                    }}
                    className={`flex-1 py-4 bg-gradient-to-r ${elementColor} text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-lg uppercase tracking-widest text-xs border border-white/10`}
                  >
                    <Download className="w-5 h-5" /> Export Asset
                  </button>
                )}
                <button 
                  onClick={onClose}
                  className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold border border-white/10 transition-all uppercase tracking-widest text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default UnitModal;
