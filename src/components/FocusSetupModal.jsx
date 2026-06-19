import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Headphones, Play } from 'lucide-react';

const TIMER_OPTIONS = [
    { value: 15, label: '15 min' },
    { value: 25, label: '25 min' },
    { value: 45, label: '45 min' },
    { value: 0, label: 'None' },
];

const AMBIENCE_OPTIONS = [
    { value: 'silence', label: 'Silence', emoji: '🤫' },
    { value: 'rain', label: 'Rain', emoji: '🌧️' },
    { value: 'cafe', label: 'Cafe', emoji: '☕' },
    { value: 'forest', label: 'Forest', emoji: '🌲' },
];

const FocusSetupModal = ({ isOpen, onClose, onStart }) => {
    const [timerGoal, setTimerGoal] = useState(25);
    const [ambience, setAmbience] = useState('silence');

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    style={{
                        background: 'var(--surface)', border: '1px solid var(--line)',
                        borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-lg)',
                        width: '100%', maxWidth: 360, maxHeight: '90vh',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    }}
                >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--line)', background: 'var(--surface-2)', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>
                            <Clock size={18} style={{ color: 'var(--accent)' }} />
                            Focus Session
                        </div>
                        <button className="ath-iconbtn" onClick={onClose}><X size={18} /></button>
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                            {/* Timer goal */}
                            <div>
                                <div className="label-cat" style={{ marginBottom: 10 }}>Set a Goal</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    {TIMER_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setTimerGoal(opt.value)}
                                            style={{
                                                padding: '12px', borderRadius: 'var(--r-md)',
                                                border: timerGoal === opt.value ? '1.5px solid var(--accent)' : '1px solid var(--line)',
                                                background: timerGoal === opt.value ? 'var(--accent-soft)' : 'var(--surface-2)',
                                                color: timerGoal === opt.value ? 'var(--accent-ink)' : 'var(--ink-soft)',
                                                fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'all .15s',
                                            }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Ambience */}
                            <div>
                                <div className="label-cat" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Headphones size={12} /> Background Ambience
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    {AMBIENCE_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setAmbience(opt.value)}
                                            style={{
                                                padding: '12px', borderRadius: 'var(--r-md)',
                                                border: ambience === opt.value ? '1.5px solid var(--accent)' : '1px solid var(--line)',
                                                background: ambience === opt.value ? 'var(--accent-soft)' : 'var(--surface-2)',
                                                color: ambience === opt.value ? 'var(--accent-ink)' : 'var(--ink-soft)',
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                                                cursor: 'pointer', transition: 'all .15s',
                                            }}
                                        >
                                            <span style={{ fontSize: 22 }}>{opt.emoji}</span>
                                            <span style={{ fontSize: 12, fontWeight: 500 }}>{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--line)', background: 'var(--surface-2)', flexShrink: 0 }}>
                        <button
                            onClick={() => onStart({ timerGoal, ambience })}
                            className="ath-btn ath-btn--primary ath-btn--md"
                            style={{ width: '100%' }}
                        >
                            <Play size={17} fill="currentColor" />
                            Start Deep Reading
                        </button>
                        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--ink-faint)', marginTop: 10 }}>
                            Distractions hidden. Status bar suppressed.
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default FocusSetupModal;
