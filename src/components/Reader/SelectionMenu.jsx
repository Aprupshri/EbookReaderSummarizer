import React from 'react';
import { Highlighter, Sparkles, BookOpen, X, BookMarked } from 'lucide-react';

const SEP = () => (
    <div style={{ width: 1, height: 20, background: 'var(--line)', flexShrink: 0 }} />
);

const SelectionMenu = ({
    selection,
    showDictionary,
    handleHighlight,
    handleSaveToCommonplace,
    handleExplain,
    handleDictionary,
    clearSelection
}) => {
    if (!selection || showDictionary) return null;

    return (
        <div
            style={{
                // Clear the reader footer (~70px + safe-area, z-index 60) so the
                // progress slider never covers the menu when the bars are visible.
                position: 'absolute', bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))',
                left: '50%', transform: 'translateX(-50%)',
                zIndex: 70,
                background: 'var(--surface)',
                borderRadius: 99,
                boxShadow: '0 8px 32px rgba(0,0,0,.22), 0 2px 8px rgba(0,0,0,.1)',
                border: '1px solid var(--line)',
                padding: '8px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
                maxWidth: '95vw', overflowX: 'auto',
            }}
        >
            <button
                onClick={handleHighlight}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500, color: '#b7860d', flexShrink: 0, border: 0, background: 'none', cursor: 'pointer', padding: 0 }}
            >
                <Highlighter size={17} />
                <span>Highlight</span>
            </button>
            <SEP />
            <button
                onClick={handleSaveToCommonplace}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500, color: 'var(--accent-ink)', flexShrink: 0, border: 0, background: 'none', cursor: 'pointer', padding: 0 }}
            >
                <BookMarked size={17} />
                <span>Save</span>
            </button>
            <SEP />
            <button
                onClick={handleExplain}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500, color: 'var(--accent)', flexShrink: 0, border: 0, background: 'none', cursor: 'pointer', padding: 0 }}
            >
                <Sparkles size={17} />
                <span>Explain</span>
            </button>
            <SEP />
            <button
                onClick={handleDictionary}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500, color: 'var(--ink-soft)', flexShrink: 0, border: 0, background: 'none', cursor: 'pointer', padding: 0 }}
            >
                <BookOpen size={17} />
                <span>Define</span>
            </button>
            <SEP />
            <button
                onClick={clearSelection}
                style={{ padding: 4, color: 'var(--ink-faint)', display: 'flex', border: 0, background: 'none', cursor: 'pointer', flexShrink: 0 }}
            >
                <X size={17} />
            </button>
        </div>
    );
};

export default SelectionMenu;
