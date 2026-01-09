
import React, { useState } from 'react';
import { PlayerConfig } from '../../types';
import { ITEM_ICONS } from '../../data/constants';
import { PlayerPreview } from './PlayerPreview';

interface InventoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    config: PlayerConfig;
    inventory: string[];
    equipmentSlots: Record<string, string | null>;
    onEquip: (index: number) => void;
    onInventoryChange: (items: string[]) => void;
    onEquipItem: (item: string, slotId: string) => void;
    onUnequipItem: (slotId: string) => void;
    coins: number;
}

const TABS = ['Equipment', 'Consumables', 'Quest'];

// Stats derivation helper
const getStats = (cfg: PlayerConfig) => {
    let str = 10;
    let dex = 10;
    let int = 10;
    
    if (cfg.bodyVariant === 'muscular') { str += 5; dex -= 2; }
    if (cfg.bodyVariant === 'slim') { str -= 2; dex += 5; }
    if (cfg.bodyVariant === 'heavy') { str += 8; dex -= 5; }
    
    return {
        Level: 5,
        Health: 100 + (str * 2),
        Stamina: 100 + (dex * 2),
        Strength: str,
        Dexterity: dex,
        Intellect: int,
        Defense: cfg.equipment.shield ? 15 : (cfg.equipment.helm ? 5 : 0) + (cfg.equipment.shoulders ? 5 : 0)
    };
};

const EQUIPMENT_SLOTS = [
    // Center Top
    { id: 'helm', type: 'helm', icon: '⛑️', label: 'Helm', style: { top: '2%', left: '50%', transform: 'translateX(-50%)' } },
    
    // Left Column
    { id: 'shoulder', type: 'shoulders', icon: '🛡️', label: 'Shoulder', style: { top: '15%', left: '12px' } },
    { id: 'torso', type: 'shirt', icon: '👕', label: 'Torso', style: { top: '27%', left: '12px' } },
    { id: 'legs', type: 'pants', icon: '👖', label: 'Legs', style: { top: '39%', left: '12px' } },
    { id: 'boots', type: 'shoes', icon: '👢', label: 'Boots', style: { top: '51%', left: '12px' } },
    { id: 'mount', type: 'mount', icon: '🐎', label: 'Mount', style: { top: '63%', left: '12px' } },

    // Right Column
    { id: 'amulet', type: 'amulet', icon: '📿', label: 'Amulet', style: { top: '15%', right: '12px' }, tooltipSide: 'left' },
    { id: 'gloves', type: 'gloves', icon: '🧤', label: 'Gloves', style: { top: '27%', right: '12px' }, tooltipSide: 'left' },
    { id: 'ring1', type: 'ring', icon: '💍', label: 'Ring', style: { top: '39%', right: '12px' }, tooltipSide: 'left' },
    { id: 'ring2', type: 'ring', icon: '💍', label: 'Ring', style: { top: '51%', right: '12px' }, tooltipSide: 'left' },
    { id: 'focus', type: 'focus', icon: '🔮', label: 'Focus', style: { top: '63%', right: '12px' }, tooltipSide: 'left' },
];

const ITEM_TO_SLOT_MAP: Record<string, string> = {
    'Shirt': 'torso',
    'Pants': 'legs',
    'Shoes': 'boots',
};

export const InventoryModal: React.FC<InventoryModalProps> = ({ 
    isOpen, onClose, config, inventory, equipmentSlots, onEquip, onInventoryChange, onEquipItem, onUnequipItem, coins 
}) => {
    const [activeTab, setActiveTab] = useState('Equipment');
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [draggedItem, setDraggedItem] = useState<string | null>(null);
    
    if (!isOpen) return null;

    const stats = getStats(config);

    // --- Drag & Drop Handlers ---
    const handleDragStart = (e: React.DragEvent, index: number, item: string) => {
        setDraggedIndex(index);
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
        // Hide ghost image if desired or set custom one
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === targetIndex) return;

        const newInv = [...inventory];
        // Swap
        const temp = newInv[draggedIndex];
        newInv[draggedIndex] = newInv[targetIndex];
        newInv[targetIndex] = temp;
        
        onInventoryChange(newInv);
        setDraggedIndex(null);
        setDraggedItem(null);
    };

    const handleDropOnEquip = (e: React.DragEvent, slotId: string) => {
        e.preventDefault();
        if (!draggedItem) return;

        // Verify compatibility
        const validSlot = ITEM_TO_SLOT_MAP[draggedItem];
        if (validSlot === slotId) {
            onEquipItem(draggedItem, slotId);
            
            // Remove from inventory
            if (draggedIndex !== null) {
                const newInv = [...inventory];
                newInv[draggedIndex] = ''; // Clear slot
                onInventoryChange(newInv);
            }
        }
        
        setDraggedIndex(null);
        setDraggedItem(null);
    };

    const handleRightClickItem = (e: React.MouseEvent, item: string, index: number) => {
        e.preventDefault();
        const targetSlot = ITEM_TO_SLOT_MAP[item];
        if (targetSlot) {
            onEquipItem(item, targetSlot);
            const newInv = [...inventory];
            newInv[index] = '';
            onInventoryChange(newInv);
        }
    };

    // --- Slot Renderer ---
    const renderSlot = (index: number, isHotbar: boolean = false) => {
        const item = inventory[index];
        return (
            <div 
                key={index}
                draggable={!!item}
                onDragStart={(e) => item && handleDragStart(e, index, item)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                onClick={() => item ? onEquip(index) : null}
                onContextMenu={(e) => item ? handleRightClickItem(e, item, index) : e.preventDefault()}
                className={`aspect-square rounded-lg border-2 flex items-center justify-center relative group cursor-pointer transition-all ${
                    item 
                    ? 'bg-slate-700 border-slate-500 hover:border-blue-400 hover:bg-slate-600' 
                    : 'bg-slate-800/50 border-slate-700 border-dashed hover:bg-slate-800'
                } ${isHotbar ? 'border-slate-500/50' : ''}`}
            >
                {item && (
                    <>
                        <span className="text-2xl drop-shadow-md group-hover:scale-110 transition-transform">
                            {ITEM_ICONS[item] || '📦'}
                        </span>
                    </>
                )}
                {isHotbar && (
                    <span className="absolute bottom-1 right-1 text-[8px] font-bold px-1 rounded text-blue-300 bg-blue-900/40">
                        {index + 1}
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
            {/* Modal Container */}
            <div className="flex w-[850px] h-[600px] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden relative">
                
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 text-slate-400 hover:text-white transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                {/* LEFT: Character Preview & Stats */}
                <div className="w-1/3 bg-slate-800 border-r border-slate-700 flex flex-col relative">
                    {/* Background Light Effect */}
                    <div className="absolute inset-0 bg-radial-gradient from-slate-700/50 to-slate-900/90 pointer-events-none" />
                    
                    <div className="flex-1 relative overflow-hidden group">
                        <PlayerPreview config={config} />
                        
                        {/* Equipment Overlay Slots */}
                        {EQUIPMENT_SLOTS.map((slot) => {
                            // Check explicit equipment state or config override
                            const equippedItem = equipmentSlots[slot.id];
                            const isEquipped = !!equippedItem || config.equipment[slot.type as keyof typeof config.equipment];
                            
                            const tooltipPosClass = (slot as any).tooltipSide === 'left' 
                                ? 'right-full mr-2' 
                                : 'left-full ml-2';
                            
                            return (
                                <div 
                                    key={slot.id}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDropOnEquip(e, slot.id)}
                                    onClick={() => equippedItem ? onUnequipItem(slot.id) : null}
                                    className={`absolute w-10 h-10 rounded border border-slate-600 flex items-center justify-center transition-all cursor-pointer hover:border-blue-400 group/slot z-20 ${isEquipped ? 'bg-slate-700/80 border-blue-500/50' : 'bg-black/40'}`}
                                    style={slot.style}
                                    title={equippedItem || slot.label}
                                >
                                    <span className={`text-lg drop-shadow-md transition-opacity ${isEquipped ? 'opacity-100 grayscale-0' : 'opacity-40 grayscale'}`}>
                                        {equippedItem ? (ITEM_ICONS[equippedItem] || slot.icon) : slot.icon}
                                    </span>
                                    {/* Tooltip */}
                                    <div className={`absolute ${tooltipPosClass} top-1/2 -translate-y-1/2 px-2 py-1 bg-black/90 text-white text-[10px] font-bold rounded opacity-0 group-hover/slot:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-30`}>
                                        {equippedItem || slot.label}
                                    </div>
                                    {/* Active Glow */}
                                    {isEquipped && <div className="absolute inset-0 rounded shadow-[0_0_10px_rgba(59,130,246,0.3)] animate-pulse" />}
                                </div>
                            );
                        })}

                        {/* Character Info Overlay - Moved to bottom */}
                        <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent flex flex-col items-center justify-end h-1/3 pointer-events-none">
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter drop-shadow-xl">Hero</h2>
                            <div className="flex items-center gap-2 mt-1 opacity-80">
                                <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
                                <p className="text-[10px] text-blue-200 font-bold uppercase tracking-[0.2em]">
                                    {config.bodyVariant} {config.bodyType}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Stats Panel */}
                    <div className="p-5 bg-slate-900/95 border-t border-slate-700 relative z-10 backdrop-blur-sm shadow-[0_-10px_20px_rgba(0,0,0,0.3)]">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Attributes</h3>
                            <span className="text-[10px] font-bold text-green-400 bg-green-900/20 border border-green-900/50 px-2 py-0.5 rounded">Lvl 5</span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-6">
                            {Object.entries(stats).map(([key, val]) => (
                                key !== 'Level' && (
                                    <div key={key} className="flex justify-between items-center text-xs group">
                                        <span className="text-slate-400 font-medium group-hover:text-slate-300 transition-colors">{key}</span>
                                        <span className="font-bold text-slate-200">{val}</span>
                                    </div>
                                )
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT: Inventory Grid */}
                <div className="w-2/3 flex flex-col bg-slate-900/95">
                    
                    {/* Tabs */}
                    <div className="flex border-b border-slate-700 bg-slate-900">
                        {TABS.map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors ${
                                    activeTab === tab 
                                    ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-500' 
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Main Grid Area (Scrollable) */}
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-slate-900/50">
                        {activeTab === 'Equipment' ? (
                            <div className="grid grid-cols-5 gap-3">
                                {/* Render Main Storage (Indices 8 to 31 = 24 slots) */}
                                {Array.from({ length: 24 }).map((_, i) => renderSlot(i + 8))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-5 gap-3">
                                {Array.from({ length: 25 }).map((_, i) => (
                                    <div key={i} className="aspect-square rounded-lg border-2 border-slate-800 bg-slate-900/50 border-dashed opacity-30" />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick Access Bar (Hotbar 0-7) */}
                    <div className="bg-slate-800/90 border-t border-slate-700 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.2)] z-10">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                Quick Access
                            </span>
                        </div>
                        <div className="grid grid-cols-8 gap-2">
                            {Array.from({ length: 8 }).map((_, i) => renderSlot(i, true))}
                        </div>
                    </div>

                    {/* Footer / Coins */}
                    <div className="px-6 py-3 border-t border-slate-700 flex justify-between items-center bg-slate-800">
                        <div className="text-[10px] text-slate-500 font-medium tracking-tight">
                            Drag & Drop to organize • Right-click to Equip
                        </div>
                        <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-slate-600/50 shadow-inner">
                            <span className="text-yellow-400 text-sm">🪙</span>
                            <span className="text-white font-bold font-mono text-sm tracking-tight">{coins.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
