import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, BookOpen, RefreshCw, Zap, X } from 'lucide-react';

const LENGTHS = [
    { key: 'quick', label: 'Quick', desc: '2 sentences' },
    { key: 'standard', label: 'Standard', desc: '~200 words' },
    { key: 'detailed', label: 'Detailed', desc: '~400 words' },
];

const SkeletonLoader = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[100, 80, 95, 70, 88, 75].map((w, i) => (
            <div key={i} style={{
                height: 14, borderRadius: 7, background: 'var(--line)',
                width: `${w}%`,
                animation: 'pulse 1.5s ease-in-out infinite',
                animationDelay: `${i * 0.1}s`,
            }} />
        ))}
    </div>
);

const RecallModal = ({
    isOpen,
    onClose,
    onGenerate,
    recallText,
    isLoading,
    isOrientation = false,
    activeLength = 'standard',
    onLengthChange,
    error = null,
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="recall-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 200,
                        background: 'color-mix(in oklab, var(--ink) 55%, transparent)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
                    }}
                    onClick={onClose}
                >
                    <motion.div
                        key="recall-card"
                        initial={{ opacity: 0, y: 24, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.96 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        onClick={e => e.stopPropagation()}
                        style={{
                            position: 'relative',
                            width: '100%', maxWidth: 480,
                            maxHeight: 'calc(100vh - 48px)',
                            display: 'flex', flexDirection: 'column',
                            background: 'var(--surface)',
                            border: '1px solid var(--line)',
                            borderRadius: 'var(--r-xl)',
                            boxShadow: 'var(--shadow-lg)',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Header */}
                        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
                            <button
                                onClick={onClose}
                                style={{
                                    position: 'absolute', top: 16, right: 16,
                                    padding: 6, borderRadius: 'var(--r-md)',
                                    background: 'none', border: 0, cursor: 'pointer',
                                    color: 'var(--ink-faint)', display: 'flex',
                                    transition: 'color .15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.color = 'var(--ink)'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-faint)'}
                            >
                                <X size={18} />
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: 'var(--r-md)', flexShrink: 0,
                                    background: 'var(--accent-soft)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Sparkles size={22} style={{ color: 'var(--accent)' }} />
                                </div>
                                <div>
                                    <h2 className="serif" style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.2 }}>
                                        {isOrientation ? 'Welcome to your book' : 'Welcome back!'}
                                    </h2>
                                    <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
                                        {isOrientation
                                            ? 'A quick intro before you dive in'
                                            : !recallText && !isLoading && !error
                                                ? 'Pick a length and get caught up'
                                                : "Here's what's happened so far…"}
                                    </p>
                                </div>
                            </div>

                            {/* Length tabs — returning readers only */}
                            {!isOrientation && (
                                <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
                                    {LENGTHS.map(l => {
                                        const active = activeLength === l.key;
                                        return (
                                            <button
                                                key={l.key}
                                                onClick={() => {
                                                    if (recallText) {
                                                        onLengthChange && onLengthChange(l.key);
                                                    } else {
                                                        onLengthChange && onLengthChange(l.key, false);
                                                    }
                                                }}
                                                disabled={isLoading}
                                                style={{
                                                    flex: 1, padding: '7px 4px',
                                                    borderRadius: 'var(--r-md)',
                                                    border: active ? '1.5px solid var(--accent)' : '1px solid var(--line)',
                                                    background: active ? 'var(--accent-soft)' : 'var(--surface-2)',
                                                    color: active ? 'var(--accent-ink)' : 'var(--ink-soft)',
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                                                    cursor: isLoading ? 'not-allowed' : 'pointer',
                                                    opacity: isLoading ? 0.5 : 1,
                                                    transition: 'all .15s',
                                                    fontWeight: active ? 600 : 400,
                                                }}
                                            >
                                                <span style={{ fontSize: 13 }}>{l.label}</span>
                                                <span style={{ fontSize: 11, opacity: 0.7 }}>{l.desc}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Body */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                            {isLoading ? (
                                <SkeletonLoader />
                            ) : error ? (
                                <div style={{ textAlign: 'center', padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                    <p style={{ fontSize: 14, color: 'var(--ink-soft)' }}>{error}</p>
                                    <button
                                        onClick={() => onGenerate && onGenerate(activeLength)}
                                        className="ath-btn ath-btn--secondary ath-btn--sm"
                                    >
                                        <RefreshCw size={13} /> Retry
                                    </button>
                                </div>
                            ) : recallText ? (
                                <p className="serif" style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
                                    {recallText}
                                </p>
                            ) : !isOrientation ? (
                                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--ink-soft)', fontSize: 13 }}>
                                    Choose a length above, then tap <strong style={{ color: 'var(--ink)' }}>Get Caught Up</strong>.
                                </div>
                            ) : null}
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '16px 24px 24px', borderTop: '1px solid var(--line)', flexShrink: 0 }}>
                            {!isLoading && !recallText && !error && !isOrientation ? (
                                <motion.button
                                    onClick={() => onGenerate && onGenerate(activeLength)}
                                    whileTap={{ scale: 0.97 }}
                                    className="ath-btn ath-btn--primary ath-btn--md"
                                    style={{ width: '100%' }}
                                >
                                    <Zap size={16} /> Get Caught Up
                                </motion.button>
                            ) : (
                                <motion.button
                                    onClick={onClose}
                                    disabled={isLoading}
                                    whileTap={{ scale: 0.97 }}
                                    className="ath-btn ath-btn--primary ath-btn--md"
                                    style={{ width: '100%' }}
                                >
                                    <BookOpen size={16} /> Resume Reading
                                </motion.button>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default RecallModal;
