import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, BookOpen, SkipForward, Send } from 'lucide-react';

const PredictionPrompt = ({ isOpen, genre: initialGenre, onSubmit, onSkip, onGenreSelect }) => {
    const [text, setText] = useState('');
    const [genre, setGenre] = useState(initialGenre ?? null);

    React.useEffect(() => {
        if (isOpen) {
            setText('');
            setGenre(initialGenre ?? null);
        }
    }, [isOpen, initialGenre]);

    const isFiction = genre === 'fiction';

    const question = genre === null
        ? "What's one thing on your mind about this book?"
        : isFiction
            ? 'What do you think happens next?'
            : 'What are you hoping to learn in this session?';

    const placeholder = genre === null
        ? 'e.g. I\'m curious about where the story / argument is heading…'
        : isFiction
            ? 'e.g. I think the detective will discover the real culprit is…'
            : 'e.g. I want to understand how compound interest actually works…';

    const handleSubmit = () => {
        if (!text.trim()) return;
        onSubmit(text.trim(), genre);
        setText('');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="prediction-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[90] flex items-end justify-center"
                    style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
                >
                    <motion.div
                        key="prediction-panel"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        onClick={e => e.stopPropagation()}
                        style={{
                            width: '100%', maxWidth: 672,
                            borderRadius: 'var(--r-xl) var(--r-xl) 0 0',
                            background: 'var(--surface)',
                            borderTop: '1px solid var(--line)',
                            boxShadow: 'var(--shadow-lg)',
                            padding: '0 24px 32px',
                        }}
                    >
                        <div className="ath-grabber" />

                        {/* Icon + question */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <div style={{
                                padding: 10, borderRadius: 12,
                                background: isFiction ? 'var(--accent-soft)' : 'color-mix(in oklab, #2f9e44 12%, var(--surface-2))',
                            }}>
                                {isFiction
                                    ? <BookOpen size={20} style={{ color: 'var(--accent)' }} />
                                    : <Lightbulb size={20} style={{ color: '#2f9e44' }} />
                                }
                            </div>
                            <p style={{ fontWeight: 600, fontSize: 16, color: 'var(--ink)', lineHeight: 1.3 }}>{question}</p>
                        </div>

                        {/* Input */}
                        <textarea
                            autoFocus
                            rows={3}
                            value={text}
                            onChange={e => setText(e.target.value)}
                            placeholder={placeholder}
                            className="ath-input"
                            style={{ resize: 'none' }}
                        />

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                            <button
                                onClick={onSkip}
                                className="ath-btn ath-btn--ghost ath-btn--md"
                            >
                                <SkipForward size={15} /> Skip
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!text.trim()}
                                className="ath-btn ath-btn--primary ath-btn--md"
                                style={{ flex: 1 }}
                            >
                                <Send size={15} /> Save my prediction
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PredictionPrompt;
