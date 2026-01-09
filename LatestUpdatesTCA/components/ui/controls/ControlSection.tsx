
import React from 'react';

interface ControlSectionProps {
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}

export const ControlSection: React.FC<ControlSectionProps> = ({ title, isOpen, onToggle, children }) => {
    return (
        <div className="bg-white/50 rounded-xl p-3 border border-white/60 shadow-sm">
            <button 
                onClick={onToggle}
                className="w-full flex justify-between items-center py-2 px-1 text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-200 hover:text-blue-600 transition-colors mb-3"
            >
                <span>{title}</span>
                <svg 
                    className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            
            {isOpen && (
                <div className="animate-fade-in-down">
                    {children}
                </div>
            )}
        </div>
    );
};
