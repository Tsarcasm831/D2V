import React, { useMemo, useState } from 'react';
import { generateWeaponConfig } from '../services/geminiService';
import { WeaponConfig } from '../types';

interface AIPanelProps {
  onConfigGenerated: (config: WeaponConfig) => void;
  onLoadingState: (isLoading: boolean) => void;
}

export const AIPanel: React.FC<AIPanelProps> = ({ onConfigGenerated, onLoadingState }) => {
  const [prompt, setPrompt] = useState('');
  const hasGemini = useMemo(
    () => !!(process.env.GEMINI_API_KEY || process.env.API_KEY),
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !hasGemini) return;

    onLoadingState(true);
    const config = await generateWeaponConfig(prompt);
    onLoadingState(false);

    if (config) {
      onConfigGenerated(config);
    } else {
      alert("The forge spirit was silent. Please try a different description.");
    }
  };

  return (
    <div className="bg-forge-800 p-4 border-t border-forge-700">
      <h3 className="text-forge-gold text-xs font-bold uppercase mb-2 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        AI Blacksmith
      </h3>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input 
          type="text" 
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. 'A massive golden warhammer for a paladin'"
          className="flex-1 bg-forge-900 border border-forge-700 rounded px-3 py-2 text-sm text-white focus:border-forge-accent outline-none"
        />
        <button 
          type="submit"
          className="bg-forge-accent hover:bg-orange-600 text-white font-bold py-2 px-4 rounded text-sm transition-colors shadow-lg shadow-orange-900/50"
        >
          Forge
        </button>
      </form>
      <p className="text-[10px] text-gray-500 mt-2 italic">
        Powered by Gemini 3 Flash. Describe the lore or appearance of your weapon.
      </p>
    </div>
  );
};