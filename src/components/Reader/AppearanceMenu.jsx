import React from 'react';
import { X, AlignJustify, Scroll } from 'lucide-react';

const FONTS = [
    { label: 'Serif', value: 'Merriweather, serif' },
    { label: 'Sans',  value: 'Inter, sans-serif'   },
    { label: 'Mono',  value: 'monospace'            },
];

const LINE_HEIGHTS = [
    { label: 'Compact', value: '1.4' },
    { label: 'Normal',  value: '1.8' },
    { label: 'Loose',   value: '2.2' },
];

const AppearanceMenu = ({
    showAppearance,
    setShowAppearance,
    theme,
    update,
    onThemeChange,
    fontSize,
    fontFamily,
    lineHeight,
    flow,
}) => {
    if (!showAppearance) return null;

    const handleTheme = (t) => {
        update('theme', t);
        onThemeChange?.(t);
    };

    return (
        <div className="ath-appear">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="label-cat">Appearance</span>
                <button className="ath-iconbtn" style={{ width: 28, height: 28 }} onClick={() => setShowAppearance(false)}>
                    <X size={14} />
                </button>
            </div>

            {/* Theme */}
            <div className="ath-appear-row">
                <span className="label-cat">Theme</span>
                <div className="ath-seg">
                    {['light', 'sepia', 'dark'].map(t => (
                        <button
                            key={t}
                            className={`ath-seg-item${theme === t ? ' is-on' : ''}`}
                            onClick={() => handleTheme(t)}
                        >
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Font size */}
            <div className="ath-appear-row">
                <span className="label-cat">Size</span>
                <div className="ath-stepper">
                    <button onClick={() => update('fontSize', Math.max(50, fontSize - 10))}>−</button>
                    <span className="mono">{fontSize}%</span>
                    <button onClick={() => update('fontSize', Math.min(200, fontSize + 10))}>+</button>
                </div>
            </div>

            {/* Font family */}
            <div className="ath-appear-row">
                <span className="label-cat">Font</span>
                <div className="ath-seg">
                    {FONTS.map(f => (
                        <button
                            key={f.value}
                            className={`ath-seg-item${fontFamily === f.value ? ' is-on' : ''}`}
                            style={{ fontFamily: f.value }}
                            onClick={() => update('fontFamily', f.value)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Line height */}
            <div className="ath-appear-row">
                <span className="label-cat">Spacing</span>
                <div className="ath-seg">
                    {LINE_HEIGHTS.map(lh => (
                        <button
                            key={lh.value}
                            className={`ath-seg-item${lineHeight === lh.value ? ' is-on' : ''}`}
                            onClick={() => update('lineHeight', lh.value)}
                        >
                            {lh.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Flow */}
            <div className="ath-appear-row">
                <span className="label-cat">View</span>
                <div className="ath-seg">
                    <button
                        className={`ath-seg-item${flow === 'paginated' ? ' is-on' : ''}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                        onClick={() => update('flow', 'paginated')}
                    >
                        <AlignJustify size={12} />Pages
                    </button>
                    <button
                        className={`ath-seg-item${flow === 'scrolled' ? ' is-on' : ''}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                        onClick={() => update('flow', 'scrolled')}
                    >
                        <Scroll size={12} />Scroll
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AppearanceMenu;
