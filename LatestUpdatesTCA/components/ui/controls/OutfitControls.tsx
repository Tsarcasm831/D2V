
import React from 'react';
import { PlayerConfig, OutfitType } from '../../../types';
import { OUTFIT_PRESETS } from '../../../data/constants';
import { ColorPicker } from '../CommonControls';

interface OutfitControlsProps {
    config: PlayerConfig;
    setConfig: React.Dispatch<React.SetStateAction<PlayerConfig>>;
}

export const OutfitControls: React.FC<OutfitControlsProps> = ({ config, setConfig }) => {

    const handleConfigChange = (key: keyof PlayerConfig, value: any) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleOutfitChange = (outfit: OutfitType) => {
        const preset = OUTFIT_PRESETS[outfit];
        if (preset) {
            setConfig(prev => ({
                ...prev,
                ...preset
            }));
        }
    };

    const handleEquipmentChange = (key: keyof PlayerConfig['equipment']) => {
        setConfig(prev => ({
            ...prev,
            equipment: {
                ...prev.equipment,
                [key]: !prev.equipment[key]
            }
        }));
    };

    const handleHairToggle = () => {
        setConfig(prev => ({
            ...prev,
            hairStyle: prev.hairStyle === 'bald' ? 'crew' : 'bald'
        }));
    };

    return (
        <div className="space-y-4">
            <select value={config.outfit} onChange={(e) => handleOutfitChange(e.target.value as OutfitType)} className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm font-medium outline-none text-gray-700">
                <option value="nude">Nude</option>
                <option value="naked">Naked</option>
                <option value="peasant">Peasant</option>
                <option value="warrior">Warrior</option>
                <option value="noble">Noble</option>
            </select>

            <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500">Equipment</label>
                <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => handleEquipmentChange('helm')} className={`py-1.5 text-[10px] font-bold rounded border ${config.equipment.helm ? 'bg-amber-100 border-amber-500 text-amber-800' : 'bg-white border-gray-200 text-gray-400'}`}>Helm</button>
                    <button onClick={() => handleEquipmentChange('shoulders')} className={`py-1.5 text-[10px] font-bold rounded border ${config.equipment.shoulders ? 'bg-amber-100 border-amber-500 text-amber-800' : 'bg-white border-gray-200 text-gray-400'}`}>Pads</button>
                    <button onClick={() => handleEquipmentChange('shield')} className={`py-1.5 text-[10px] font-bold rounded border ${config.equipment.shield ? 'bg-amber-100 border-amber-500 text-amber-800' : 'bg-white border-gray-200 text-amber-400'}`}>Shield</button>
                    <button onClick={() => handleEquipmentChange('shirt')} className={`py-1.5 text-[10px] font-bold rounded border ${config.equipment.shirt ? 'bg-red-100 border-red-500 text-red-800' : 'bg-white border-gray-200 text-gray-400'}`}>Shirt</button>
                    <button onClick={() => handleEquipmentChange('pants')} className={`py-1.5 text-[10px] font-bold rounded border ${config.equipment.pants ? 'bg-blue-100 border-blue-500 text-blue-800' : 'bg-white border-gray-200 text-gray-400'}`}>Pants</button>
                    <button onClick={() => handleEquipmentChange('shoes')} className={`py-1.5 text-[10px] font-bold rounded border ${config.equipment.shoes ? 'bg-stone-100 border-stone-500 text-stone-800' : 'bg-white border-gray-200 text-gray-400'}`}>Shoes</button>
                    <button onClick={handleHairToggle} className={`py-1.5 text-[10px] font-bold rounded border ${config.hairStyle !== 'bald' ? 'bg-emerald-100 border-emerald-500 text-emerald-800' : 'bg-white border-gray-200 text-gray-400'}`}>Hair</button>
                </div>
            </div>

            <div className="space-y-2 pt-1 border-t border-gray-100">
                <ColorPicker label="Shirt Base" value={config.shirtColor} onChange={(v) => handleConfigChange('shirtColor', v)} />
                <ColorPicker label="Shirt Sec." value={config.shirtColor2} onChange={(v) => handleConfigChange('shirtColor2', v)} />
                <ColorPicker label="Pants" value={config.pantsColor} onChange={(v) => handleConfigChange('pantsColor', v)} />
            </div>
        </div>
    );
};
