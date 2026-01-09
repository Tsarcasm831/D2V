
import React from 'react';
import { Item } from '../types';

interface EquipSlotProps {
  item?: Item;
  slotType: string;
  className?: string;
  onMouseEnter: (e: React.MouseEvent, item: Item) => void;
  onMouseLeave: () => void;
  onClick?: () => void;
  onDoubleClick?: () => void;
  label?: string;
}

const EquipSlot: React.FC<EquipSlotProps> = ({ item, slotType, className, onMouseEnter, onMouseLeave, onClick, onDoubleClick, label }) => {
  return (
    <div 
      onClick={onClick}
      onDoubleClick={(e) => {
        e.preventDefault();
        onDoubleClick?.();
      }}
      className={`relative flex items-center justify-center cursor-pointer group rounded-sm border border-neutral-800 transition-all duration-200 ${className} ${item ? 'bg-[#080808]' : 'bg-[#080808]'} shadow-[inset_0_0_12px_rgba(0,0,0,1)] hover:border-[#4a3f32]`}
      onMouseEnter={(e) => item && onMouseEnter(e, item)}
      onMouseLeave={onMouseLeave}
    >
      {label && !item && (
        <span className="absolute top-1 left-0 w-full text-center text-[8px] uppercase font-cinzel text-neutral-600 tracking-widest font-semibold pointer-events-none opacity-60">
          {label}
        </span>
      )}
      
      {/* Empty Slot Highlight */}
      {!item && (
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_0%,transparent_60%)] pointer-events-none" />
      )}

      {item ? (
        <div className="w-full h-full relative p-[2px] overflow-hidden flex items-center justify-center z-10">
          <img 
            src={item.icon} 
            alt={item.name} 
            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.05] saturate-[0.9] group-hover:saturate-100 drop-shadow-md"
          />
          
          {/* Rarity Border Overlay (Inner) */}
          <div className={`absolute inset-0 border opacity-50 ${
            item.rarity === 'Unique' ? 'border-orange-500/50' : 
            item.rarity === 'Rare' ? 'border-yellow-500/50' : 
            item.rarity === 'Magic' ? 'border-blue-500/50' : 'border-transparent'
          }`} />

          {/* Shine effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        </div>
      ) : (
        <div className="text-neutral-800 opacity-20 group-hover:opacity-30 transition-opacity duration-300">
           {/* Simple geometric placeholder based on slot? Or just generic */}
           <svg className="w-1/2 h-1/2 mx-auto" fill="currentColor" viewBox="0 0 24 24">
             <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 2.18l6 2.25v4.66c0 4.07-2.73 7.84-6 8.82-3.27-.98-6-4.75-6-8.82V6.43l6-2.25z"/>
          </svg>
        </div>
      )}
    </div>
  );
};

export default EquipSlot;
