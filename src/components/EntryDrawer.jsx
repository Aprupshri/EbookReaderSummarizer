import React, { useState, useEffect, useRef } from 'react';
import { X, BookMarked, Tag, Save, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { saveEntry } from '../utils/storage';

const EntryDrawer = ({ isOpen, onClose, quote, book, chapter, cfi, theme }) => {
    const [quoteText, setQuoteText] = useState(quote || '');
    const [myNote, setMyNote] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState([]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const noteRef = useRef(null);
    const quoteRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setQuoteText(quote || '');
            setMyNote(''); setTagInput(''); setTags([]); setSaved(false);
            // For physical books (no pre-filled quote), focus the quote field first.
            // For EPUB (pre-filled), focus the note field as before.
            setTimeout(() => {
                if (!quote) quoteRef.current?.focus();
                else noteRef.current?.focus();
            }, 350);
        }
    }, [isOpen]);

    const addTag = (raw) => {
        const cleaned = raw.trim().toLowerCase().replace(/^#/, '');
        if (cleaned && !tags.includes(cleaned)) setTags(prev => [...prev, cleaned]);
        setTagInput('');
    };

    const handleTagKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); }
        else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) setTags(prev => prev.slice(0, -1));
    };

    const handleSave = async () => {
        if (!quoteText?.trim()) return;
        setSaving(true);
        try {
            await saveEntry({ bookId: book.id, bookTitle: book.title, bookAuthor: book.author, quote: quoteText.trim(), myNote: myNote.trim(), tags, chapter: chapter || '', cfi: cfi || null });
            setSaved(true);
            setTimeout(onClose, 900);
        } catch {}
        finally { setSaving(false); }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }}
                        onClick={onClose}
                    />
                    <motion.div
                        key="drawer"
                        data-theme={theme}
                        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
                        style={{
                            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
                            background: 'var(--surface)', borderTop: '1px solid var(--line)',
                            borderRadius: 'var(--r-xl) var(--r-xl) 0 0',
                            boxShadow: 'var(--shadow-lg)',
                            paddingBottom: 'env(safe-area-inset-bottom, 16px)',
                        }}
                    >
                        <div className="ath-grabber" />

                        <div style={{ padding: '8px 20px 20px' }}>
                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <BookMarked size={16} style={{ color: 'var(--accent)' }} />
                                    <span style={{ fontWeight: 550, fontSize: 14, color: 'var(--ink)' }}>Save to Commonplace Book</span>
                                </div>
                                <button className="ath-iconbtn" style={{ width: 28, height: 28 }} onClick={onClose}><X size={14} /></button>
                            </div>

                            {/* Quote — pre-filled (EPUB selection) or manually typed (physical book) */}
                            {quote ? (
                                <blockquote className="serif" style={{ fontSize: 14, fontStyle: 'italic', lineHeight: 1.5, marginBottom: 14, paddingLeft: 12, borderLeft: '2px solid var(--accent)', color: 'var(--ink-soft)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                                    "{quote.trim()}"
                                </blockquote>
                            ) : (
                                <div style={{ marginBottom: 14 }}>
                                    <div className="label-cat" style={{ marginBottom: 6 }}>Quote or passage</div>
                                    <textarea
                                        ref={quoteRef}
                                        value={quoteText}
                                        onChange={e => setQuoteText(e.target.value)}
                                        placeholder="Type the passage you want to remember…"
                                        rows={4}
                                        className="ath-input"
                                        style={{ resize: 'none', fontStyle: 'italic' }}
                                    />
                                </div>
                            )}

                            {/* My note */}
                            <div style={{ marginBottom: 12 }}>
                                <div className="label-cat" style={{ marginBottom: 6 }}>Your thought on this</div>
                                <textarea
                                    ref={noteRef}
                                    value={myNote}
                                    onChange={e => setMyNote(e.target.value)}
                                    placeholder="What does this mean to you?"
                                    rows={3}
                                    className="ath-input"
                                    style={{ resize: 'none' }}
                                />
                            </div>

                            {/* Tags */}
                            <div style={{ marginBottom: 16 }}>
                                <div className="label-cat" style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Tag size={11} /> Tags
                                </div>
                                <div className="ath-input" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', minHeight: 40, cursor: 'text' }}
                                    onClick={() => document.querySelector('[data-tag-input]')?.focus()}>
                                    {tags.map(t => (
                                        <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--accent-soft)', color: 'var(--accent-ink)', padding: '2px 8px', borderRadius: 99, fontSize: 12 }}>
                                            #{t}
                                            <button onClick={() => setTags(prev => prev.filter(x => x !== t))} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', opacity: .7, display: 'flex' }}>
                                                <X size={10} />
                                            </button>
                                        </span>
                                    ))}
                                    <input
                                        data-tag-input=""
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={handleTagKeyDown}
                                        onBlur={() => tagInput.trim() && addTag(tagInput)}
                                        placeholder={tags.length === 0 ? 'philosophy, stoicism… (Enter to add)' : ''}
                                        style={{ flex: 1, minWidth: 100, border: 0, background: 'transparent', outline: 'none', fontSize: 13, color: 'var(--ink)' }}
                                    />
                                </div>
                            </div>

                            {/* Save */}
                            <button
                                onClick={handleSave}
                                disabled={saving || saved || !quoteText?.trim()}
                                className="ath-btn ath-btn--primary ath-btn--md"
                                style={{ width: '100%', ...(saved ? { background: '#2f9e44' } : {}) }}
                            >
                                {saved ? <><Check size={16} /> Saved!</> : saving ? 'Saving…' : <><Save size={15} /> Save to Commonplace Book</>}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default EntryDrawer;
