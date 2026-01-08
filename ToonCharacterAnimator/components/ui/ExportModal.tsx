import React from 'react';

interface ExportModalProps {
    script: string | null;
    onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ script, onClose }) => {
    if (!script) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(script);
        alert('Copied to clipboard!');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <h2 className="text-lg font-bold text-gray-800">Exported Player Model (TypeScript)</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-0 flex-1 overflow-hidden relative">
                    <textarea 
                        readOnly 
                        value={script} 
                        className="w-full h-full p-4 font-mono text-xs bg-gray-900 text-green-400 resize-none focus:outline-none"
                        spellCheck={false}
                    />
                </div>
                <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Close
                    </button>
                    <button 
                        onClick={handleCopy}
                        className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg hover:shadow-xl transition-all active:scale-95"
                    >
                        Copy to Clipboard
                    </button>
                </div>
            </div>
        </div>
    );
};