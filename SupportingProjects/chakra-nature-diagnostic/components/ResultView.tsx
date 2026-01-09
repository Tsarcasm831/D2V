
import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FinalResult, Element } from '../types';
import { ELEMENT_LORE, JutsuInfo } from '../constants';
import { Shield, Zap, Wind, Waves, Flame, RefreshCcw, Info, ArrowUpRight, Scroll, User, Loader2, Gamepad2, Map as MapIcon, BarChart3, TreePine } from 'lucide-react';
import JutsuModal from './JutsuModal';
import AbilityTreeModal from './AbilityTreeModal';
import UnitModal from './UnitModal';
import SpriteModal from './SpriteModal';
import TopDownSpriteModal from './TopDownSpriteModal';
import { GoogleGenAI } from "@google/genai";

interface ResultViewProps {
  result: FinalResult;
  onReset: () => void;
}

const ElementIcon: React.FC<{ element: Element; className?: string }> = ({ element, className = "w-12 h-12" }) => {
  const getAnimation = () => {
    switch (element) {
      case Element.FIRE:
        return {
          scale: [1, 1.1, 0.95, 1.05, 1],
          y: [0, -8, -4, -10, 0],
          filter: ["drop-shadow(0 0 2px #ef4444) brightness(1)", "drop-shadow(0 0 15px #f97316) brightness(1.3)", "drop-shadow(0 0 5px #ef4444) brightness(1)"],
          transition: { duration: 0.8, repeat: Infinity, ease: "easeInOut", times: [0, 0.2, 0.5, 0.8, 1] }
        };
      case Element.LIGHTNING:
        return {
          opacity: [1, 0.1, 1, 0.4, 1, 0.2, 1],
          scale: [1, 1.4, 0.8, 1.6, 0.9, 1.1, 1],
          x: [0, -6, 6, -10, 10, -4, 0],
          transition: { duration: 0.2, repeat: Infinity, repeatDelay: Math.random() * 2, ease: "circOut" }
        };
      case Element.WIND:
        return {
          rotate: [0, 360],
          scale: [0.9, 1.1, 0.9],
          transition: { rotate: { duration: 1.5, repeat: Infinity, ease: "linear" }, scale: { duration: 2, repeat: Infinity, ease: "easeInOut" } }
        };
      case Element.WATER:
        return {
          y: [0, -15, 0],
          x: [-8, 8, -8],
          rotate: [-12, 12, -12],
          transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
        };
      case Element.EARTH:
        return {
          y: [0, 2, -2, 1, -1, 3, 0],
          scale: [1, 0.98, 1.02, 1],
          transition: { duration: 3, repeat: Infinity, ease: "linear" }
        };
      default:
        return {};
    }
  };

  const Icon = (() => {
    switch (element) {
      case Element.FIRE: return Flame;
      case Element.WATER: return Waves;
      case Element.EARTH: return Shield;
      case Element.LIGHTNING: return Zap;
      case Element.WIND: return Wind;
      default: return Flame;
    }
  })();

  return (
    <motion.div animate={getAnimation()} style={{ transformStyle: 'preserve-3d' }}>
      <Icon className={`${className} ${element === Element.FIRE ? 'text-red-500' : element === Element.WATER ? 'text-blue-500' : element === Element.EARTH ? 'text-yellow-600' : element === Element.LIGHTNING ? 'text-indigo-400' : 'text-emerald-400'}`} />
    </motion.div>
  );
};

const StatBar: React.FC<{ label: string, value: number, color: string }> = ({ label, value, color }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
      <span className="text-white/60">{label}</span>
      <span className="text-white">{value.toFixed(1)}</span>
    </div>
    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${(value / 5) * 100}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className={`h-full ${color}`}
      />
    </div>
  </div>
);

const ResultView: React.FC<ResultViewProps> = ({ result, onReset }) => {
  const [selectedJutsu, setSelectedJutsu] = useState<JutsuInfo | null>(null);
  const [isTreeModalOpen, setIsTreeModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isSpriteModalOpen, setIsSpriteModalOpen] = useState(false);
  const [isTopDownModalOpen, setIsTopDownModalOpen] = useState(false);
  
  const [characterDescription, setCharacterDescription] = useState<string | null>(null);
  const [unitImageUrl, setUnitImageUrl] = useState<string | null>(null);
  const [spriteImageUrl, setSpriteImageUrl] = useState<string | null>(null);
  const [topDownImageUrl, setTopDownImageUrl] = useState<string | null>(null);
  
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isGeneratingUnit, setIsGeneratingUnit] = useState(false);
  const [isGeneratingSprite, setIsGeneratingSprite] = useState(false);
  const [isGeneratingTopDown, setIsGeneratingTopDown] = useState(false);
  
  const info = ELEMENT_LORE[result.primary];

  const generateCharacterDescription = useCallback(async () => {
    if (characterDescription || isGeneratingDesc || !result.preferences) return;
    setIsGeneratingDesc(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prefs = result.preferences;
      const prompt = `Define a detailed visual MASTER REFERENCE for a Naruto shinobi.
      Identity: ${prefs.name}, ${prefs.gender}.
      Physical Attributes: Strictly ${prefs.hairColor} hair, strictly ${prefs.skinColor} skin color. ${prefs.hasGlasses ? 'He/She is wearing iconic ninja spectacles/glasses.' : 'He/She wears no eyewear.'}
      Chakra Nature: ${result.primary}.
      Outfit Style: Traditional but stylized Naruto ninja gear, using a color palette dominated by ${result.primary} elemental tones.
      Description: Write exactly 3 precise sentences. One for face and hair, one for physique and outfit, and one for their elemental aura. Use this as the absolute visual blueprint for all image generation.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      setCharacterDescription(response.text || `A ${prefs.gender} shinobi named ${prefs.name} with ${result.primary} affinity.`);
    } catch (e) {
      console.error(e);
      setCharacterDescription(`A shinobi themed after ${result.primary} chakra.`);
    } finally {
      setIsGeneratingDesc(false);
    }
  }, [result, characterDescription, isGeneratingDesc]);

  const generateUnitImage = useCallback(async () => {
    if (!characterDescription || unitImageUrl || isGeneratingUnit) return;
    setIsGeneratingUnit(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Anime character illustration of a Naruto shinobi. 
      STRICT MASTER VISUAL REFERENCE: ${characterDescription}.
      Physicals: ${result.preferences?.hairColor} hair, ${result.preferences?.skinColor} skin, ${result.preferences?.hasGlasses ? 'with glasses' : 'no glasses'}.
      Style: Modern Naruto anime art (Studio Pierrot style).
      Composition: Full body, dynamic action pose performing ${result.primary} release jutsu. 
      Background: Dark slate background. High consistency required.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{ parts: [{ text: prompt }] }],
        config: { imageConfig: { aspectRatio: "3:4" } }
      });
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) { setUnitImageUrl(`data:image/png;base64,${part.inlineData.data}`); break; }
      }
    } catch (e) { console.error(e); } finally { setIsGeneratingUnit(false); }
  }, [characterDescription, unitImageUrl, isGeneratingUnit, result.primary, result.preferences]);

  const generateSpriteImage = useCallback(async () => {
    if (!characterDescription || spriteImageUrl || isGeneratingSprite) return;
    setIsGeneratingSprite(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `2D game character sprite of the shinobi. 
      STRICT MASTER VISUAL REFERENCE: ${characterDescription}.
      Physicals: ${result.preferences?.hairColor} hair, ${result.preferences?.skinColor} skin, ${result.preferences?.hasGlasses ? 'with glasses' : 'no glasses'}.
      Style: High-definition pixel art / clean 2D game asset style. Front-facing neutral A-pose.
      Background: Transparent or white. Focus on consistent colors and outfit details.`;
      
       const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{ parts: [{ text: prompt }] }],
        config: { imageConfig: { aspectRatio: "1:1" } }
      });
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) { setSpriteImageUrl(`data:image/png;base64,${part.inlineData.data}`); break; }
      }
    } catch (e) { console.error(e); } finally { setIsGeneratingSprite(false); }
  }, [characterDescription, spriteImageUrl, isGeneratingSprite, result.preferences]);

  const generateTopDownAsset = useCallback(async () => {
    if (!characterDescription || topDownImageUrl || isGeneratingTopDown) return;
    setIsGeneratingTopDown(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Bird's-eye view 2D game asset of the shinobi.
      STRICT MASTER VISUAL REFERENCE: ${characterDescription}.
      Angle: Vertical 90-degree perspective looking directly down at the top of the head and shoulders.
      Physicals: Show the ${result.preferences?.hairColor} hair and ${result.primary} themed shoulder pads clearly.
      Background: Transparent background. Professional top-down map asset style.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{ parts: [{ text: prompt }] }],
        config: { imageConfig: { aspectRatio: "1:1" } }
      });
      
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) { setTopDownImageUrl(`data:image/png;base64,${part.inlineData.data}`); break; }
      }
    } catch (e) { console.error(e); } finally { setIsGeneratingTopDown(false); }
  }, [characterDescription, topDownImageUrl, isGeneratingTopDown, result.preferences, result.primary]);

  useEffect(() => {
    generateCharacterDescription();
  }, [generateCharacterDescription]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative bg-slate-900 border border-slate-800 rounded-[3rem] p-8 md:p-12 shadow-2xl overflow-hidden">
        <div className={`absolute top-0 right-0 w-96 h-96 bg-gradient-to-br ${info.color} opacity-20 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none`} />
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
          <div className="shrink-0 relative">
             <div className="absolute inset-0 bg-white/5 blur-xl rounded-full" />
             <ElementIcon element={result.primary} className="w-24 h-24 md:w-32 md:h-32" />
          </div>
          <div className="space-y-4 flex-1">
             <div>
                <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ delay: 0.5, duration: 1 }} className={`h-1 w-12 bg-gradient-to-r ${info.color} rounded-full mb-4 mx-auto md:mx-0`} />
                <h2 className="text-4xl md:text-6xl font-ninja text-white leading-none tracking-tight uppercase">
                  {result.preferences?.name ? `${result.preferences.name}` : info.title.split(' ')[0]}
                </h2>
                <p className="text-sm text-slate-400 font-bold tracking-[0.3em] uppercase mt-2">Chakra Nature: {result.primary}</p>
             </div>
             <p className="text-lg text-slate-300 leading-relaxed font-light">{result.explanation}</p>
             <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
               <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${result.yinYang === 'Yin' ? 'bg-purple-500' : result.yinYang === 'Yang' ? 'bg-orange-500' : 'bg-slate-400'}`} />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">{result.yinYang} Release</span>
               </div>
               <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 flex items-center gap-2">
                  <BarChart3 className="w-3 h-3 text-slate-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">{result.confidence} Resonance</span>
               </div>
             </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-slate-900/50 border border-slate-800 rounded-[2rem] p-8">
           <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2"><Info className="w-4 h-4" /> Combat Statistics</h3>
           <div className="space-y-4">
             <StatBar label="Ninjutsu" value={result.stats.ninjutsu} color="bg-red-500" />
             <StatBar label="Taijutsu" value={result.stats.taijutsu} color="bg-orange-500" />
             <StatBar label="Genjutsu" value={result.stats.genjutsu} color="bg-purple-500" />
             <StatBar label="Intelligence" value={result.stats.intelligence} color="bg-blue-500" />
             <StatBar label="Speed" value={result.stats.speed} color="bg-emerald-400" />
             <StatBar label="Stamina" value={result.stats.stamina} color="bg-yellow-500" />
             <StatBar label="Hand Seals" value={result.stats.handSeals} color="bg-indigo-400" />
             <StatBar label="Strength" value={result.stats.strength} color="bg-stone-400" />
           </div>
         </motion.div>
         <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="space-y-4">
           <div className="bg-slate-900/50 border border-slate-800 rounded-[2rem] p-8 h-full flex flex-col">
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2"><Scroll className="w-4 h-4" /> Signature Jutsu</h3>
              <div className="space-y-3 flex-1">
                {info.jutsus.map((jutsu: JutsuInfo, idx: number) => (
                  <button key={idx} onClick={() => setSelectedJutsu(jutsu)} className="w-full text-left p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-xl transition-all group flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 font-bold border border-slate-800`}>{jutsu.rank}</span>
                        <span className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors">{jutsu.name}</span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">{jutsu.description}</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
                  </button>
                ))}
              </div>
           </div>
         </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button onClick={() => setIsTreeModalOpen(true)} className="p-6 bg-slate-800 hover:bg-slate-700 rounded-3xl border border-slate-700 transition-all group flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><TreePine className="w-6 h-6 text-emerald-400" /></div>
          <span className="text-xs font-black text-slate-300 uppercase tracking-wider group-hover:text-white">Ability Tree</span>
        </button>
        <button onClick={() => setIsUnitModalOpen(true)} className="p-6 bg-slate-800 hover:bg-slate-700 rounded-3xl border border-slate-700 transition-all group flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
             {isGeneratingUnit ? <Loader2 className="w-6 h-6 text-blue-400 animate-spin" /> : <User className="w-6 h-6 text-blue-400" />}
          </div>
          <span className="text-xs font-black text-slate-300 uppercase tracking-wider group-hover:text-white">Unit Profile</span>
        </button>
        <button onClick={() => setIsSpriteModalOpen(true)} className="p-6 bg-slate-800 hover:bg-slate-700 rounded-3xl border border-slate-700 transition-all group flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
             {isGeneratingSprite ? <Loader2 className="w-6 h-6 text-purple-400 animate-spin" /> : <Gamepad2 className="w-6 h-6 text-purple-400" />}
          </div>
          <span className="text-xs font-black text-slate-300 uppercase tracking-wider group-hover:text-white">Game Sprite</span>
        </button>
        <button onClick={() => setIsTopDownModalOpen(true)} className="p-6 bg-slate-800 hover:bg-slate-700 rounded-3xl border border-slate-700 transition-all group flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
             {isGeneratingTopDown ? <Loader2 className="w-6 h-6 text-orange-400 animate-spin" /> : <MapIcon className="w-6 h-6 text-orange-400" />}
          </div>
          <span className="text-xs font-black text-slate-300 uppercase tracking-wider group-hover:text-white">Top-Down View</span>
        </button>
      </motion.div>

      <div className="flex justify-center pt-8">
        <button onClick={onReset} className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-200 rounded-xl transition-all text-xs font-bold uppercase tracking-widest border border-transparent hover:border-red-900">
          <RefreshCcw className="w-4 h-4" /> Reset Diagnostic
        </button>
      </div>

      <JutsuModal jutsu={selectedJutsu} onClose={() => setSelectedJutsu(null)} elementColor={info.color} />
      <AbilityTreeModal isOpen={isTreeModalOpen} onClose={() => setIsTreeModalOpen(false)} skills={info.tree} elementTitle={info.title} elementColor={info.color} />
      <UnitModal 
        isOpen={isUnitModalOpen} 
        onClose={() => setIsUnitModalOpen(false)} 
        imageUrl={unitImageUrl} 
        isLoading={isGeneratingUnit} 
        elementTitle={info.title} 
        elementColor={info.color} 
        onGenerate={generateUnitImage}
      />
      <SpriteModal 
        isOpen={isSpriteModalOpen} 
        onClose={() => setIsSpriteModalOpen(false)} 
        imageUrl={spriteImageUrl} 
        isLoading={isGeneratingSprite} 
        elementTitle={info.title} 
        onGenerate={generateSpriteImage}
      />
      <TopDownSpriteModal 
        isOpen={isTopDownModalOpen} 
        onClose={() => setIsTopDownModalOpen(false)} 
        imageUrl={topDownImageUrl} 
        isLoading={isGeneratingTopDown} 
        elementTitle={info.title} 
        onGenerate={generateTopDownAsset}
      />
    </div>
  );
};

export default ResultView;
