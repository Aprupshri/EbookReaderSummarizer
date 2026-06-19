import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Send, BookmarkPlus, Check, RefreshCw } from 'lucide-react';

const SkeletonLoader = ({ lines = 4 }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Array.from({ length: lines }).map((_, i) => (
            <div
                key={i}
                style={{ height: 13, borderRadius: 7, background: 'var(--line)', width: `${[100, 88, 94, 72, 85][i % 5]}%` }}
            />
        ))}
    </div>
);

const ExplainModal = ({
    isOpen,
    onClose,
    selectedText,
    explanation,
    isLoading,
    error,
    onRetry,
    onSave,
    isSaved,
    onFollowUp,
    theme = 'light',
}) => {
    const [followUpInput, setFollowUpInput] = useState('');
    const [followUps, setFollowUps] = useState([]);
    const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => { setFollowUps([]); setFollowUpInput(''); }, [selectedText]);
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [followUps, explanation]);

    const handleSendFollowUp = async () => {
        const q = followUpInput.trim();
        if (!q || isFollowUpLoading) return;
        setFollowUpInput('');
        setIsFollowUpLoading(true);
        setFollowUps(prev => [...prev, { q, a: '', loading: true }]);
        try {
            const answer = await onFollowUp(q);
            setFollowUps(prev => prev.map((f, i) => i === prev.length - 1 ? { ...f, a: answer, loading: false } : f));
        } catch (err) {
            setFollowUps(prev => prev.map((f, i) => i === prev.length - 1 ? { ...f, a: `Error: ${err.message}`, loading: false } : f));
        } finally {
            setIsFollowUpLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="explain-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[80] flex items-end justify-center"
                    style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
                    onClick={onClose}
                >
                    <motion.div
                        key="explain-panel"
                        data-theme={theme}
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                            width: '100%', maxWidth: 680, maxHeight: '85vh',
                            background: 'var(--surface)',
                            borderTop: '1px solid var(--line)',
                            borderRadius: 'var(--r-xl) var(--r-xl) 0 0',
                            boxShadow: 'var(--shadow-lg)',
                            display: 'flex', flexDirection: 'column', overflow: 'hidden',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Handle */}
                        <div className="ath-grabber" />

                        {/* Header */}
                        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Sparkles size={16} style={{ color: 'var(--accent)' }} />
                                    <span style={{ fontWeight: 550, fontSize: 14, color: 'var(--ink)' }}>AI Explain</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {explanation && (
                                        <button
                                            onClick={onSave}
                                            title={isSaved ? 'Saved!' : 'Save explanation as a note'}
                                            className={`ath-btn ath-btn--sm${isSaved ? '' : ' ath-btn--ghost'}`}
                                            style={isSaved ? { background: 'color-mix(in oklab, #2f9e44 14%, var(--surface-2))', color: '#2f9e44' } : undefined}
                                        >
                                            {isSaved ? <Check size={13} /> : <BookmarkPlus size={13} />}
                                            {isSaved ? 'Saved' : 'Save'}
                                        </button>
                                    )}
                                    <button className="ath-iconbtn" onClick={onClose}><X size={16} /></button>
                                </div>
                            </div>

                            {selectedText && (
                                <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 'var(--r-md)', background: 'var(--accent-soft)', color: 'var(--accent-ink)', fontSize: 12, fontStyle: 'italic', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    "{selectedText}"
                                </div>
                            )}
                        </div>

                        {/* Body */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {isLoading ? (
                                <SkeletonLoader lines={5} />
                            ) : error ? (
                                <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--ink-soft)', fontSize: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                    <p>{error}</p>
                                    <button onClick={onRetry} className="ath-btn ath-btn--ghost ath-btn--sm">
                                        <RefreshCw size={13} /> Retry
                                    </button>
                                </div>
                            ) : explanation ? (
                                <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--ink)' }}>{explanation}</p>
                            ) : null}

                            {followUps.map((f, i) => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <div style={{ maxWidth: '80%', padding: '8px 14px', borderRadius: '18px 18px 4px 18px', background: 'var(--accent)', color: 'var(--on-accent)', fontSize: 14 }}>
                                            {f.q}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                        <div style={{ maxWidth: '85%', padding: '8px 14px', borderRadius: '18px 18px 18px 4px', background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--ink)', fontSize: 14 }}>
                                            {f.loading ? <SkeletonLoader lines={3} /> : f.a}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={bottomRef} />
                        </div>

                        {/* Follow-up input */}
                        {explanation && !isLoading && (
                            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', flexShrink: 0 }}>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={followUpInput}
                                        onChange={e => setFollowUpInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') handleSendFollowUp(); }}
                                        placeholder="Ask a follow-up question…"
                                        className="ath-input"
                                        style={{ flex: 1 }}
                                        disabled={isFollowUpLoading}
                                    />
                                    <button
                                        onClick={handleSendFollowUp}
                                        disabled={!followUpInput.trim() || isFollowUpLoading}
                                        className="ath-btn ath-btn--primary ath-btn--md"
                                        style={{ flexShrink: 0 }}
                                    >
                                        <Send size={15} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ExplainModal;
