import React, { useRef, useEffect } from 'react';
import { Game } from '../game/Game';
import { PlayerConfig, PlayerInput } from '../types';

interface SceneProps {
  config: PlayerConfig;
  manualInput: Partial<PlayerInput>;
  initialInventory: string[];
  onInventoryUpdate?: (items: string[]) => void;
  onSlotSelect?: (slotIndex: number) => void;
  onInteractionUpdate?: (text: string | null, progress: number | null) => void;
  onGameReady?: (game: Game) => void;
}

const Scene: React.FC<SceneProps> = ({ config, manualInput, initialInventory, onInventoryUpdate, onSlotSelect, onInteractionUpdate, onGameReady }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Game
    const game = new Game(containerRef.current, config, manualInput, initialInventory);
    gameRef.current = game;
    
    if (onGameReady) onGameReady(game);

    // Hook up callbacks
    game.onInventoryUpdate = onInventoryUpdate;
    game.onInteractionUpdate = onInteractionUpdate;
    if (onSlotSelect) {
        game.setSlotSelectCallback(onSlotSelect);
    }

    game.start();

    const handleResize = () => game.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      game.stop();
    };
  }, []); // Run once on mount

  // Sync props to Game instance
  useEffect(() => {
      const game = gameRef.current;
      if (!game) return;
      game.setConfig(config);
      game.setManualInput(manualInput);
      
      // Update callbacks if they change (though usually they are stable)
      game.onInventoryUpdate = onInventoryUpdate;
      game.onInteractionUpdate = onInteractionUpdate;
      if (onSlotSelect) game.setSlotSelectCallback(onSlotSelect);

  }, [config, manualInput, onInventoryUpdate, onSlotSelect, onInteractionUpdate]);

  return <div ref={containerRef} className="w-full h-full" onContextMenu={(e) => e.preventDefault()} />;
};

export default Scene;