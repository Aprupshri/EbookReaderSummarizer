import React from 'react';
import { Highlighter, Sparkles, BookOpen, X } from 'lucide-react';

const SelectionMenu = ({
    selection,
    showDictionary,
    handleHighlight,
    handleExplain,
    handleDictionary,
    clearSelection
}) => {
    if (!selection || showDictionary) return null;

    return (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-800 rounded-full shadow-2xl border border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center gap-4 animate-in slide-in-from-bottom-5">
            <button onClick={handleHighlight} className="flex items-center gap-2 text-sm font-medium text-yellow-600 dark:text-yellow-500 hover:opacity-80 transition-opacity">
                <Highlighter size={18} />
                <span>Highlight</span>
            </button>
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600"></div>
            <button onClick={handleExplain} className="flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:opacity-80 transition-opacity">
                <Sparkles size={18} />
                <span>Explain</span>
            </button>
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600"></div>
            <button onClick={handleDictionary} className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity">
                <BookOpen size={18} />
                <span>Define</span>
            </button>
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600"></div>
            <button onClick={clearSelection} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                <X size={18} />
            </button>
        </div>
    );
};

export default SelectionMenu;
