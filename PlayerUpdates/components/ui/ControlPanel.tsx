import React from 'react';
import { PlayerConfig, PlayerInput, BodyVariant, OutfitType, WeaponStance } from '../../types';
import { BODY_PRESETS } from '../../data/constants';
import { Slider, ColorPicker } from './CommonControls';

interface ControlPanelProps {
    config: PlayerConfig;
    manualInput: Partial<PlayerInput>;
    isDeadUI: boolean;
    setConfig: React.Dispatch<React.SetStateAction<PlayerConfig>>;
    setManualInput: React.Dispatch<React.SetStateAction<Partial<PlayerInput>>>;
    handleDeathToggle: () => void;
    triggerAction: (key: keyof PlayerInput) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
    config, 
    manualInput, 
    isDeadUI, 
    setConfig, 
    setManualInput, 
    handleDeathToggle, 
    triggerAction 
}) => {

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

    const handleEquipmentChange = (key: keyof PlayerConfig['equipment']) => {
        setConfig(prev => ({
            ...prev,
            equipment: {
                ...prev.equipment,
                [key]: !prev.equipment[key]
            }
        }));
    };

    const toggleInput = (key: keyof PlayerInput) => {
        setManualInput(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="absolute top-0 right-0 h-full w-80 bg-white/90 backdrop-blur-md shadow-2xl z-20 overflow-y-auto p-6 border-l border-white/50">
            <div className="space-y-8 pb-20">
                {/* Actions Section */}
                <section>
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Actions</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => toggleInput('isRunning')}
                            className={`p-3 rounded-xl font-bold text-sm transition-all duration-200 border-2 ${
                            manualInput.isRunning 
                                ? 'bg-blue-100 border-blue-500 text-blue-700' 
                                : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'
                            }`}
                        >
                            {manualInput.isRunning ? 'Running' : 'Walk / Run'}
                        </button>
                        
                        <button 
                            onClick={handleDeathToggle}
                            className={`p-3 rounded-xl font-bold text-sm transition-all duration-200 border-2 ${
                            isDeadUI
                                ? 'bg-red-100 border-red-500 text-red-700' 
                                : 'bg-white border-gray-200 text-gray-600 hover:border-red-300'
                            }`}
                        >
                            {isDeadUI ? 'Resurrect' : 'Die / Ragdoll'}
                        </button>

                        <button 
                            onMouseDown={() => setManualInput(prev => ({...prev, jump: true}))}
                            onMouseUp={() => setManualInput(prev => ({...prev, jump: false}))}
                            onMouseLeave={() => setManualInput(prev => ({...prev, jump: false}))}
                            className="p-3 rounded-xl font-bold text-sm bg-white border-2 border-gray-200 text-gray-600 hover:bg-gray-50 active:bg-blue-50 active:scale-95 transition-all"
                        >
                            Jump (Hold)
                        </button>

                        <button 
                            onClick={() => triggerAction('isPickingUp')}
                            className="p-3 rounded-xl font-bold text-sm bg-white border-2 border-gray-200 text-gray-600 hover:bg-gray-50 active:bg-blue-50 active:scale-95 transition-all"
                        >
                            Pick Up (F)
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3">
                        <button onClick={() => triggerAction('attack1')} className="p-2 rounded-lg font-bold text-xs bg-white border border-gray-200 text-gray-600 hover:text-red-600">Punch</button>
                        <button onClick={() => triggerAction('attack2')} className="p-2 rounded-lg font-bold text-xs bg-white border border-gray-200 text-gray-600 hover:text-red-600">Axe Swing</button>
                        <button onClick={() => triggerAction('interact')} className="p-2 rounded-lg font-bold text-xs bg-white border border-gray-200 text-gray-600 hover:text-blue-600">Interact</button>
                    </div>
                </section>

                {/* Appearance Section */}
                <section>
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Style</h2>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-600">Body Type</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['average', 'muscular', 'slim', 'heavy'].map(variant => (
                                    <button key={variant} onClick={() => handleBodyVariantChange(variant as BodyVariant)} className={`py-2 rounded-lg text-xs font-bold capitalize transition-all border ${config.bodyVariant === variant ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'}`}>{variant}</button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-600">Outfit</label>
                            <select value={config.outfit} onChange={(e) => handleConfigChange('outfit', e.target.value as OutfitType)} className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm font-medium outline-none">
                                <option value="nude">Nude</option>
                                <option value="naked">Naked</option>
                                <option value="peasant">Peasant</option>
                                <option value="warrior">Warrior</option>
                                <option value="noble">Noble</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-600">Weapon Stance</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['side', 'shoulder'].map(stance => (
                                    <button key={stance} onClick={() => handleConfigChange('weaponStance', stance as WeaponStance)} className={`py-2 rounded-lg text-xs font-bold capitalize transition-all border ${config.weaponStance === stance ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200'}`}>{stance}</button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-600">Equipment</label>
                            <div className="flex gap-2">
                                <button onClick={() => handleEquipmentChange('helm')} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${config.equipment.helm ? 'bg-amber-100 border-amber-500 text-amber-800' : 'bg-white border-gray-200 text-gray-400'}`}>Helm</button>
                                <button onClick={() => handleEquipmentChange('shoulders')} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${config.equipment.shoulders ? 'bg-amber-100 border-amber-500 text-amber-800' : 'bg-white border-gray-200 text-gray-400'}`}>Shoulders</button>
                                <button onClick={() => handleEquipmentChange('shield')} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${config.equipment.shield ? 'bg-amber-100 border-amber-500 text-amber-800' : 'bg-white border-gray-200 text-gray-400'}`}>Shield</button>
                            </div>
                        </div>

                        <div className="space-y-3 pt-2">
                            <ColorPicker label="Skin" value={config.skinColor} onChange={(v) => handleConfigChange('skinColor', v)} />
                            <ColorPicker label="Eyes" value={config.eyeColor} onChange={(v) => handleConfigChange('eyeColor', v)} />
                            <ColorPicker label="Lips" value={config.lipColor} onChange={(v) => handleConfigChange('lipColor', v)} />
                            <Slider label="Iris Size" value={config.irisScale} min={0.5} max={1.5} step={0.05} onChange={(v) => handleConfigChange('irisScale', v)} />
                        </div>

                        <div className="flex items-center justify-between p-1 bg-gray-100 rounded-xl mt-2">
                            <button onClick={() => handleConfigChange('bodyType', 'male')} className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${config.bodyType === 'male' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'}`}>Male</button>
                            <button onClick={() => handleConfigChange('bodyType', 'female')} className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${config.bodyType === 'female' ? 'bg-white shadow-sm text-pink-600' : 'text-gray-400'}`}>Female</button>
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Proportions</h2>
                    <div className="space-y-5">
                        <Slider label="Head Scale" value={config.headScale} min={0.5} max={2.0} step={0.1} onChange={(v) => handleConfigChange('headScale', v)} />
                        <Slider label="Neck Height" value={config.neckHeight} min={0.5} max={2.0} step={0.1} onChange={(v) => handleConfigChange('neckHeight', v)} />
                        <Slider label="Neck Thickness" value={config.neckThickness} min={0.5} max={2.0} step={0.1} onChange={(v) => handleConfigChange('neckThickness', v)} />
                        <Slider label="Torso Width" value={config.torsoWidth} min={0.5} max={1.5} step={0.1} onChange={(v) => handleConfigChange('torsoWidth', v)} />
                        <Slider label="Arm Scale" value={config.armScale} min={0.5} max={1.5} step={0.1} onChange={(v) => handleConfigChange('armScale', v)} />
                        <Slider label="Leg Scale" value={config.legScale} min={0.5} max={1.5} step={0.1} onChange={(v) => handleConfigChange('legScale', v)} />
                        <Slider label="Butt Scale" value={config.buttScale} min={0.5} max={2.0} step={0.1} onChange={(v) => handleConfigChange('buttScale', v)} />
                    </div>
                </section>
            </div>
        </div>
    );
};