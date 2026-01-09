import React, { useState } from 'react';
import { WeaponViewer } from './components/WeaponViewer';
import { Controls } from './components/Controls';
import { AIPanel } from './components/AIPanel';
import { WeaponConfig } from './types';
import { DEFAULT_CONFIG } from './constants';

export default function App() {
  const [config, setConfig] = useState<WeaponConfig>(DEFAULT_CONFIG);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen w-screen bg-forge-900 font-sans text-gray-100 overflow-hidden">
      
      {/* 3D Canvas Area */}
      <div className="flex-1 relative">
        <div className="absolute top-4 left-4 z-10 pointer-events-none">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-500 drop-shadow-lg tracking-tighter">
                AETHER<span className="text-forge-accent">FORGE</span>
            </h1>
            <p className="text-xs text-gray-400 font-mono mt-1 tracking-widest">PARAMETRIC WEAPON SYSTEM</p>
        </div>

        {/* Sidebar Toggle for Mobile */}
        <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute top-4 right-4 z-20 md:hidden bg-forge-800 p-2 rounded border border-forge-700 text-white"
        >
            {isSidebarOpen ? 'Hide' : 'Config'}
        </button>

        <WeaponViewer config={config} />
      </div>

      {/* Sidebar Controls */}
      <div 
        className={`fixed md:relative right-0 top-0 h-full w-80 bg-forge-900 border-l border-forge-800 shadow-2xl z-30 transform transition-transform duration-300 flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0 md:w-80'}
        `}
      >
        <div className="p-5 flex-1 overflow-hidden relative">
            <Controls 
                config={config} 
                onChange={setConfig} 
                isGenerating={isGenerating} 
            />
        </div>
        
        <AIPanel 
            onConfigGenerated={setConfig} 
            onLoadingState={setIsGenerating} 
        />
      </div>
    </div>
  );
}