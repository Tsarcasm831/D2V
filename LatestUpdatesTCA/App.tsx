
import React, { useState, useEffect, useRef } from 'react';
import Scene from './components/Scene';
import { PlayerConfig, PlayerInput, DEFAULT_CONFIG } from './types';
import { Header } from './components/ui/Header';
import { InteractionOverlay } from './components/ui/InteractionOverlay';
import { Hotbar } from './components/ui/Hotbar';
import { ControlPanel } from './components/ui/ControlPanel';
import { InventoryModal } from './components/ui/InventoryModal';
import { ModelExporter } from './game/ModelExporter';
import { Game } from './game/Game';

const App: React.FC = () => {
  const [config, setConfig] = useState<PlayerConfig>(DEFAULT_CONFIG);
  const [manualInput, setManualInput] = useState<Partial<PlayerInput>>({
    isRunning: false,
    jump: false,
    isDead: false,
    isPickingUp: false,
    interact: false,
    attack1: false,
    attack2: false
  });
  
  // Initialize inventory with items (Capacity 32)
  const [inventory, setInventory] = useState<string[]>(() => {
    const inv = Array(32).fill('');
    // Initial Hotbar
    inv[1] = 'Axe';
    inv[2] = 'Sword';
    inv[3] = 'Pickaxe';
    inv[4] = 'Knife';
    inv[5] = 'Fishing Pole';
    // Add Clothing
    inv[8] = 'Shirt';
    inv[9] = 'Pants';
    inv[10] = 'Shoes';
    return inv;
  });
  
  // Track specific items in equipment slots
  const [equipmentSlots, setEquipmentSlots] = useState<Record<string, string | null>>({
      helm: null,
      shoulder: null,
      torso: null,
      legs: null,
      boots: null,
      mount: null,
      amulet: null,
      gloves: null,
      ring1: null,
      ring2: null,
      focus: null
  });

  const [selectedSlot, setSelectedSlot] = useState<number>(0);
  const [isDeadUI, setIsDeadUI] = useState(false);
  
  // Interaction UI
  const [interactionText, setInteractionText] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  // Economy & UI State
  const [coins, setCoins] = useState(1250);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);

  const gameRef = useRef<Game | null>(null);

  const handleExport = () => {
      if (gameRef.current) {
          ModelExporter.exportAndDownloadZip(gameRef.current['player']);
      }
  };

  // Sync selected item to config for the model to render
  useEffect(() => {
    const itemName = inventory[selectedSlot] || null;
    setConfig(prev => ({ ...prev, selectedItem: itemName }));
  }, [selectedSlot, inventory]);

  const triggerAction = (key: keyof PlayerInput) => {
    setManualInput(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
        setManualInput(prev => ({ ...prev, [key]: false }));
    }, 100);
  };

  const handleDeathToggle = () => {
      triggerAction('isDead');
      setIsDeadUI(prev => !prev);
  };

  const handleInteractionUpdate = (text: string | null, prog: number | null) => {
      setInteractionText(text);
      setProgress(prog);
  };

  const toggleInventory = () => {
      setIsInventoryOpen(prev => !prev);
  };

  // --- Equipment Logic ---
  const handleEquipItem = (item: string, slotId: string) => {
      // 1. Check if slot is already occupied
      const existing = equipmentSlots[slotId];
      let newInv = [...inventory];
      
      // If there was an item, swap it back to inventory (find first empty or just push)
      if (existing) {
          const emptyIdx = newInv.findIndex(s => s === '');
          if (emptyIdx !== -1) newInv[emptyIdx] = existing;
      }

      setEquipmentSlots(prev => ({ ...prev, [slotId]: item }));
      
      // Update inventory (removal is handled by the caller usually, but if this is logic only, we assume caller handles removal or we pass inventory)
      // Actually, standard practice: Logic here should handle state completely or purely update slots.
      // In InventoryModal, we removed the item from inventory array already.
      
      // Update Model Visibility Config based on slot
      setConfig(prev => {
          const next = { ...prev };
          const eq = { ...prev.equipment };
          
          if (slotId === 'torso') eq.shirt = true;
          if (slotId === 'legs') eq.pants = true;
          if (slotId === 'boots') eq.shoes = true;
          if (slotId === 'helm') eq.helm = true;
          if (slotId === 'shoulder') eq.shoulders = true;
          
          next.equipment = eq;
          return next;
      });
  };

  const handleUnequipItem = (slotId: string) => {
      const item = equipmentSlots[slotId];
      if (!item) return;

      // Move to inventory
      const newInv = [...inventory];
      const emptyIdx = newInv.findIndex(s => s === '');
      if (emptyIdx !== -1) {
          newInv[emptyIdx] = item;
          setInventory(newInv);
          
          setEquipmentSlots(prev => ({ ...prev, [slotId]: null }));
          
          // Update Config
          setConfig(prev => {
              const next = { ...prev };
              const eq = { ...prev.equipment };
              
              if (slotId === 'torso') eq.shirt = false;
              if (slotId === 'legs') eq.pants = false;
              if (slotId === 'boots') eq.shoes = false;
              if (slotId === 'helm') eq.helm = false;
              if (slotId === 'shoulder') eq.shoulders = false;
              
              next.equipment = eq;
              return next;
          });
      } else {
          alert("Inventory Full!");
      }
  };

  return (
    <div className="w-screen h-screen relative bg-gray-900 overflow-hidden font-sans">
      {/* 3D Scene Container */}
      <div className="absolute inset-0 z-0">
        <Scene 
          config={config} 
          manualInput={manualInput} 
          initialInventory={inventory}
          onInventoryUpdate={setInventory} 
          onSlotSelect={setSelectedSlot} 
          onInteractionUpdate={handleInteractionUpdate}
          onGameReady={(g) => {
              gameRef.current = g;
              // Bind the inventory toggle from InputManager to App state
              g['inputManager'].onToggleInventory = toggleInventory;
          }}
          controlsDisabled={isInventoryOpen}
        />
      </div>

      {!isInventoryOpen && <Header />}
      
      <InteractionOverlay 
        text={interactionText} 
        progress={progress} 
      />

      {!isInventoryOpen && (
          <Hotbar 
            inventory={inventory} 
            selectedSlot={selectedSlot} 
            onSelectSlot={setSelectedSlot} 
          />
      )}

      {!isInventoryOpen && (
          <ControlPanel 
            config={config}
            manualInput={manualInput}
            isDeadUI={isDeadUI}
            setConfig={setConfig}
            setManualInput={setManualInput}
            handleDeathToggle={handleDeathToggle}
            triggerAction={triggerAction}
            onExport={handleExport}
          />
      )}

      <InventoryModal 
          isOpen={isInventoryOpen}
          onClose={() => setIsInventoryOpen(false)}
          config={config}
          inventory={inventory}
          equipmentSlots={equipmentSlots}
          onEquip={setSelectedSlot}
          onInventoryChange={setInventory}
          onEquipItem={handleEquipItem}
          onUnequipItem={handleUnequipItem}
          coins={coins}
      />
    </div>
  );
};

export default App;
