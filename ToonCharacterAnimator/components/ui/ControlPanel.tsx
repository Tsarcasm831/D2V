
import React, { useState } from 'react';
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
    onExport: () => void;
}

const JOINT_LEGEND = [
    { label: 'Head', color: '#FF0000' },
    { label: 'Neck', color: '#FF69B4' },
    { label: 'Shoulders Base', color: '#222222' },
    { label: 'Torso', color: '#888888' },
    { label: 'Hips', color: '#FFFFFF' },
    // Left Arm
    { label: 'L. Shoulder', color: '#FF4500' },
    { label: 'L. Elbow', color: '#FFA500' },
    { label: 'L. Wrist', color: '#FFFF00' },
    // Right Arm
    { label: 'R. Shoulder', color: '#4B0082' },
    { label: 'R. Elbow', color: '#EE82EE' },
    { label: 'R. Wrist', color: '#FF00FF' },
    // Left Leg
    { label: 'L. Hip', color: '#006400' },
    { label: 'L. Knee', color: '#32CD32' },
    { label: 'L. Ankle', color: '#98FB98' },
    // Right Leg
    { label: 'R. Hip', color: '#000080' },
    { label: 'R. Knee', color: '#0000FF' },
    { label: 'R. Ankle', color: '#00FFFF' },
];

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
    config, 
    manualInput, 
    isDeadUI, 
    setConfig, 
    setManualInput, 
    handleDeathToggle, 
    triggerAction,
    onExport
}) => {
    const [isOpen, setIsOpen] = useState(false);

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

    const handleHairToggle = () => {
        setConfig(prev => ({
            ...prev,
            hairStyle: prev.hairStyle === 'bald' ? 'crew' : 'bald'
        }));
    };

    const toggleInput = (key: keyof PlayerInput) => {
        setManualInput(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleBrain = () => {
        setConfig(prev => ({ ...prev, showBrain: !prev.showBrain }));
    }
    
    const toggleDebugHead = () => {
        setConfig(prev => ({ ...prev, debugHead: !prev.debugHead }));
    }

    return (
        <>
            {!isOpen && (
                <button 
                    onClick={() => setIsOpen(true)}
                    className="absolute top-4 right-4 z-20 p-3 bg-white/90 backdrop-blur-md shadow-lg rounded-xl border border-white/50 text-gray-600 hover:text-blue-600 transition-all hover:scale-105 active:scale-95"
                    title="Open Controls"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>
            )}

            {isOpen && (
                <div className="absolute top-32 left-6 w-48 bg-white/90 backdrop-blur-md shadow-2xl rounded-xl p-4 border border-white/50 animate-[fadeIn_0.3s_ease-out] z-20">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-200 pb-2">Skeleton Legend</h3>
                    <div className="grid grid-cols-1 gap-1.5">
                        {JOINT_LEGEND.map((item) => (
                            <div key={item.label} className="flex items-center justify-between group">
                                <span className="text-[10px] font-bold text-gray-600 uppercase group-hover:text-gray-900">{item.label}</span>
                                <div 
                                    className="w-3 h-3 rounded-full shadow-sm border border-black/10 ring-1 ring-inset ring-black/5" 
                                    style={{ backgroundColor: item.color }} 
                                />
                            </div>
                        ))}
                    </div>
                    <p className="mt-3 text-[9px] text-gray-400 text-center border-t border-gray-200 pt-2">Press 'G' to toggle Skeleton</p>
                </div>
            )}

            <div className={`absolute top-0 right-0 h-full w-80 bg-white/90 backdrop-blur-md shadow-2xl z-20 overflow-y-auto p-6 border-l border-white/50 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <button 
                    onClick={() => setIsOpen(false)}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                    title="Close Controls"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

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
                                onClick={() => toggleInput('combat')}
                                className={`p-3 rounded-xl font-bold text-sm transition-all duration-200 border-2 ${
                                manualInput.combat
                                    ? 'bg-orange-100 border-orange-500 text-orange-700' 
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300'
                                }`}
                            >
                                {manualInput.combat ? 'In Combat' : 'Combat Stance (C)'}
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
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-3">
                            <button 
                                onClick={() => triggerAction('isPickingUp')}
                                className="p-3 rounded-xl font-bold text-sm bg-white border-2 border-gray-200 text-gray-600 hover:bg-gray-50 active:bg-blue-50 active:scale-95 transition-all"
                            >
                                Pick Up (F)
                            </button>
                            
                            <button 
                                onClick={() => triggerAction('resetView')}
                                className="p-3 rounded-xl font-bold text-sm bg-white border-2 border-gray-200 text-gray-600 hover:bg-gray-50 active:bg-blue-50 active:scale-95 transition-all"
                            >
                                Reset Gaze (V)
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-3">
                            <button onClick={() => triggerAction('attack1')} className="p-2 rounded-lg font-bold text-xs bg-white border border-gray-200 text-gray-600 hover:text-red-600">Punch</button>
                            <button onClick={() => triggerAction('attack2')} className="p-2 rounded-lg font-bold text-xs bg-white border border-gray-200 text-gray-600 hover:text-red-600">Axe Swing</button>
                            <button onClick={() => triggerAction('interact')} className="p-2 rounded-lg font-bold text-xs bg-white border border-gray-200 text-gray-600 hover:text-blue-600">Interact</button>
                        </div>
                        
                        <button 
                            onClick={onExport}
                            className="w-full mt-4 p-3 rounded-xl font-bold text-sm bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <span>Download .ZIP</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        </button>
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
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => handleEquipmentChange('helm')} className={`py-2 text-xs font-bold rounded-lg border ${config.equipment.helm ? 'bg-amber-100 border-amber-500 text-amber-800' : 'bg-white border-gray-200 text-gray-400'}`}>Helm</button>
                                    <button onClick={() => handleEquipmentChange('shoulders')} className={`py-2 text-xs font-bold rounded-lg border ${config.equipment.shoulders ? 'bg-amber-100 border-amber-500 text-amber-800' : 'bg-white border-gray-200 text-gray-400'}`}>Shoulders</button>
                                    <button onClick={() => handleEquipmentChange('shield')} className={`py-2 text-xs font-bold rounded-lg border ${config.equipment.shield ? 'bg-amber-100 border-amber-500 text-amber-800' : 'bg-white border-gray-200 text-gray-400'}`}>Shield</button>
                                    <button onClick={() => handleEquipmentChange('shirt')} className={`py-2 text-xs font-bold rounded-lg border ${config.equipment.shirt ? 'bg-red-100 border-red-500 text-red-800' : 'bg-white border-gray-200 text-gray-400'}`}>Shirt</button>
                                    <button onClick={() => handleEquipmentChange('pants')} className={`py-2 text-xs font-bold rounded-lg border ${config.equipment.pants ? 'bg-blue-100 border-blue-500 text-blue-800' : 'bg-white border-gray-200 text-gray-400'}`}>Pants</button>
                                    <button onClick={handleHairToggle} className={`py-2 text-xs font-bold rounded-lg border ${config.hairStyle !== 'bald' ? 'bg-emerald-100 border-emerald-500 text-emerald-800' : 'bg-white border-gray-200 text-gray-400'}`}>Hair</button>
                                    <button onClick={toggleBrain} className={`py-2 text-xs font-bold rounded-lg border ${config.showBrain ? 'bg-pink-100 border-pink-500 text-pink-800' : 'bg-white border-gray-200 text-gray-400'}`}>Brain</button>
                                    <button onClick={toggleDebugHead} className={`py-2 text-xs font-bold rounded-lg border ${config.debugHead ? 'bg-purple-100 border-purple-500 text-purple-800' : 'bg-white border-gray-200 text-gray-400'}`}>Debug Head</button>
                                </div>
                            </div>
                            
                            {config.showBrain && (
                                <Slider label="Brain Size" value={config.brainSize} min={0.5} max={2.0} step={0.1} onChange={(v) => handleConfigChange('brainSize', v)} />
                            )}

                            <div className="space-y-3 pt-2">
                                <ColorPicker label="Skin" value={config.skinColor} onChange={(v) => handleConfigChange('skinColor', v)} />
                                <ColorPicker label="Shirt" value={config.shirtColor} onChange={(v) => handleConfigChange('shirtColor', v)} />
                                <ColorPicker label="Hair" value={config.hairColor} onChange={(v) => handleConfigChange('hairColor', v)} />
                                <ColorPicker label="Eyes" value={config.eyeColor} onChange={(v) => handleConfigChange('eyeColor', v)} />
                                <ColorPicker label="Lips" value={config.lipColor} onChange={(v) => handleConfigChange('lipColor', v)} />
                                <Slider label="Iris Size" value={config.irisScale} min={0.25} max={0.75} step={0.05} onChange={(v) => handleConfigChange('irisScale', v)} />
                                <Slider label="Pupil Size" value={config.pupilScale} min={0.25} max={0.75} step={0.05} onChange={(v) => handleConfigChange('pupilScale', v)} />
                                <Slider label="Nose Height" value={config.noseHeight} min={-0.05} max={0.05} step={0.005} onChange={(v) => handleConfigChange('noseHeight', v)} />
                                <Slider label="Nose Forward" value={config.noseForward} min={-0.05} max={0.05} step={0.005} onChange={(v) => handleConfigChange('noseForward', v)} />
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
                    
                    <section>
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Upper Jaw (Maxilla)</h2>
                        <div className="space-y-5">
                            <Slider label="Width" value={config.maxillaScaleX} min={0.5} max={1.5} step={0.05} onChange={(v) => handleConfigChange('maxillaScaleX', v)} />
                            <Slider label="Height" value={config.maxillaScaleY} min={0.5} max={1.5} step={0.05} onChange={(v) => handleConfigChange('maxillaScaleY', v)} />
                            <Slider label="Depth" value={config.maxillaScaleZ} min={0.5} max={1.5} step={0.05} onChange={(v) => handleConfigChange('maxillaScaleZ', v)} />
                            <Slider label="Position Y" value={config.maxillaOffsetY} min={-0.05} max={0.05} step={0.005} onChange={(v) => handleConfigChange('maxillaOffsetY', v)} />
                            <Slider label="Position Z" value={config.maxillaOffsetZ} min={-0.05} max={0.05} step={0.005} onChange={(v) => handleConfigChange('maxillaOffsetZ', v)} />
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Lips</h2>
                        <div className="space-y-4">
                            <h3 className="text-xs font-semibold text-gray-500">Upper Lip</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <Slider label="Width" value={config.upperLipWidth} min={0.5} max={1.5} step={0.05} onChange={(v) => handleConfigChange('upperLipWidth', v)} />
                                <Slider label="Height" value={config.upperLipHeight} min={0.5} max={1.5} step={0.05} onChange={(v) => handleConfigChange('upperLipHeight', v)} />
                                <Slider label="Thick" value={config.upperLipThick} min={0.5} max={2.0} step={0.1} onChange={(v) => handleConfigChange('upperLipThick', v)} />
                                <Slider label="Pos Y" value={config.upperLipOffsetY} min={-0.1} max={0.1} step={0.001} onChange={(v) => handleConfigChange('upperLipOffsetY', v)} />
                                <Slider label="Pos Z" value={config.upperLipOffsetZ} min={-0.1} max={0.2} step={0.001} onChange={(v) => handleConfigChange('upperLipOffsetZ', v)} />
                            </div>
                            
                            <h3 className="text-xs font-semibold text-gray-500 pt-2">Lower Lip</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <Slider label="Width" value={config.lowerLipWidth} min={0.5} max={1.5} step={0.05} onChange={(v) => handleConfigChange('lowerLipWidth', v)} />
                                <Slider label="Height" value={config.lowerLipHeight} min={0.5} max={1.5} step={0.05} onChange={(v) => handleConfigChange('lowerLipHeight', v)} />
                                <Slider label="Thick" value={config.lowerLipThick} min={0.5} max={2.0} step={0.1} onChange={(v) => handleConfigChange('lowerLipThick', v)} />
                                <Slider label="Pos Y" value={config.lowerLipOffsetY} min={-0.2} max={0.1} step={0.001} onChange={(v) => handleConfigChange('lowerLipOffsetY', v)} />
                                <Slider label="Pos Z" value={config.lowerLipOffsetZ} min={-0.1} max={0.2} step={0.001} onChange={(v) => handleConfigChange('lowerLipOffsetZ', v)} />
                            </div>
                        </div>
                    </section>
                    
                    <section>
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Jaw Options</h2>
                        <div className="space-y-5">
                            <Slider label="Jaw Size" value={config.chinSize} min={0.5} max={1.5} step={0.05} onChange={(v) => handleConfigChange('chinSize', v)} />
                            <Slider label="Jaw Length" value={config.chinLength} min={0.5} max={1.5} step={0.05} onChange={(v) => handleConfigChange('chinLength', v)} />
                            <Slider label="Jaw Height" value={config.chinHeight} min={-0.1} max={0.05} step={0.005} onChange={(v) => handleConfigChange('chinHeight', v)} />
                            <Slider label="Jaw Forward" value={config.chinForward} min={-0.05} max={0.1} step={0.005} onChange={(v) => handleConfigChange('chinForward', v)} />
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
};
