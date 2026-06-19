import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Upload, BookPlus, Compass } from 'lucide-react';

const FAB_ITEMS = [
    { key: 'discover', Icon: Compass,  label: 'Discover Free Classics', color: 'var(--accent-soft)', iconColor: 'var(--accent-ink)' },
    { key: 'physical', Icon: BookPlus, label: 'Add Physical Book',       color: 'color-mix(in oklab, #2f9e44 12%, var(--surface-2))', iconColor: '#2f9e44' },
];

const AddOptionsFab = ({ onUpload, onPhysical, onDiscover, disabled, isHidden }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setIsOpen(false); };
        if (isOpen) document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [isOpen]);

    if (isHidden) return null;

    const actions = {
        discover: onDiscover,
        physical: onPhysical,
    };

    return (
        <div className="ath-fab sm:hidden" ref={menuRef}>
            {/* Backdrop */}
            {isOpen && (
                <div
                    style={{ position: 'fixed', inset: '-200vh', background: 'color-mix(in oklab, var(--ink) 28%, transparent)', backdropFilter: 'blur(2px)', zIndex: -1 }}
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sub-menu */}
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10,
                transition: 'all .25s cubic-bezier(.2,.7,.2,1)',
                opacity: isOpen ? 1 : 0,
                transform: isOpen ? 'none' : 'translateY(12px) scale(.95)',
                pointerEvents: isOpen ? 'auto' : 'none',
            }}>
                {FAB_ITEMS.map(({ key, Icon, label, color, iconColor }) => (
                    <button
                        key={key}
                        onClick={() => { setIsOpen(false); actions[key]?.(); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            background: 'var(--surface)', border: '1px solid var(--line)',
                            borderRadius: 99, padding: '8px 16px 8px 8px',
                            boxShadow: 'var(--shadow-lg)', color: 'var(--ink)',
                            fontWeight: 500, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                    >
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: color, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={18} />
                        </div>
                        {label}
                    </button>
                ))}

                {/* Upload label */}
                <label style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'var(--surface)', border: '1px solid var(--line)',
                    borderRadius: 99, padding: '8px 16px 8px 8px',
                    boxShadow: 'var(--shadow-lg)', color: 'var(--ink)',
                    fontWeight: 500, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap',
                }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'color-mix(in oklab, var(--accent) 12%, var(--surface-2))', color: 'var(--accent-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Upload size={18} />
                    </div>
                    Upload File (.epub / .pdf)
                    <input type="file" accept=".epub,.pdf" onChange={e => { setIsOpen(false); onUpload(e); }} className="hidden" disabled={disabled} />
                </label>
            </div>

            {/* Main FAB */}
            <button
                onClick={() => setIsOpen(v => !v)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: isOpen ? '14px' : '14px 22px',
                    borderRadius: 99, background: isOpen ? 'var(--ink)' : 'var(--accent)',
                    color: 'var(--on-accent)', fontWeight: 600, fontSize: 15,
                    boxShadow: 'var(--shadow-lg)', transition: 'all .25s', border: 0, cursor: 'pointer',
                }}
                aria-label={isOpen ? 'Close menu' : 'Add book'}
            >
                <div style={{ transition: 'transform .3s', transform: isOpen ? 'rotate(45deg)' : 'none', display: 'flex' }}>
                    <Plus size={22} />
                </div>
                {!isOpen && <span>Add Book</span>}
            </button>
        </div>
    );
};

export default AddOptionsFab;
