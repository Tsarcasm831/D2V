
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Skill, SkillLevel } from '../types';
import { Shield, Loader2, Sparkles, Image as ImageIcon, Zap } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface AbilityTreeProps {
  skills: Skill[];
  elementColor: string;
}

const LevelBadge: React.FC<{ level: SkillLevel }> = ({ level }) => {
  const colors: Record<SkillLevel, string> = {
    [SkillLevel.ACADEMY]: 'bg-slate-700 text-slate-300',
    [SkillLevel.GENIN]: 'bg-emerald-600 text-white',
    [SkillLevel.CHUNIN]: 'bg-blue-600 text-white',
    [SkillLevel.JONIN]: 'bg-purple-600 text-white',
    [SkillLevel.KAGE]: 'bg-orange-600 text-white',
    [SkillLevel.FORBIDDEN]: 'bg-red-600 text-white shadow-lg shadow-red-600/20 animate-pulse'
  };

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${colors[level]}`}>
      {level}
    </span>
  );
};

const SkillAsset: React.FC<{ skill: Skill; elementColor: string }> = ({ skill, elementColor }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateAsset = useCallback(async () => {
    if (imageUrl || isLoading) return;
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Fantasy anime game skill icon for a technique named "${skill.name}". 
      Description: ${skill.description}. 
      Style: High-quality Naruto-style concept art, clean, centered, vibrant magical effects. 
      No text, plain dark slate background. Focus on the elemental effects.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{ parts: [{ text: prompt }] }],
        config: { imageConfig: { aspectRatio: "1:1" } }
      });
      
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setImageUrl(`data:image/png;base64,${part.inlineData.data}`);
          break;
        }
      }
    } catch (e) {
      console.error("Asset generation failed", e);
    } finally {
      setIsLoading(false);
    }
  }, [skill, imageUrl, isLoading]);

  return (
    <div className="w-20 h-20 shrink-0 relative rounded-xl overflow-hidden bg-slate-800 border border-white/10 flex items-center justify-center group/asset">
      {isLoading ? (
        <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
      ) : imageUrl ? (
        <img src={imageUrl} alt={skill.name} className="w-full h-full object-cover transition-transform duration-500 group-hover/asset:scale-110" />
      ) : (
        <button 
          onClick={generateAsset}
          className="w-full h-full flex flex-col items-center justify-center gap-1 hover:bg-white/5 transition-colors group/btn"
          title="Manifest Technique Asset"
        >
          <Sparkles className="w-4 h-4 text-white/30 group-hover/btn:text-white transition-colors" />
          <span className="text-[7px] font-black text-white/20 uppercase tracking-widest group-hover/btn:text-white/60">Manifest</span>
        </button>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${elementColor}`} />
    </div>
  );
};

const AbilityTree: React.FC<AbilityTreeProps> = ({ skills, elementColor }) => {
  return (
    <div className="space-y-8 relative">
      <div className="absolute left-[54px] top-10 bottom-10 w-px bg-gradient-to-b from-white/20 via-white/5 to-white/20 hidden md:block" />

      <div className="grid grid-cols-1 gap-6">
        {skills.map((skill, index) => (
          <motion.div
            key={skill.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
            className="group relative flex flex-col md:flex-row items-center md:items-start gap-6 p-6 bg-white/5 hover:bg-white/10 border border-white/5 rounded-[2rem] transition-all"
          >
            <SkillAsset skill={skill} elementColor={elementColor} />

            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center md:items-baseline justify-between mb-2 gap-2">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${elementColor} flex items-center justify-center text-[10px] font-black text-white shadow-lg`}>
                    {index + 1}
                  </div>
                  <h4 className="text-lg font-black text-white tracking-tight uppercase">{skill.name}</h4>
                </div>
                <LevelBadge level={skill.level} />
              </div>
              <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
                {skill.description}
              </p>
            </div>
            
            <div className="hidden md:flex flex-col items-center justify-center gap-2">
               <Sparkles className="w-4 h-4 text-white/10 group-hover:text-white/40 transition-colors" />
               <div className="w-1 h-1 rounded-full bg-white/10 group-hover:bg-white/40 transition-colors" />
            </div>
          </motion.div>
        ))}
      </div>
      
      <div className="mt-12 p-8 bg-slate-950/50 rounded-[2.5rem] border border-white/5 text-center relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        <Shield className="w-12 h-12 text-white/5 mx-auto mb-4" />
        <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.4em] leading-loose max-w-md mx-auto">
          Elemental mastery is a lifelong pursuit. Techniques must be manually manifested to visualize their unique chakra signature.
        </p>
      </div>
    </div>
  );
};

export default AbilityTree;
