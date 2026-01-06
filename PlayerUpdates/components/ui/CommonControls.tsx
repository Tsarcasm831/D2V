import React from 'react';

export const ColorPicker: React.FC<{ label: string, value: string, onChange: (v: string) => void }> = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-600">{label}</label>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 rounded-full overflow-hidden border-none outline-none cursor-pointer" />
    </div>
);

export const Slider: React.FC<{ label: string, value: number, min: number, max: number, step: number, onChange: (val: number) => void }> = ({ label, value, min, max, step, onChange }) => (
  <div className="flex flex-col gap-1">
    <div className="flex justify-between text-xs text-gray-500 font-medium">
        <span>{label}</span>
        <span>{value.toFixed(2)}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
  </div>
);