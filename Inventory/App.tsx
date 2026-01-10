
import React, { useState } from 'react';
import { Item, SlotType, ItemRarity } from './types';
import { INITIAL_ITEMS, QUEST_ITEMS, GEM_ITEMS, INVENTORY_COLS, INVENTORY_ROWS } from './constants';
import EquipSlot from './components/EquipSlot';
import Tooltip from './components/Tooltip';
import { generateItemLore } from './services/geminiService';

type ActiveTab = 'GENERAL' | 'QUEST ITEMS' | 'GEMS';
type SortOption = 'NAME' | 'TYPE' | 'RARITY';

type LeftTab = 'EQUIPPED' | 'ATTRIBUTES';

const App: React.FC = () => {
  const [items, setItems] = useState<Item[]>(INITIAL_ITEMS);
  const [inventoryIds, setInventoryIds] = useState<string[]>(INITIAL_ITEMS.map(i => i.id));
  const [equipped, setEquipped] = useState<Record<string, string | null>>({
    [SlotType.HELMET]: null,
    [SlotType.BODY]: null,
    [SlotType.GLOVES]: null,
    [SlotType.BOOTS]: null,
    [SlotType.BELT]: null,
    [SlotType.SUMMON]: null,
    [SlotType.RESONANT]: null,
    'RING_1': null,
    'RING_2': null,
    'AMULET': null,
    [SlotType.WEAPON_MAIN]: null,
    [SlotType.WEAPON_OFF]: null,
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('GENERAL');
  const [leftTab, setLeftTab] = useState<LeftTab>('EQUIPPED');
  const [hoveredItem, setHoveredItem] = useState<{item: any, x: number, y: number} | null>(null);

  // Styling constants reused for Inventory and Hotbar
  const borderColor = "bg-[#5c4d3c]"; // The color of the lines
  const gridOuterContainerClass = `relative p-[1px] ${borderColor} shadow-[0_0_20px_rgba(0,0,0,0.8)] select-none`;
  // Updated cellClass to be fluid
  const cellClass = "relative group w-full aspect-square bg-[#0a0a0a] transition-colors duration-75 flex items-center justify-center shadow-[inset_0_0_6px_rgba(0,0,0,0.8)] hover:bg-[#111]";

  const getItemById = (id: string | null) => {
    if (!id) return null;
    return items.find(i => i.id === id) || null;
  };

  const handleMouseEnter = (e: React.MouseEvent, item: any) => {
    setHoveredItem({ item, x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };

  const handleEquip = (itemId: string) => {
    const item = getItemById(itemId);
    if (!item) return;

    let targetSlot: string | null = null;
    const type = item.type;

    if (type === 'Helmet') targetSlot = SlotType.HELMET;
    else if (type === 'Body Armour') targetSlot = SlotType.BODY;
    else if (type === 'Gloves') targetSlot = SlotType.GLOVES;
    else if (type === 'Boots') targetSlot = SlotType.BOOTS;
    else if (['Staff', 'Sword', 'Bow', 'Axe', 'Mace'].includes(type)) targetSlot = SlotType.WEAPON_MAIN;
    else if (type === 'Shield') targetSlot = SlotType.WEAPON_OFF;
    else if (type === 'Belt') targetSlot = SlotType.BELT;
    else if (type === 'Ring') targetSlot = !equipped['RING_1'] ? 'RING_1' : 'RING_2';
    else if (type === 'Amulet') targetSlot = 'AMULET';
    else if (type === 'Summon') targetSlot = SlotType.SUMMON;
    else if (type === 'Resonant Object') targetSlot = SlotType.RESONANT;
    
    // Flasks cannot be equipped as slots are removed

    if (targetSlot) {
      const currentlyEquippedId = equipped[targetSlot];
      setEquipped(prev => ({ ...prev, [targetSlot!]: itemId }));
      setInventoryIds(prev => {
        const filtered = prev.filter(id => id !== itemId);
        return currentlyEquippedId ? [...filtered, currentlyEquippedId] : filtered;
      });
      if (item.rarity === 'Unique' && !item.lore) {
        handleGenerateLore(item);
      }
    }
  };

  const handleUnequip = (slot: string) => {
    const itemId = equipped[slot];
    if (!itemId) return;

    setEquipped(prev => ({ ...prev, [slot]: null }));
    setInventoryIds(prev => [...prev, itemId]);
  };

  const handleSort = (type: SortOption) => {
    const sortedIds = [...inventoryIds].sort((aId, bId) => {
      const itemA = getItemById(aId);
      const itemB = getItemById(bId);
      
      if (!itemA && !itemB) return 0;
      if (!itemA) return 1;
      if (!itemB) return -1;

      if (type === 'NAME') {
        return itemA.name.localeCompare(itemB.name);
      } else if (type === 'TYPE') {
        const typeCompare = itemA.type.localeCompare(itemB.type);
        if (typeCompare !== 0) return typeCompare;
        return itemA.name.localeCompare(itemB.name);
      } else if (type === 'RARITY') {
        const rarityOrder = {
          [ItemRarity.UNIQUE]: 0,
          [ItemRarity.RARE]: 1,
          [ItemRarity.MAGIC]: 2,
          [ItemRarity.NORMAL]: 3
        };
        const valA = rarityOrder[itemA.rarity] ?? 99;
        const valB = rarityOrder[itemB.rarity] ?? 99;
        if (valA !== valB) return valA - valB;
        return itemA.name.localeCompare(itemB.name);
      }
      return 0;
    });
    setInventoryIds(sortedIds);
  };

  const handleGenerateLore = async (item: Item) => {
    if (item.lore) return;
    const lore = await generateItemLore(item.name, item.type);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, lore } : i));
  };

  const renderInventoryContent = () => {
    // Grid Class uses gap-px
    const gridClass = `grid grid-cols-7 gap-[1px] ${borderColor}`; 
    
    // Max Width Logic: 7 columns. If we want approx 60px per cell max: 420px. 65px: 455px.
    const containerClass = `animate-fade-in ${gridOuterContainerClass} w-full max-w-[420px] 2xl:max-w-[480px] mx-auto transition-all duration-300`;

    const getRarityGlow = (rarity?: ItemRarity) => {
      switch (rarity) {
        case ItemRarity.UNIQUE: return 'bg-[radial-gradient(circle_at_center,_rgba(194,65,12,0.15)_0%,_transparent_70%)]';
        case ItemRarity.RARE: return 'bg-[radial-gradient(circle_at_center,_rgba(234,179,8,0.15)_0%,_transparent_70%)]';
        case ItemRarity.MAGIC: return 'bg-[radial-gradient(circle_at_center,_rgba(37,99,235,0.15)_0%,_transparent_70%)]';
        default: return '';
      }
    };

    const TOTAL_SLOTS = INVENTORY_ROWS * INVENTORY_COLS;

    if (activeTab === 'QUEST ITEMS') {
      return (
        <div className={containerClass}>
          <div className={gridClass}>
            {QUEST_ITEMS.map(questItem => (
              <div 
                key={questItem.id} 
                className={cellClass}
                onMouseEnter={(e) => handleMouseEnter(e, questItem)}
                onMouseLeave={handleMouseLeave}
              >
                <div className="w-full h-full p-2 relative z-10">
                   <img src={questItem.icon} className="w-full h-full object-contain transition-transform group-hover:scale-110 drop-shadow-md" />
                </div>
              </div>
            ))}
            {Array.from({ length: Math.max(0, TOTAL_SLOTS - QUEST_ITEMS.length) }).map((_, i) => (
                <div key={`empty-${i}`} className={cellClass}>
                     <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)] pointer-events-none"></div>
                </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeTab === 'GEMS') {
      return (
        <div className={containerClass}>
          <div className={gridClass}>
            {GEM_ITEMS.map(gem => (
              <div 
                key={gem.id} 
                className={cellClass}
                onMouseEnter={(e) => handleMouseEnter(e, gem)}
                onMouseLeave={handleMouseLeave}
              >
                 <div className="w-full h-full p-2 relative z-10">
                    <img src={gem.icon} className="w-full h-full object-contain transition-transform group-hover:scale-110 brightness-110 drop-shadow-md" />
                 </div>
              </div>
            ))}
             {Array.from({ length: Math.max(0, TOTAL_SLOTS - GEM_ITEMS.length) }).map((_, i) => (
                <div key={`empty-${i}`} className={cellClass}>
                     <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)] pointer-events-none"></div>
                </div>
            ))}
          </div>
        </div>
      );
    }

    // General Items
    return (
      <div className={containerClass}>
        <div className={gridClass}>
          {Array.from({ length: TOTAL_SLOTS }).map((_, idx) => {
            const itemId = inventoryIds[idx];
            const item = getItemById(itemId);
            return (
              <div 
                key={idx}
                className={`${cellClass} ${item ? getRarityGlow(item.rarity) : ''}`}
              >
                {!item && (
                   <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)] pointer-events-none"></div>
                )}

                {item && (
                  <div 
                    className="absolute inset-0 z-10 p-[10%] cursor-pointer" // Percentage padding for responsive icons
                    onMouseEnter={(e) => handleMouseEnter(e, item)}
                    onMouseLeave={handleMouseLeave}
                    onDoubleClick={() => handleEquip(item.id)}
                  >
                    <img src={item.icon} className="w-full h-full object-contain rounded-sm saturate-[0.85] group-hover:saturate-100 transition-all drop-shadow-lg" />
                    
                    {/* Rarity Indicator */}
                    <div className={`absolute bottom-0 right-0 w-[15%] h-[15%] ${
                      item.rarity === 'Unique' ? 'bg-orange-600 shadow-[0_0_5px_#ea580c]' : 
                      item.rarity === 'Rare' ? 'bg-yellow-500 shadow-[0_0_5px_#eab308]' : 
                      item.rarity === 'Magic' ? 'bg-blue-600 shadow-[0_0_5px_#2563eb]' : 'bg-transparent'
                    }`} style={{clipPath: 'polygon(100% 0, 0% 100%, 100% 100%)'}} />
                  </div>
                )}
                
                {/* Hover Selection Border */}
                <div className="absolute inset-0 border border-white/0 group-hover:border-[#c8aa6e]/50 pointer-events-none transition-colors duration-75 z-20" />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderHotbar = () => {
    // 8 columns vs 7 columns. To keep cells roughly same visual size, max width should be approx 8/7 of inventory max width.
    // Inventory: 420px -> 60px/cell
    // Hotbar: 8 * 60 = 480px.
    // 2xl: 480px -> ~68px/cell. Hotbar: 8 * 68 = 544px.
    const hotbarContainerClass = `mt-6 flex flex-col items-center animate-fade-in w-full max-w-[480px] 2xl:max-w-[550px] mx-auto transition-all duration-300`;

    return (
      <div className={hotbarContainerClass}>
         {/* Separator / Title */}
         <div className="w-full flex items-center gap-2 mb-2 opacity-60">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#5c4d3c] to-transparent"></div>
            <span className="text-[10px] font-cinzel text-[#8c7648] tracking-widest uppercase">Quick Access</span>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#5c4d3c] to-transparent"></div>
         </div>
         
         <div className={`${gridOuterContainerClass} w-full`}>
            <div className={`grid grid-cols-8 gap-[1px] ${borderColor}`}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={`hotbar-${i}`} className={cellClass}>
                  {/* Hotkey Indicator */}
                  <div className="absolute top-[5%] left-[5%] text-[15%] font-cinzel text-[#555] font-bold z-10 group-hover:text-[#888]">{i + 1}</div>
                  
                  {/* Empty Texture */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)] pointer-events-none"></div>
                  
                  {/* Hover Effect */}
                  <div className="absolute inset-0 border border-white/0 group-hover:border-[#c8aa6e]/30 pointer-events-none transition-colors duration-75 z-20" />
                </div>
              ))}
            </div>
         </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center p-4 bg-[#050505] relative overflow-hidden">
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden select-none">
         <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1a1a1a_0%,_#050505_80%)]" />
         <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-80" />
      </div>

      {/* Main Container */}
      <div className="relative w-full max-w-[1080px] h-[88vh] flex flex-col bg-[#0a0a0a] border border-[#2a221a] shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-[2px] overflow-hidden z-10 animate-fade-in ring-1 ring-[#1a1a1a] ring-offset-0">
        
        {/* Window Header */}
        <div className="relative h-12 w-full flex items-center justify-between px-6 bg-[#0f0f0f] border-b border-[#2a221a] shrink-0 select-none">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#2a221a]" />
            <h1 className="font-cinzel text-lg text-[#c8aa6e] tracking-[0.15em] font-semibold drop-shadow-sm">
              INVENTORY
            </h1>
          </div>
          <div className="flex items-center gap-4 text-[#4a3f32] text-[10px] font-cinzel">
             <span>CHARACTER_ID: <span className="text-[#665c4e]">X7-AEGIS</span></span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
            
            {/* LEFT: Equipment & Character Sheet */}
            <div className="flex-[1.4] flex flex-col bg-[#0c0c0c] border-r border-[#1f1a14] relative">
              
              {/* Texture Background */}
              <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] bg-repeat" />
              
              {/* Left Pane Tab Bar */}
              <div className="flex h-10 border-b border-[#1f1a14] bg-[#0c0c0c] px-3 items-end gap-1 z-30">
                {(['EQUIPPED', 'ATTRIBUTES'] as LeftTab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setLeftTab(tab)}
                    className={`text-[10px] font-cinzel font-bold tracking-wider px-4 py-2 transition-all relative ${
                      leftTab === tab
                        ? 'text-[#c8aa6e] bg-[#141414] border-t border-x border-[#2a221a] rounded-t-sm -mb-[1px] z-10'
                        : 'text-neutral-500 hover:text-neutral-300 hover:bg-[#111]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              
              {leftTab === 'EQUIPPED' && (
                <div className="flex-1 flex flex-col items-center justify-center relative min-h-0 overflow-hidden animate-fade-in">
                  {/* Silhouette behind equipment */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02]">
                      <svg className="h-[80%]" viewBox="0 0 100 200" fill="#ffffff">
                        <path d="M50 10 C 65 10, 75 25, 75 40 C 75 55, 65 65, 50 65 C 35 65, 25 55, 25 40 C 25 25, 35 10, 50 10 Z M 20 70 L 80 70 L 90 120 L 80 140 L 50 140 L 20 140 L 10 120 Z M 30 145 L 70 145 L 75 190 L 25 190 Z" />
                      </svg>
                  </div>

                  <div className="relative z-10 flex gap-6 xl:gap-8 items-center justify-center">
                      {/* Paper Doll */}
                      <div className="flex flex-col items-center gap-2 transform scale-[0.85] lg:scale-100 origin-center transition-transform duration-300">
                          
                          {/* Row 1: Helm/Amulet/Trinket */}
                          <div className="flex items-end justify-center gap-4 mb-1">
                              <EquipSlot 
                                  slotType="AMULET"
                                  item={getItemById(equipped['AMULET'])}
                                  className="w-10 h-10 rounded-full mb-1"
                                  label="Neck"
                                  onMouseEnter={handleMouseEnter}
                                  onMouseLeave={handleMouseLeave}
                                  onDoubleClick={() => handleUnequip('AMULET')}
                              />
                              <EquipSlot 
                                  slotType={SlotType.HELMET}
                                  item={getItemById(equipped[SlotType.HELMET])}
                                  className="w-16 h-16"
                                  label="Head"
                                  onMouseEnter={handleMouseEnter}
                                  onMouseLeave={handleMouseLeave}
                                  onDoubleClick={() => handleUnequip(SlotType.HELMET)}
                              />
                              <EquipSlot 
                                  slotType="TRINKET"
                                  className="w-10 h-10 rounded-full mb-1"
                                  label="Relic"
                                  onMouseEnter={handleMouseEnter}
                                  onMouseLeave={handleMouseLeave}
                              />
                          </div>

                          {/* Row 2: Main Gear Block */}
                          <div className="flex items-start gap-3">
                              
                              {/* Main Hand - Left of Hands */}
                              <div className="pt-2">
                                  <EquipSlot 
                                      slotType={SlotType.WEAPON_MAIN}
                                      item={getItemById(equipped[SlotType.WEAPON_MAIN])}
                                      className="w-20 h-40"
                                      label="Main Hand"
                                      onMouseEnter={handleMouseEnter}
                                      onMouseLeave={handleMouseLeave}
                                      onDoubleClick={() => handleUnequip(SlotType.WEAPON_MAIN)}
                                  />
                              </div>

                              {/* Center Column: Arms, Body, Belt */}
                              <div className="flex flex-col items-center gap-2">
                                  <div className="flex items-start gap-3">
                                      {/* Left Arm */}
                                      <div className="flex flex-col gap-3 items-end pt-2">
                                          <EquipSlot 
                                              slotType="RING_1"
                                              item={getItemById(equipped['RING_1'])}
                                              className="w-10 h-10"
                                              label="Ring"
                                              onMouseEnter={handleMouseEnter}
                                              onMouseLeave={handleMouseLeave}
                                              onDoubleClick={() => handleUnequip('RING_1')}
                                          />
                                          <EquipSlot 
                                              slotType={SlotType.GLOVES}
                                              item={getItemById(equipped[SlotType.GLOVES])}
                                              className="w-16 h-16"
                                              label="Hands"
                                              onMouseEnter={handleMouseEnter}
                                              onMouseLeave={handleMouseLeave}
                                              onDoubleClick={() => handleUnequip(SlotType.GLOVES)}
                                          />
                                          <EquipSlot 
                                              slotType={SlotType.SUMMON}
                                              item={getItemById(equipped[SlotType.SUMMON])}
                                              className="w-12 h-12 rounded-full"
                                              label="Summon"
                                              onMouseEnter={handleMouseEnter}
                                              onMouseLeave={handleMouseLeave}
                                              onDoubleClick={() => handleUnequip(SlotType.SUMMON)}
                                          />
                                      </div>

                                      {/* Body */}
                                      <EquipSlot 
                                          slotType={SlotType.BODY}
                                          item={getItemById(equipped[SlotType.BODY])}
                                          className="w-28 h-40"
                                          label="Torso"
                                          onMouseEnter={handleMouseEnter}
                                          onMouseLeave={handleMouseLeave}
                                          onDoubleClick={() => handleUnequip(SlotType.BODY)}
                                      />

                                      {/* Right Arm */}
                                      <div className="flex flex-col gap-3 items-start pt-2">
                                          <EquipSlot 
                                              slotType="RING_2"
                                              item={getItemById(equipped['RING_2'])}
                                              className="w-10 h-10"
                                              label="Ring"
                                              onMouseEnter={handleMouseEnter}
                                              onMouseLeave={handleMouseLeave}
                                              onDoubleClick={() => handleUnequip('RING_2')}
                                          />
                                          <EquipSlot 
                                              slotType={SlotType.BOOTS}
                                              item={getItemById(equipped[SlotType.BOOTS])}
                                              className="w-16 h-16"
                                              label="Feet"
                                              onMouseEnter={handleMouseEnter}
                                              onMouseLeave={handleMouseLeave}
                                              onDoubleClick={() => handleUnequip(SlotType.BOOTS)}
                                          />
                                          <EquipSlot 
                                              slotType={SlotType.RESONANT}
                                              item={getItemById(equipped[SlotType.RESONANT])}
                                              className="w-12 h-12 rounded-full"
                                              label="Resonant"
                                              onMouseEnter={handleMouseEnter}
                                              onMouseLeave={handleMouseLeave}
                                              onDoubleClick={() => handleUnequip(SlotType.RESONANT)}
                                          />
                                      </div>
                                  </div>

                                  {/* Belt */}
                                  <EquipSlot 
                                      slotType={SlotType.BELT}
                                      item={getItemById(equipped[SlotType.BELT])}
                                      className="w-28 h-10"
                                      label="Waist"
                                      onMouseEnter={handleMouseEnter}
                                      onMouseLeave={handleMouseLeave}
                                      onDoubleClick={() => handleUnequip(SlotType.BELT)}
                                  />
                              </div>

                              {/* Off Hand - Right of Boots */}
                              <div className="pt-2">
                                  <EquipSlot 
                                      slotType={SlotType.WEAPON_OFF}
                                      item={getItemById(equipped[SlotType.WEAPON_OFF])}
                                      className="w-20 h-40"
                                      label="Off Hand"
                                      onMouseEnter={handleMouseEnter}
                                      onMouseLeave={handleMouseLeave}
                                      onDoubleClick={() => handleUnequip(SlotType.WEAPON_OFF)}
                                  />
                              </div>
                          </div>
                      </div>
                  </div>
                </div>
              )}

              {/* 2. Lower: Character Stats Panel */}
              {leftTab === 'ATTRIBUTES' && (
                <div className="flex-1 flex flex-col overflow-auto custom-scrollbar animate-fade-in">
                  <div className="relative z-20 bg-[#0a0a0a] border-t border-[#2a221a] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex-1">
                    {/* Decorative Top Border Highlight */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#c8aa6e]/40 to-transparent" />
                    
                    <div className="flex flex-col p-6 gap-6">
                        {/* Header: Name & Class */}
                        <div className="flex justify-between items-end border-b border-[#1f1a14] pb-3">
                            <div>
                                <h2 className="text-2xl font-cinzel text-[#c8aa6e] tracking-wider font-bold drop-shadow-sm leading-none">
                                    KAELTHOS
                                </h2>
                                <div className="flex items-center gap-2 mt-1 opacity-80">
                                    <span className="text-xs font-cinzel text-neutral-400 tracking-[0.2em] uppercase">Level 82</span>
                                    <span className="w-1 h-1 rounded-full bg-[#444]" />
                                    <span className="text-xs font-cinzel text-[#a3a3a3] uppercase">Necromancer</span>
                                    <span className="w-1 h-1 rounded-full bg-[#444]" />
                                    <span className="text-xs font-cinzel text-[#8c7648] uppercase">Lich Lord</span>
                                </div>
                            </div>
                            {/* Emblem */}
                            <div className="w-10 h-10 border border-[#2a221a] bg-[#0f0f0f] flex items-center justify-center opacity-50 rounded-sm">
                                <svg className="w-6 h-6 text-[#555]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2zm0 3.5L18.5 20h-13L12 5.5z"/></svg>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Attributes */}
                            <div className="space-y-1">
                                <h4 className="text-[10px] font-cinzel text-[#666] uppercase tracking-widest mb-2">Attributes</h4>
                                <div className="flex justify-between text-xs font-serif text-[#d1d1d1] border-b border-[#1a1a1a] pb-1">
                                    <span>Strength</span> <span className="text-white">145</span>
                                </div>
                                <div className="flex justify-between text-xs font-serif text-[#d1d1d1] border-b border-[#1a1a1a] pb-1">
                                    <span>Dexterity</span> <span className="text-white">88</span>
                                </div>
                                <div className="flex justify-between text-xs font-serif text-[#60a5fa] border-b border-[#1a1a1a] pb-1">
                                    <span>Intelligence</span> <span className="font-bold">342</span>
                                </div>
                                <div className="flex justify-between text-xs font-serif text-[#d1d1d1] border-b border-[#1a1a1a] pb-1">
                                    <span>Vitality</span> <span className="text-white">215</span>
                                </div>
                                <div className="flex justify-between text-xs font-serif text-[#d1d1d1] border-b border-[#1a1a1a] pb-1">
                                    <span>Luck</span> <span className="text-white">42</span>
                                </div>
                                <div className="flex justify-between text-xs font-serif text-[#d1d1d1] border-b border-[#1a1a1a] pb-1">
                                    <span>Fame</span> <span className="text-[#c8aa6e] font-bold">12,500</span>
                                </div>
                            </div>

                            {/* Defenses */}
                            <div className="space-y-1">
                                <h4 className="text-[10px] font-cinzel text-[#666] uppercase tracking-widest mb-2">Defenses</h4>
                                <div className="flex justify-between text-xs font-serif text-[#d1d1d1] border-b border-[#1a1a1a] pb-1">
                                    <span>Armour</span> <span className="text-white">850</span>
                                </div>
                                <div className="flex justify-between text-xs font-serif text-[#d1d1d1] border-b border-[#1a1a1a] pb-1">
                                    <span>Natural Soak</span> <span className="text-white">18%</span>
                                </div>
                                <div className="flex justify-between text-xs font-serif text-[#d1d1d1] border-b border-[#1a1a1a] pb-1">
                                    <span>Evasion</span> <span className="text-white">420</span>
                                </div>
                                <div className="flex justify-between text-xs font-serif text-[#60a5fa] border-b border-[#1a1a1a] pb-1">
                                    <span>Energy Shield</span> <span className="font-bold">1,250</span>
                                </div>
                            </div>

                            {/* Resistances */}
                            <div className="space-y-1">
                                <h4 className="text-[10px] font-cinzel text-[#666] uppercase tracking-widest mb-2">Resistances</h4>
                                <div className="flex justify-between text-xs font-serif text-[#ef4444] border-b border-[#1a1a1a] pb-1">
                                    <span>Fire</span> <span>75%</span>
                                </div>
                                <div className="flex justify-between text-xs font-serif text-[#3b82f6] border-b border-[#1a1a1a] pb-1">
                                    <span>Water</span> <span>75%</span>
                                </div>
                                <div className="flex justify-between text-xs font-serif text-[#10b981] border-b border-[#1a1a1a] pb-1">
                                    <span>Wind</span> <span>68%</span>
                                </div>
                                <div className="flex justify-between text-xs font-serif text-[#eab308] border-b border-[#1a1a1a] pb-1">
                                    <span>Lightning</span> <span>76%</span>
                                </div>
                                <div className="flex justify-between text-xs font-serif text-[#d97706] border-b border-[#1a1a1a] pb-1">
                                    <span>Earth</span> <span>52%</span>
                                </div>
                                <div className="flex justify-between text-xs font-serif text-[#a855f7] border-b border-[#1a1a1a] pb-1">
                                    <span>Shadow</span> <span>30%</span>
                                </div>
                                <div className="flex justify-between text-xs font-serif text-[#fcd34d] border-b border-[#1a1a1a] pb-1">
                                    <span>Light</span> <span>-15%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: Inventory Pane */}
            <div className="flex-1 flex flex-col bg-[#080808] min-w-[440px]">
                
                {/* Tab Navigation */}
                <div className="flex h-11 border-b border-[#1f1a14] bg-[#0c0c0c] px-4 items-end gap-1">
                    {(['GENERAL', 'QUEST ITEMS', 'GEMS'] as ActiveTab[]).map(tab => (
                        <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`text-[10px] font-cinzel font-bold tracking-wider px-5 py-2.5 transition-all relative ${
                            activeTab === tab 
                            ? 'text-[#c8aa6e] bg-[#141414] border-t border-x border-[#2a221a] rounded-t-sm -mb-[1px] z-10' 
                            : 'text-neutral-500 hover:text-neutral-300 hover:bg-[#111]'
                        }`}
                        >
                        {tab}
                        </button>
                    ))}
                    
                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Sort Controls */}
                    {activeTab === 'GENERAL' && (
                        <div className="flex items-center gap-1 pb-2">
                           {(['NAME', 'TYPE', 'RARITY'] as SortOption[]).map((label) => (
                             <button
                               key={label}
                               onClick={() => handleSort(label)}
                               className="text-[9px] font-cinzel text-neutral-600 hover:text-[#c8aa6e] uppercase px-2 py-1 bg-[#0a0a0a] border border-[#1f1a14] hover:border-[#3a3228] transition-colors rounded-[1px]"
                             >
                               {label}
                             </button>
                           ))}
                        </div>
                    )}
                </div>

                {/* Grid Container */}
                <div className="flex-1 overflow-auto p-6 custom-scrollbar bg-[radial-gradient(circle_at_top,_#0f0f0f_0%,_#050505_100%)]">
                    <div className="w-full min-h-full flex flex-col items-center justify-center">
                        {renderInventoryContent()}
                        
                        {/* Hotbar rendering below the grid */}
                        {renderHotbar()}
                    </div>
                </div>

                {/* Footer Stats Bar */}
                <div className="h-10 border-t border-[#1f1a14] bg-[#0c0c0c] flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-6">
                         <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-yellow-600/50" />
                            <span className="text-neutral-500 font-cinzel text-[10px] uppercase">Gold</span>
                            <span className="text-[#c8aa6e] font-serif text-lg leading-none">8,241</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-600/50" />
                            <span className="text-neutral-500 font-cinzel text-[10px] uppercase">Resonance</span>
                            <span className="text-[#60a5fa] font-serif text-lg leading-none">142</span>
                         </div>
                    </div>
                    <div className="text-[9px] font-cinzel text-[#333] tracking-[0.2em] uppercase">
                       Awaiting Input
                    </div>
                </div>
            </div>
        </div>

        {/* Tooltip render */}
        {hoveredItem && (
          <Tooltip 
            item={hoveredItem.item} 
            x={hoveredItem.x} 
            y={hoveredItem.y} 
          />
        )}
      </div>

      {/* External Footer */}
      <div className="mt-3 flex gap-8 pointer-events-none select-none opacity-30">
         <span className="text-[9px] font-cinzel text-neutral-500 uppercase tracking-[0.2em]">
           Inventory System v1.0.4
         </span>
      </div>
    </div>
  );
};

export default App;
