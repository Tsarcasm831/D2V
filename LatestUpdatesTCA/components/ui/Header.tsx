
import React from 'react';

export const Header: React.FC = () => (
    <div className="absolute top-0 left-0 w-full p-6 z-10 pointer-events-none">
        <h1 className="text-4xl font-black text-gray-800 tracking-tighter drop-shadow-sm opacity-80">
          ANIMATOR<span className="text-blue-600">3D</span>
        </h1>
        <p className="text-gray-600 font-medium text-sm mt-1 max-w-md">
          W/A/S/D move, SHIFT run, SPACE jump, X change view, 1-8 items.
        </p>
    </div>
);
