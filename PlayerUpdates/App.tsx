import React, { useState, useEffect } from 'react';
import Scene from './components/Scene';
import { PlayerConfig, PlayerInput, DEFAULT_CONFIG } from './types';
import { Header } from './components/ui/Header';
import { InteractionOverlay } from './components/ui/InteractionOverlay';
import { Hotbar } from './components/ui/Hotbar';
import { ControlPanel } from './components/ui/ControlPanel';

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
  
  // Initialize inventory with items in specific slots (1-indexed 2, 3, 4 -> 0-indexed 1, 2, 3)
  const [inventory, setInventory] = useState<string[]>(() => {
    const inv = Array(8).fill('');
    inv[1] = 'Axe';
    inv[2] = 'Sword';
    inv[3] = 'Pickaxe';
    inv[4] = 'Knife';
    return inv;
  });
  
  const [selectedSlot, setSelectedSlot] = useState<number>(0);
  const [isDeadUI, setIsDeadUI] = useState(false);
  
  // Interaction UI
  const [interactionText, setInteractionText] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

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
        />
      </div>

      <Header />
      
      <InteractionOverlay 
        text={interactionText} 
        progress={progress} 
      />

      <Hotbar 
        inventory={inventory} 
        selectedSlot={selectedSlot} 
        onSelectSlot={setSelectedSlot} 
      />

      <ControlPanel 
        config={config}
        manualInput={manualInput}
        isDeadUI={isDeadUI}
        setConfig={setConfig}
        setManualInput={setManualInput}
        handleDeathToggle={handleDeathToggle}
        triggerAction={triggerAction}
      />
    </div>
  );
};

export default App;