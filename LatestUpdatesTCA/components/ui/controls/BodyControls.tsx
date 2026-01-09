
import React from 'react';
import { PlayerConfig, BodyVariant } from '../../../types';
import { BODY_PRESETS } from '../../../data/constants';
import { ColorPicker } from '../CommonControls';

interface BodyControlsProps {
    config: PlayerConfig;
    setConfig: React.Dispatch<React.SetStateAction<PlayerConfig>>;
}

export const BodyControls: React.FC<BodyControlsProps> = ({ config, setConfig }) => {
    
    const handleConfigChange = (key: keyof PlayerConfig, value: any) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleBodyVariantChange = (variant: BodyVariant) => {
        const preset = BODY_PRESETS[variant];
        setConfig(prev => ({
            ...prev,
            bodyVariant: variant,
            ...preset
        }));
    };

    return (
        <div className="space-y-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
                <button onClick={() => handleConfigChange('bodyType', 'male')} className={`flex-1 py-1 rounded text-xs font-bold transition-all ${config.bodyType === 'male' ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}>Male</button>
                <button onClick={() => handleConfigChange('bodyType', 'female')} className={`flex-1 py-1 rounded text-xs font-bold transition-all ${config.bodyType === 'female' ? 'bg-white shadow text-pink-600' : 'text-gray-400'}`}>Female</button>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500">Variant</label>
                <div className="grid grid-cols-4 gap-1">
                    {['average', 'muscular', 'slim', 'heavy'].map(variant => (
                        <button key={variant} onClick={() => handleBodyVariantChange(variant as BodyVariant)} className={`py-1 rounded text-[10px] font-bold capitalize transition-all border ${config.bodyVariant === variant ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'}`}>{variant}</button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <ColorPicker label="Skin Tone" value={config.skinColor} onChange={(v) => handleConfigChange('skinColor', v)} />
                <ColorPicker label="Hair Color" value={config.hairColor} onChange={(v) => handleConfigChange('hairColor', v)} />
            </div>
        </div>
    );
};
