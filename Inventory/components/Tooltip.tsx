
import React, { useLayoutEffect, useRef, useState } from 'react';
import { Item, ItemRarity } from '../types';

interface TooltipProps {
  item: any;
  x: number;
  y: number;
}

const Tooltip: React.FC<TooltipProps> = ({ item, x, y }) => {
  const isGeneric = !item.rarity;
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!tooltipRef.current) return;

    const { offsetWidth, offsetHeight } = tooltipRef.current;
    const padding = 20;
    
    let left = x + padding;
    let top = y + padding;

    if (left + offsetWidth > window.innerWidth) {
      left = x - offsetWidth - padding;
    }
    if (top + offsetHeight > window.innerHeight) {
      top = y - offsetHeight - padding;
    }

    left = Math.max(10, Math.min(left, window.innerWidth - offsetWidth - 10));
    top = Math.max(10, Math.min(top, window.innerHeight - offsetHeight - 10));

    setPosition({ top, left });
  }, [x, y, item.id]);

  const getRarityHeaderColor = (rarity: ItemRarity) => {
    switch (rarity) {
      case ItemRarity.MAGIC: return 'text-blue-400';
      case ItemRarity.RARE: return 'text-[#fcd34d]'; // brighter yellow
      case ItemRarity.UNIQUE: return 'text-[#fbbf24]'; // amber/gold
      default: return 'text-neutral-200';
    }
  };

  const getBorderColor = (rarity: ItemRarity) => {
    switch (rarity) {
      case ItemRarity.MAGIC: return 'border-blue-900/60';
      case ItemRarity.RARE: return 'border-yellow-900/60';
      case ItemRarity.UNIQUE: return 'border-orange-900/60';
      default: return 'border-neutral-800';
    }
  };

  return (
    <div 
      ref={tooltipRef}
      className={`fixed z-[100] pointer-events-none p-0 min-w-[280px] max-w-[340px] border shadow-[0_20px_60px_rgba(0,0,0,1)] bg-[#080808]/95 backdrop-blur-md transition-opacity duration-150 ${!isGeneric ? getBorderColor(item.rarity) : 'border-neutral-800'}`}
      style={{ top: position.top, left: position.left }}
    >
      {/* Header Bar */}
      <div className={`py-3 px-4 border-b border-white/5 bg-gradient-to-r from-white/5 to-transparent`}>
        <h3 className={`text-lg font-cinzel font-bold ${!isGeneric ? getRarityHeaderColor(item.rarity) : 'text-neutral-200'} uppercase tracking-wider text-center drop-shadow-sm`}>
          {item.name}
        </h3>
        {!isGeneric && (
          <div className="flex justify-center items-center gap-2 mt-1">
             <div className="h-[1px] w-8 bg-current opacity-30" />
             <span className="text-[10px] uppercase font-cinzel text-neutral-400 tracking-widest">{item.rarity} {item.type}</span>
             <div className="h-[1px] w-8 bg-current opacity-30" />
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Primary Properties Grid */}
        {!isGeneric && (
          <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-[12px] text-neutral-400 font-cinzel">
            {item.damageRange && (
              <div className="col-span-2 flex justify-between border-b border-white/5 pb-1 mb-1">
                <span>Damage</span>
                <span className="text-white font-serif font-bold tracking-wide">{item.damageRange}</span>
              </div>
            )}
            {item.defense && (
              <div className="col-span-2 flex justify-between border-b border-white/5 pb-1 mb-1">
                <span>Defense</span>
                <span className="text-white font-serif font-bold tracking-wide">{item.defense}</span>
              </div>
            )}
            {item.attackSpeed && (
              <div className="flex justify-between">
                <span>APS</span>
                <span className="text-white font-serif">{item.attackSpeed.toFixed(2)}</span>
              </div>
            )}
            {item.critChance && (
              <div className="flex justify-between">
                <span>Crit</span>
                <span className="text-white font-serif">{item.critChance.toFixed(1)}%</span>
              </div>
            )}
            {item.blockChance && (
              <div className="flex justify-between">
                <span>Block</span>
                <span className="text-white font-serif">{item.blockChance}%</span>
              </div>
            )}
            {item.levelReq && (
               <div className="col-span-2 flex justify-end mt-1 text-neutral-500">
                 Requires Level <span className="text-neutral-300 ml-1">{item.levelReq}</span>
               </div>
            )}
          </div>
        )}

        {/* Magic Stats */}
        {item.stats && item.stats.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-white/5">
            {item.stats.map((stat: string, i: number) => (
              <div key={i} className="text-[14px] text-blue-200/90 font-serif leading-snug text-center">
                {stat}
              </div>
            ))}
          </div>
        )}

        {/* Description / Lore */}
        {(item.description || item.lore) && (
          <div className="pt-3 border-t border-white/5 text-center">
             {item.description && (
                <p className="text-[13px] text-neutral-400 italic font-serif leading-relaxed mb-2">{item.description}</p>
             )}
             {item.lore && (
                <p className="text-[13px] text-[#c8aa6e] opacity-60 italic font-serif leading-relaxed">
                  "{item.lore}"
                </p>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tooltip;
