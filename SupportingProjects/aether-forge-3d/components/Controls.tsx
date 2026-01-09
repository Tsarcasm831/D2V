import React, { useState } from 'react';
import { WeaponConfig, WeaponType, WeaponEffect, TextureStyle } from '../types';
import { PRESETS } from '../constants';
import { generateWeaponScript } from '../services/codeExporter';

interface ControlsProps {
  config: WeaponConfig;
  onChange: (newConfig: WeaponConfig) => void;
  isGenerating: boolean;
}

const ControlGroup = ({ title, children }: { title: string, children?: React.ReactNode }) => (
  <div className="mb-6 border-b border-forge-700 pb-4">
    <h3 className="text-forge-gold uppercase text-xs font-bold tracking-wider mb-3">{title}</h3>
    <div className="space-y-3">
      {children}
    </div>
  </div>
);

const Slider = ({ label, value, min, max, step, onChange }: { label: string, value: number, min: number, max: number, step: number, onChange: (val: number) => void }) => (
  <div className="flex flex-col">
    <div className="flex justify-between text-xs text-gray-400 mb-1">
      <span>{label}</span>
      <span>{value.toFixed(2)}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 bg-forge-700 rounded-lg appearance-none cursor-pointer accent-forge-accent hover:accent-orange-400 transition-colors"
    />
  </div>
);

const ColorPicker = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-gray-400">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-xs font-mono text-gray-600">{value}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 rounded border-none cursor-pointer bg-transparent"
      />
    </div>
  </div>
);

const Modal = ({ title, onClose, children }: { title: string, onClose: () => void, children?: React.ReactNode }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-forge-800 border border-forge-700 rounded-lg shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] animate-fade-in">
            <div className="flex justify-between items-center p-4 border-b border-forge-700">
                <h3 className="text-forge-gold font-bold uppercase text-xs tracking-wider">{title}</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                {children}
            </div>
        </div>
    </div>
);

export const Controls: React.FC<ControlsProps> = ({ config, onChange, isGenerating }) => {
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('Copy Code');

  const update = (key: keyof WeaponConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };

  const getConfigCode = () => {
      // Use the new exporter to generate the full script
      return generateWeaponScript(config);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getConfigCode());
    setCopyFeedback('Copied!');
    setTimeout(() => setCopyFeedback('Copy Code'), 2000);
  };

  const handleDownload = () => {
    const code = getConfigCode();
    const blob = new Blob([code], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weapon_${config.type.toLowerCase()}.ts`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (evt) => {
          const text = evt.target?.result as string;
          if (text) setImportText(text);
      };
      reader.readAsText(file);
  };

  const handleImportSubmit = () => {
      try {
          const text = importText;
          const regex = /const\s+weaponConfig(?::\s*WeaponConfig)?\s*=\s*(\{[\s\S]*?\n\};)/;
          const match = text.match(regex);
          
          let jsonStr = "";
          if (match && match[1]) {
             jsonStr = match[1].replace(/;$/, '');
          } else {
             jsonStr = text;
          }

          let newConfig;
          try {
             newConfig = JSON.parse(jsonStr);
          } catch(e) {
             // eslint-disable-next-line no-new-func
             const func = new Function(`return ${jsonStr}`);
             newConfig = func();
          }

          if (newConfig && newConfig.type) {
              onChange({ ...config, ...newConfig });
              setShowImport(false);
              setImportText('');
          } else {
              alert('Could not find a valid weaponConfig object in the text.');
          }
      } catch (err) {
          console.error(err);
          alert('Failed to parse configuration. Please check the syntax.');
      }
  };

  return (
    <div className="h-full overflow-y-auto pr-2 pb-20 custom-scrollbar">
      
      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        <button onClick={() => setShowExport(true)} className="bg-forge-700 hover:bg-forge-600 text-white text-xs py-2 rounded transition-colors">
          Export Script
        </button>
        <button onClick={() => setShowImport(true)} className="bg-forge-700 hover:bg-forge-600 text-white text-xs py-2 rounded transition-colors">
          Import / Upload
        </button>
      </div>

      <div className="mb-6">
        <label className="block text-xs font-bold text-forge-gold uppercase mb-2">Weapon Type</label>
        <div className="grid grid-cols-3 gap-1">
          {Object.values(WeaponType).map((type) => (
            <button
              key={type}
              onClick={() => update('type', type)}
              className={`px-2 py-2 text-[10px] rounded border transition-all truncate ${
                config.type === type 
                  ? 'bg-forge-accent text-white border-forge-accent font-bold shadow-[0_0_10px_rgba(255,107,0,0.3)]' 
                  : 'bg-forge-800 text-gray-400 border-forge-700 hover:border-gray-500'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

       {/* Presets */}
       <div className="mb-6 space-y-2">
        <div>
            <label className="block text-xs font-bold text-forge-gold uppercase mb-1">Presets</label>
            <select 
            onChange={(e) => {
                const p = PRESETS[e.target.value];
                if(p) onChange(p);
            }}
            className="w-full bg-forge-800 border border-forge-700 text-white text-xs rounded p-2 focus:border-forge-accent outline-none"
            >
            <option value="">Select a preset...</option>
            {Object.keys(PRESETS).map(key => <option key={key} value={key}>{key}</option>)}
            </select>
        </div>
      </div>

      <ControlGroup title="Dimensions">
        <Slider label="Handle/Shaft Length" value={config.handleLength} min={0.0} max={2.0} step={0.05} onChange={(v) => update('handleLength', v)} />
        <Slider label="Handle/Shaft Radius" value={config.handleRadius} min={0.005} max={0.1} step={0.001} onChange={(v) => update('handleRadius', v)} />
        <Slider label="Guard/Fletch Size" value={config.guardWidth} min={0.0} max={1.0} step={0.05} onChange={(v) => update('guardWidth', v)} />
        <Slider label="Blade/Tip Length" value={config.bladeLength} min={0.05} max={2.5} step={0.05} onChange={(v) => update('bladeLength', v)} />
        <Slider label="Blade/Tip Width" value={config.bladeWidth} min={0.01} max={0.8} step={0.01} onChange={(v) => update('bladeWidth', v)} />
        <Slider label="Blade/Tip Thickness" value={config.bladeThickness} min={0.005} max={0.2} step={0.005} onChange={(v) => update('bladeThickness', v)} />
        <Slider label="Pommel/End Size" value={config.pommelSize} min={0.0} max={0.2} step={0.01} onChange={(v) => update('pommelSize', v)} />
      </ControlGroup>

      <ControlGroup title="Visuals">
        <div className="mb-3">
             <label className="block text-xs text-gray-400 mb-1">Handle Texture</label>
             <select 
                value={config.handleTexture || TextureStyle.NONE}
                onChange={(e) => update('handleTexture', e.target.value)}
                className="w-full bg-forge-800 border border-forge-700 text-white text-xs rounded p-1 outline-none"
             >
                {Object.values(TextureStyle).map(style => <option key={style} value={style}>{style}</option>)}
             </select>
        </div>
        <div className="mb-3">
             <label className="block text-xs text-gray-400 mb-1">Blade Texture</label>
             <select 
                value={config.bladeTexture || TextureStyle.NONE}
                onChange={(e) => update('bladeTexture', e.target.value)}
                className="w-full bg-forge-800 border border-forge-700 text-white text-xs rounded p-1 outline-none"
             >
                {Object.values(TextureStyle).map(style => <option key={style} value={style}>{style}</option>)}
             </select>
        </div>
        <div className="mb-3">
             <label className="block text-xs text-gray-400 mb-1">Effect</label>
             <select 
                value={config.effect || WeaponEffect.NONE}
                onChange={(e) => update('effect', e.target.value)}
                className="w-full bg-forge-800 border border-forge-700 text-white text-xs rounded p-1 outline-none"
             >
                {Object.values(WeaponEffect).map(eff => <option key={eff} value={eff}>{eff}</option>)}
             </select>
        </div>
        <ColorPicker label="Effect Color" value={config.effectColor || '#ff6b00'} onChange={(v) => update('effectColor', v)} />
        <div className="h-2"></div>
        <ColorPicker label="Metal/Head Color" value={config.metalColor} onChange={(v) => update('metalColor', v)} />
        <ColorPicker label="Handle Color" value={config.handleColor} onChange={(v) => update('handleColor', v)} />
        <ColorPicker label="Guard/Pommel Color" value={config.guardColor} onChange={(v) => update('guardColor', v)} />
        <div className="h-2"></div>
        <Slider label="Roughness" value={config.roughness} min={0} max={1} step={0.05} onChange={(v) => update('roughness', v)} />
        <Slider label="Metalness" value={config.metalness} min={0} max={1} step={0.05} onChange={(v) => update('metalness', v)} />
      </ControlGroup>

      {isGenerating && (
        <div className="absolute inset-0 bg-forge-900/80 z-50 flex items-center justify-center backdrop-blur-sm rounded">
          <div className="flex flex-col items-center">
             <div className="w-8 h-8 border-4 border-forge-accent border-t-transparent rounded-full animate-spin mb-2"></div>
             <span className="text-forge-accent font-bold animate-pulse">Forging...</span>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExport && (
          <Modal title="Export Script" onClose={() => setShowExport(false)}>
              <div className="space-y-4">
                  <p className="text-xs text-gray-400">
                    This is a standalone Three.js TypeScript script that generates your current weapon design.
                  </p>
                  <textarea 
                    readOnly 
                    value={getConfigCode()} 
                    className="w-full h-64 bg-forge-900 border border-forge-700 rounded p-3 text-xs font-mono text-gray-300 focus:outline-none resize-none"
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  />
                  <div className="flex justify-end gap-2">
                      <button onClick={handleDownload} className="bg-forge-accent hover:bg-orange-600 text-white text-xs font-bold py-2 px-4 rounded transition-colors">
                          Download .ts
                      </button>
                      <button onClick={handleCopy} className="bg-forge-700 hover:bg-forge-600 text-white text-xs py-2 px-4 rounded transition-colors">
                          {copyFeedback}
                      </button>
                      <button onClick={() => setShowExport(false)} className="bg-forge-700 hover:bg-forge-600 text-white text-xs py-2 px-4 rounded transition-colors">
                          Close
                      </button>
                  </div>
              </div>
          </Modal>
      )}

      {/* Import Modal */}
      {showImport && (
          <Modal title="Import Script" onClose={() => setShowImport(false)}>
              <div className="space-y-4">
                  <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-400 uppercase">Option 1: Paste Script</label>
                      <textarea 
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        placeholder="Paste your exported script or config JSON here..."
                        className="w-full h-32 bg-forge-900 border border-forge-700 rounded p-3 text-xs font-mono text-gray-300 focus:border-forge-accent outline-none resize-none"
                      />
                  </div>
                  
                  <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-400 uppercase">Option 2: Upload File</label>
                      <input 
                        type="file"
                        accept=".js,.json,.txt,.ts"
                        onChange={handleFileUpload}
                        className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-forge-700 file:text-white hover:file:bg-forge-600"
                      />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                      <button onClick={handleImportSubmit} className="bg-forge-accent hover:bg-orange-600 text-white text-xs font-bold py-2 px-4 rounded transition-colors">
                          Apply Configuration
                      </button>
                      <button onClick={() => setShowImport(false)} className="bg-forge-700 hover:bg-forge-600 text-white text-xs py-2 px-4 rounded transition-colors">
                          Cancel
                      </button>
                  </div>
              </div>
          </Modal>
      )}

    </div>
  );
};