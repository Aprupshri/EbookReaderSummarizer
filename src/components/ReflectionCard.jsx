import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Lightbulb, ArrowLeft } from 'lucide-react';

const ReflectionCard = ({ isOpen, prediction, bookTitle, onOutcome, onSkip, onKeepReading }) => {
    if (!prediction) return null;

    const isFiction = prediction.genre === 'fiction';

    const outcomes = isFiction
        ? [
            { key: 'yes',    emoji: '✅', label: 'Yes!',   sub: 'Nailed it' },
            { key: 'partly', emoji: '〰️', label: 'Partly', sub: 'Close enough' },
            { key: 'no',     emoji: '❌', label: 'Nope',   sub: 'Surprised me' },
        ]
        : [
            { key: 'yes',    emoji: '✅', label: 'Yes!',    sub: 'Learned it' },
            { key: 'partly', emoji: '〰️', label: 'Partly', sub: 'Still processing' },
            { key: 'noyet',  emoji: '📖', label: 'Not yet', sub: 'Still reading' },
        ];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="reflection-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[95] flex items-center justify-center p-6"
                    style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
                >
                    <motion.div
                        key="reflection-card"
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                            width: '100%', maxWidth: 360,
                            borderRadius: 'var(--r-xl)',
                            background: 'var(--surface)',
                            border: '1px solid var(--line)',
                            boxShadow: 'var(--shadow-lg)',
                            padding: 24,
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Context header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                            <button
                                onClick={onKeepReading}
                                className="ath-iconbtn"
                                title="Keep Reading"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <div>
                                <p className="label-cat" style={{ textTransform: 'uppercase', fontSize: 10 }}>Before you go…</p>
                                {bookTitle && (
                                    <p style={{ color: 'var(--ink)', fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{bookTitle}</p>
                                )}
                            </div>
                        </div>

                        {/* Icon */}
                        <div style={{
                            width: 52, height: 52, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                            background: isFiction ? 'var(--accent-soft)' : 'color-mix(in oklab, #2f9e44 12%, var(--surface-2))',
                        }}>
                            {isFiction
                                ? <BookOpen size={22} style={{ color: 'var(--accent)' }} />
                                : <Lightbulb size={22} style={{ color: '#2f9e44' }} />
                            }
                        </div>

                        <p style={{ textAlign: 'center', color: 'var(--ink)', fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
                            {isFiction ? 'Were you right?' : 'Did you find it?'}
                        </p>
                        <p style={{ textAlign: 'center', color: 'var(--ink-faint)', fontSize: 12, marginBottom: 16 }}>
                            You made a prediction at the start of this session.
                        </p>

                        {/* Earlier prediction */}
                        <div style={{ margin: '0 0 16px', padding: '12px 16px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
                            <p className="label-cat" style={{ textTransform: 'uppercase', fontSize: 10, marginBottom: 4 }}>
                                {isFiction ? 'Your prediction' : 'Your intention'}
                            </p>
                            <p className="serif" style={{ color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.5, fontStyle: 'italic' }}>"{prediction.text}"</p>
                        </div>

                        {/* Outcome buttons */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                            {outcomes.map(o => (
                                <button
                                    key={o.key}
                                    onClick={() => onOutcome(o.key)}
                                    style={{
                                        flex: 1, padding: '12px 4px', borderRadius: 'var(--r-md)',
                                        background: 'var(--surface-2)', border: '1px solid var(--line)',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                                        cursor: 'pointer', transition: 'all .15s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-soft)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
                                >
                                    <span style={{ fontSize: 20 }}>{o.emoji}</span>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{o.label}</span>
                                    <span style={{ fontSize: 10, color: 'var(--ink-faint)' }}>{o.sub}</span>
                                </button>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                onClick={onKeepReading}
                                className="ath-btn ath-btn--secondary ath-btn--md"
                                style={{ flex: 1 }}
                            >
                                ← Keep Reading
                            </button>
                            <button
                                onClick={onSkip}
                                style={{ flex: 1, padding: '10px 14px', background: 'none', border: 0, fontSize: 14, color: 'var(--ink-faint)', cursor: 'pointer' }}
                            >
                                Skip &amp; exit
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ReflectionCard;
