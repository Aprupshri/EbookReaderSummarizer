import React, { useState, useEffect } from 'react';
import { Play, Square, ArrowLeft, Save, Clock, BookOpen, X, Sparkles, Settings, BookMarked, Quote } from 'lucide-react';
import { updatePhysicalProgress, saveSummary } from '../utils/storage';
import { motion, AnimatePresence } from 'framer-motion';
import { generateSummary, getAISettings } from '../utils/ai';
import SummaryModal from './SummaryModal';
import SettingsModal from './SettingsModal';
import NotesModal from './NotesModal';
import EntryDrawer from './EntryDrawer';

const ReadingTimer = ({ book, onBack }) => {
    const [isRunning, setIsRunning] = useState(false);
    const [timeInSeconds, setTimeInSeconds] = useState(0);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [newPage, setNewPage] = useState(book.currentPage || 0);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    const [showSummary, setShowSummary] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [showQuote, setShowQuote] = useState(false);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryText, setSummaryText] = useState('');
    const [showChapterPrompt, setShowChapterPrompt] = useState(false);
    const [chapterInput, setChapterInput] = useState('');

    useEffect(() => {
        let interval;
        if (isRunning) interval = setInterval(() => setTimeInSeconds(s => s + 1), 1000);
        return () => clearInterval(interval);
    }, [isRunning]);

    const formatTime = (s) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
        return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    };

    const handleStop = () => {
        if (timeInSeconds > 0) { setIsRunning(false); setShowSaveModal(true); }
    };

    const handleSaveSession = async () => {
        if (!newPage || parseInt(newPage) <= (book.currentPage || 0)) {
            setSaveError(`Please enter a page number greater than ${book.currentPage || 0}.`);
            return;
        }
        setSaveError(''); setSaving(true);
        const pagesRead = parseInt(newPage) - (book.currentPage || 0);
        await updatePhysicalProgress(book.id, pagesRead, timeInSeconds * 1000, parseInt(newPage));
        setSaving(false);
        onBack();
    };

    const progressPercent = book.totalPages > 0
        ? Math.min(Math.round(((book.currentPage || 0) / book.totalPages) * 100), 100) : 0;

    const handleSummarizeClick = () => {
        const aiSettings = getAISettings();
        if (!aiSettings.apiKey) {
            setShowSettings(true);
            return;
        }
        setShowChapterPrompt(true);
    };

    const handleGenerateSummary = async () => {
        if (!chapterInput.trim()) return;
        setShowChapterPrompt(false); setShowSummary(true); setSummaryLoading(true); setSummaryText('');
        try {
            const metadata = {
                title: book.title,
                author: book.author,
                chapterName: chapterInput.trim(),
                progress: (progressPercent / 100).toString(),
                previousChapters: [],
                anchors: null,
            };

            const summary = await generateSummary(metadata);
            setSummaryText(summary);
            await saveSummary(book.id, chapterInput.trim(), summary);
        } catch (error) {
            console.error(error);
            if (error.message.includes('limit: 0')) {
                setSummaryText('**API Key Issue:** Your AI API key may be invalid or restricted. Please verify your AI provider settings.');
            } else {
                setSummaryText(`Error: ${error.message}. Please check your AI settings.`);
            }
        } finally {
            setSummaryLoading(false);
        }
    };

    return (
        <div className="ath-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 32 }}>

            {/* Header */}
            <header style={{ width: '100%', maxWidth: 640, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40, padding: '0 16px' }}>
                <button onClick={onBack} className="ath-iconbtn">
                    <ArrowLeft size={22} />
                </button>
                <div style={{ textAlign: 'center', flex: 1, padding: '0 12px', overflow: 'hidden' }}>
                    <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</h1>
                    <p style={{ fontSize: 13, color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.author}</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={handleSummarizeClick} className="ath-btn ath-btn--accentsoft ath-btn--sm">
                        <Sparkles size={14} />
                        <span className="hidden sm:inline">Summarize</span>
                    </button>
                    <button onClick={() => setShowQuote(true)} className="ath-btn ath-btn--secondary ath-btn--sm">
                        <Quote size={14} />
                        <span className="hidden sm:inline">Quote</span>
                    </button>
                    <button onClick={() => setShowNotes(true)} className="ath-btn ath-btn--secondary ath-btn--sm">
                        <BookMarked size={14} />
                        <span className="hidden sm:inline">Notes</span>
                    </button>
                    <button onClick={() => setShowSettings(true)} className="ath-iconbtn">
                        <Settings size={18} />
                    </button>
                </div>
            </header>

            {/* Timer card */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{
                    background: 'var(--surface)', border: '1px solid var(--line)',
                    borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-md)',
                    padding: '48px 32px', width: '100%', maxWidth: 420,
                    textAlign: 'center', margin: '0 16px',
                }}
            >
                <div className="mono" style={{ fontSize: 'clamp(3rem, 12vw, 5rem)', color: 'var(--ink)', marginBottom: 40, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}>
                    {formatTime(timeInSeconds)}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
                    {!isRunning ? (
                        <button
                            onClick={() => setIsRunning(true)}
                            style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--accent)', color: 'var(--on-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 24px color-mix(in oklab, var(--accent) 40%, transparent)', border: 0, cursor: 'pointer', transition: 'transform .15s', fontSize: 0 }}
                            onMouseDown={e => e.currentTarget.style.transform = 'scale(.94)'}
                            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <Play size={32} style={{ marginLeft: 4 }} />
                        </button>
                    ) : (
                        <button
                            onClick={handleStop}
                            style={{ width: 80, height: 80, borderRadius: '50%', background: '#e03131', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 24px rgba(224,49,49,.38)', border: 0, cursor: 'pointer', animation: 'pulse 2s infinite', fontSize: 0 }}
                        >
                            <Square size={28} />
                        </button>
                    )}
                </div>
            </motion.div>

            {/* Progress bar */}
            <div style={{ width: '100%', maxWidth: 420, marginTop: 40, padding: '0 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <BookOpen size={14} /> Page {book.currentPage || 0}
                    </span>
                    <span>{progressPercent}% Complete</span>
                </div>
                <div style={{ height: 6, background: 'var(--line)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--accent)', width: `${progressPercent}%`, transition: 'width .5s', borderRadius: 99 }} />
                </div>
            </div>

            {/* Save session modal */}
            <AnimatePresence>
                {showSaveModal && (
                    <div className="ath-overlay" style={{ zIndex: 60 }} onClick={() => setShowSaveModal(false)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-xl)', padding: 24, width: '100%', maxWidth: 360, boxShadow: 'var(--shadow-lg)' }}
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Session Complete!</h3>
                            <p style={{ color: 'var(--ink-soft)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                                <Clock size={15} /> You read for {formatTime(timeInSeconds)}.
                            </p>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--ink-soft)', marginBottom: 8 }}>
                                What page did you stop on?
                            </label>
                            <input
                                type="number"
                                min={(book.currentPage || 0) + 1}
                                max={book.totalPages || 9999}
                                value={newPage}
                                onChange={e => { setNewPage(e.target.value); setSaveError(''); }}
                                className="ath-input"
                                style={{ fontSize: 18, marginBottom: 6 }}
                            />
                            {saveError && (
                                <p style={{ fontSize: 13, color: '#e03131', marginBottom: 12 }}>⚠ {saveError}</p>
                            )}
                            {!saveError && <div style={{ marginBottom: 20 }} />}
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={() => setShowSaveModal(false)} className="ath-btn ath-btn--ghost ath-btn--md" style={{ flex: 1 }}>
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveSession}
                                    disabled={saving || !newPage || parseInt(newPage) <= (book.currentPage || 0)}
                                    className="ath-btn ath-btn--primary ath-btn--md"
                                    style={{ flex: 1 }}
                                >
                                    {saving ? <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin .8s linear infinite' }} /> : <><Save size={16} /> Save</>}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Chapter prompt */}
            <AnimatePresence>
                {showChapterPrompt && (
                    <div className="ath-overlay" style={{ zIndex: 60 }} onClick={() => setShowChapterPrompt(false)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-xl)', padding: 24, width: '100%', maxWidth: 360, boxShadow: 'var(--shadow-lg)' }}
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Sparkles size={18} style={{ color: 'var(--accent)' }} /> AI Summary
                            </h3>
                            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 16, lineHeight: 1.5 }}>
                                To generate an accurate summary without spoilers, what chapter did you just finish reading?
                            </p>
                            <input
                                type="text"
                                placeholder="e.g. Chapter 4 or The Gathering"
                                value={chapterInput}
                                onChange={e => setChapterInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleGenerateSummary()}
                                className="ath-input"
                                autoFocus
                                style={{ marginBottom: 8 }}
                            />
                            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                                <button onClick={() => setShowChapterPrompt(false)} className="ath-btn ath-btn--ghost ath-btn--md" style={{ flex: 1 }}>
                                    Cancel
                                </button>
                                <button
                                    onClick={handleGenerateSummary}
                                    disabled={!chapterInput.trim() || summaryLoading}
                                    className="ath-btn ath-btn--primary ath-btn--md"
                                    style={{ flex: 1 }}
                                >
                                    Generate
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <SummaryModal isOpen={showSummary} onClose={() => setShowSummary(false)} summary={summaryText} isLoading={summaryLoading} />
            <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
            <NotesModal isOpen={showNotes} onClose={() => setShowNotes(false)} bookId={book.id} bookTitle={book.title} />
            <EntryDrawer
                isOpen={showQuote}
                onClose={() => setShowQuote(false)}
                book={book}
            />
        </div>
    );
};

export default ReadingTimer;
