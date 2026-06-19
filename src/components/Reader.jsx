import React, { useState, useEffect, useRef } from 'react';
import 'foliate-js/view.js';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X, BookOpen } from 'lucide-react';
import { useReader } from './Reader/useReader';
import SummaryModal from './SummaryModal';
import RecallModal from './RecallModal';
import ExplainModal from './ExplainModal';
import SettingsModal from './SettingsModal';
import DictionaryModal from './DictionaryModal';
import NotesModal from './NotesModal';
import FocusSetupModal from './FocusSetupModal';
import EntryDrawer from './EntryDrawer';
import ReaderHeader from './Reader/ReaderHeader';
import AppearanceMenu from './Reader/AppearanceMenu';
import TocSidebar from './Reader/TocSidebar';
import ReaderFooter from './Reader/ReaderFooter';
import SelectionMenu from './Reader/SelectionMenu';
import { getHighlights, saveHighlight, deleteHighlight } from '../utils/storage';

const Reader = ({ book, onBack, appTheme, onThemeChange }) => {
    const readerState = useReader({ book, onBack });

    const {
        viewerRef, location, isReady, showSummary, setShowSummary, showSettings, setShowSettings,
        showAppearance, setShowAppearance, showToc, setShowToc, showNotes, setShowNotes, showControls, setShowControls,
        toc, summaryLoading, summaryText, loadError,
        showRecall, setShowRecall, recallText, recallLoading, recallError, recallLength, setRecallLength, isOrientation,
        selection, showDictionary, setShowDictionary, clearSelection,
        showExplain, setShowExplain, explainText, explainLoading, explainError, explainSaved,
        showFocusSetup, setShowFocusSetup, isFocusMode, showFocusExit, focusGoal, focusTimeRemaining, showFocusCelebration,
        settings, update, theme, fontSize, fontFamily, lineHeight, maxWidth, flow,
        handleRecall, handleBack, handlePrev, handleNext, handleSummarize, handleHighlight, handleDictionary,
        handleExplain, handleExplainSave, handleExplainFollowUp, handleStartFocus, handleExitFocus,
        showGenrePicker, setShowGenrePicker, handleGenreConfirmed,
    } = readerState;

    const [bookmarks, setBookmarks] = useState([]);
    const [showToolbarHint, setShowToolbarHint] = useState(false);
    const [showEntryDrawer, setShowEntryDrawer] = useState(false);
    const toolbarHintShown = useRef(false);

    const handleSaveToCommonplace = () => {
        if (!selection?.word) return;
        setShowEntryDrawer(true);
    };

    useEffect(() => {
        if (book?.id) {
            getHighlights(book.id).then(h => {
                setBookmarks(h.filter(x => !x.note));
            });
        }
    }, [book?.id, showToc]);

    useEffect(() => {
        if (isReady && !toolbarHintShown.current && !localStorage.getItem('reader_toolbar_hint_seen')) {
            toolbarHintShown.current = true;
            const t = setTimeout(() => {
                setShowToolbarHint(true);
                setTimeout(() => {
                    setShowToolbarHint(false);
                    localStorage.setItem('reader_toolbar_hint_seen', '1');
                }, 3500);
            }, 1800);
            return () => clearTimeout(t);
        }
    }, [isReady]);

    const currentCfi = location?.start?.cfi;
    const isBookmarked = currentCfi && bookmarks.some(b => b.cfiRange === currentCfi);

    const handleToggleBookmark = async () => {
        if (!currentCfi) return;
        if (isBookmarked) {
            await deleteHighlight(book.id, currentCfi);
            setBookmarks(prev => prev.filter(b => b.cfiRange !== currentCfi));
        } else {
            const label = location?.start?.tocItem?.label || `Page ${location?.start?.displayed?.page || 'Unknown'}`;
            await saveHighlight(book.id, currentCfi, label, 'gray', '');
            setBookmarks(prev => [...prev, { cfiRange: currentCfi, text: label, color: 'gray', note: '', timestamp: Date.now() }]);
        }
    };

    const handleThemeUpdate = (t) => {
        update('theme', t);
        onThemeChange?.(t);
    };

    return (
        <div className="ath-reader" data-theme={theme}>
            <ReaderHeader
                theme={theme}
                showControls={showControls}
                isFocusMode={isFocusMode}
                handleBack={handleBack}
                bookTitle={book.title}
                handleSummarize={handleSummarize}
                onRecallClick={() => setShowRecall(true)}
                setShowNotes={setShowNotes}
                setShowFocusSetup={setShowFocusSetup}
                showToc={showToc}
                setShowToc={setShowToc}
                showAppearance={showAppearance}
                setShowAppearance={setShowAppearance}
                setShowSettings={setShowSettings}
                isBookmarked={isBookmarked}
                onToggleBookmark={handleToggleBookmark}
            />

            <AppearanceMenu
                showAppearance={showAppearance}
                setShowAppearance={setShowAppearance}
                theme={theme}
                update={update}
                onThemeChange={handleThemeUpdate}
                fontSize={fontSize}
                fontFamily={fontFamily}
                maxWidth={maxWidth}
                lineHeight={lineHeight}
                flow={flow}
            />

            <div className="absolute ios-pwa-reader" style={{ inset: 0, top: 'var(--safe-pt)', background: 'var(--paper)' }}>
                {loadError && (
                    <div style={{ position: 'absolute', inset: '80px 16px auto', zIndex: 100, background: 'color-mix(in oklab, red 10%, var(--surface))', border: '1px solid color-mix(in oklab, red 25%, var(--line))', borderRadius: 'var(--r-lg)', padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: 'var(--shadow-lg)', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>Error Loading Book</span>
                        <p style={{ fontSize: 12, fontFamily: 'monospace', wordBreak: 'break-all', maxWidth: '90%', color: 'var(--ink-soft)' }}>{loadError}</p>
                        <button onClick={onBack} className="ath-btn ath-btn--primary ath-btn--sm" style={{ marginTop: 4 }}>Go Back</button>
                    </div>
                )}

                <foliate-view
                    key={`viewer-${book.id}-${book.openedAt || ''}`}
                    ref={viewerRef}
                    className="absolute inset-0"
                    style={{ outline: 'none', background: 'var(--paper)' }}
                />

                {flow === 'paginated' && (
                    <div className="absolute inset-0 z-10 pointer-events-none">
                        <div
                            className="absolute inset-y-0 left-0 w-20 pointer-events-auto cursor-pointer nav-overlay"
                            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                        />
                        <div
                            className="absolute inset-y-0 right-0 w-20 pointer-events-auto cursor-pointer nav-overlay"
                            onClick={(e) => { e.stopPropagation(); handleNext(); }}
                        />
                    </div>
                )}
            </div>

<<<<<<< HEAD
    const handleSummarize = async () => {
        const aiSettings = getAISettings();
        const providerConfig = PROVIDERS.find((p) => p.id === aiSettings.provider);
        if (providerConfig?.requiresApiKey && !aiSettings.apiKey) {
            setShowSettings(true);
            return;
        }

        setShowSummary(true);
        setSummaryLoading(true);
        setSummaryText('');

        try {
            const currentLocation = renditionRef.current.location.start;
            const epubBook = bookRef.current;
            const chapterItem = epubBook.spine.get(currentLocation.cfi);
            const chapterName = chapterItem.href;

            let betterChapterTitle = chapterName;
            let previousChapters = [];

            const toc = epubBook.navigation.toc;
            const currentChapterIndex = toc.findIndex(item => item.href.includes(chapterItem.href));

            if (currentChapterIndex !== -1) {
                betterChapterTitle = toc[currentChapterIndex].label;
                previousChapters = toc.slice(0, currentChapterIndex).map(item => item.label);
            }

            const anchors = await extractChapterAnchors(epubBook, chapterItem.href);

            const metadata = {
                title: book.title,
                author: book.author,
                chapterName: betterChapterTitle,
                progress: currentLocation.percentage,
                previousChapters,
                anchors,
            };

            const summary = await generateSummary(metadata);
            setSummaryText(summary);
        } catch (error) {
            console.error(error);
            if (error.message.includes('limit: 0')) {
                setSummaryText('**API Key Issue:** Your AI API key may be invalid or restricted. Please verify your AI provider settings.');
            } else if (error.message.includes('Too many requests')) {
                setSummaryText(`🚦 **Slow down:** ${error.message}`);
            } else {
                setSummaryText(`Error: ${error.message}. Please check your AI settings.`);
            }
        } finally {
            setSummaryLoading(false);
        }
    };
=======
            <TocSidebar
                showToc={showToc}
                setShowToc={setShowToc}
                theme={theme}
                toc={toc}
                onNavigate={async (href) => {
                    const v = viewerRef.current;
                    if (!v) return;
                    if (href === 'next') { v.next(); return; }
                    if (href === 'prev') { v.prev(); return; }
                    try {
                        await new Promise(r => setTimeout(r, 100));
                        await viewerRef.current.goTo(href);
                    } catch (err) {
                        if (typeof href === 'string' && href.includes('#')) {
                            try { await viewerRef.current.goTo(href.split('#')[0]); } catch {}
                        }
                    }
                }}
                bookTitle={book.title}
                bookId={book.id}
                location={location}
                viewerRef={viewerRef}
            />
>>>>>>> d7159da (feat: implement Atheneum design system — SVG logo, welcome screen, AI sheets, insights polish)

            <ReaderFooter
                showControls={showControls}
                isFocusMode={isFocusMode}
                theme={theme}
                location={location}
                toc={toc}
                onMenuClick={() => setShowToc(true)}
                onNavigate={async (href) => {
                    const v = viewerRef.current;
                    if (!v) return;
                    if (href === 'next') { v.next(); return; }
                    if (href === 'prev') { v.prev(); return; }
                    try {
                        await new Promise(r => setTimeout(r, 60));
                        await v.goTo(href);
                    } catch {}
                }}
            />

            <AnimatePresence>
                {showToolbarHint && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        style={{
                            position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 200,
                            background: 'color-mix(in oklab, var(--ink) 85%, transparent)',
                            backdropFilter: 'blur(8px)',
                            color: 'var(--paper)',
                            fontSize: 13, padding: '10px 18px', borderRadius: 'var(--r-lg)',
                            boxShadow: 'var(--shadow-lg)',
                            display: 'flex', alignItems: 'center', gap: 8,
                            pointerEvents: 'none', whiteSpace: 'nowrap',
                        }}
                    >
                        <span style={{ fontSize: 16 }}>☝</span>
                        <span>Tap the page to show or hide the toolbar</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <RecallModal
                isOpen={showRecall}
                onClose={() => setShowRecall(false)}
                onGenerate={(len) => handleRecall(len)}
                recallText={recallText}
                isLoading={recallLoading}
                isOrientation={isOrientation}
                activeLength={recallLength}
                onLengthChange={(len, shouldFetch = true) => {
                    setRecallLength(len);
                    if (shouldFetch) handleRecall(len);
                }}
                error={recallError}
            />

            <FocusSetupModal isOpen={showFocusSetup} onClose={() => setShowFocusSetup(false)} onStart={handleStartFocus} />

            <AnimatePresence>
                {isFocusMode && showFocusExit && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
                        style={{ position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
                    >
                        {focusGoal > 0 && (
                            <div style={{
                                background: 'color-mix(in oklab, var(--ink) 75%, transparent)',
                                backdropFilter: 'blur(8px)',
                                color: 'var(--paper)',
                                fontSize: 11, fontWeight: 700, padding: '6px 14px',
                                borderRadius: 99, boxShadow: 'var(--shadow-lg)', letterSpacing: '0.08em',
                            }}>
                                {Math.floor(focusTimeRemaining / 60)}:{String(focusTimeRemaining % 60).padStart(2, '0')} REMAINING
                            </div>
                        )}
                        <button
                            onClick={handleExitFocus}
                            style={{
                                background: '#e03131', color: '#fff',
                                border: '1px solid rgba(255,255,255,0.15)',
                                backdropFilter: 'blur(8px)',
                                padding: '12px 24px', borderRadius: 99,
                                fontWeight: 700, fontSize: 14,
                                boxShadow: 'var(--shadow-lg)',
                                display: 'flex', alignItems: 'center', gap: 8,
                                cursor: 'pointer', transition: 'opacity .15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        >
                            <X size={18} /> Exit Focus
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showFocusCelebration && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, scale: 0.9 }} animate={{ opacity: 1, y: 20, scale: 1 }} exit={{ opacity: 0, y: -50, scale: 0.9 }}
                        style={{
                            position: 'fixed', top: 'var(--safe-pt, 0px)', left: '50%', transform: 'translateX(-50%)',
                            zIndex: 100, marginTop: 16,
                            background: 'var(--accent)', color: 'var(--on-accent)',
                            padding: '16px 24px', borderRadius: 'var(--r-xl)',
                            boxShadow: 'var(--shadow-lg)',
                            display: 'flex', alignItems: 'center', gap: 16, minWidth: 300,
                        }}
                    >
                        <Sparkles size={26} style={{ opacity: 0.9, flexShrink: 0 }} />
                        <div>
                            <p style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>Session Complete!</p>
                            <p style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>You crushed your {focusGoal}-minute goal.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showGenrePicker && (
                    <motion.div
                        key="genre-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6"
                        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
                    >
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0, y: 16 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.92, opacity: 0, y: 16 }}
                            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                width: '100%', maxWidth: 360,
                                background: 'var(--surface)', border: '1px solid var(--line)',
                                borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-lg)', padding: 24,
                            }}
                        >
                            <p className="serif" style={{ textAlign: 'center', fontWeight: 700, fontSize: 18, color: 'var(--ink)', marginBottom: 6 }}>One quick thing</p>
                            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-soft)', marginBottom: 24 }}>
                                What kind of book is <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{book.title}</span>? This helps tailor your summaries.
                            </p>
                            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                                <button
                                    onClick={() => handleGenreConfirmed('fiction')}
                                    className="ath-btn ath-btn--secondary"
                                    style={{ flex: 1, flexDirection: 'column', alignItems: 'center', gap: 4, height: 'auto', padding: '14px 8px' }}
                                >
                                    <BookOpen size={22} style={{ color: 'var(--accent)' }} />
                                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Fiction</span>
                                    <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Story, characters, plot</span>
                                </button>
                                <button
                                    onClick={() => handleGenreConfirmed('nonfiction')}
                                    className="ath-btn ath-btn--secondary"
                                    style={{ flex: 1, flexDirection: 'column', alignItems: 'center', gap: 4, height: 'auto', padding: '14px 8px' }}
                                >
                                    <Sparkles size={22} style={{ color: '#2f9e44' }} />
                                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Non-Fiction</span>
                                    <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Ideas, facts, knowledge</span>
                                </button>
                            </div>
                            <button
                                onClick={() => setShowGenrePicker(false)}
                                className="ath-btn ath-btn--ghost ath-btn--md"
                                style={{ width: '100%' }}
                            >
                                Cancel
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <SummaryModal isOpen={showSummary} onClose={() => setShowSummary(false)} summary={summaryText} isLoading={summaryLoading} />
            <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

            <NotesModal
                isOpen={showNotes}
                onClose={() => setShowNotes(false)}
                bookId={book.id}
                bookTitle={book.title}
                onDeleteHighlight={(cfiRange) => {
                    if (viewerRef.current) {
                        try { viewerRef.current.deleteAnnotation({ value: cfiRange }); } catch {}
                    }
                }}
                onClickHighlight={(cfiRange) => {
                    setShowNotes(false);
                    if (viewerRef.current) {
                        setTimeout(() => {
                            try { viewerRef.current.goTo(cfiRange); } catch {}
                        }, 100);
                    }
                }}
            />

            <ExplainModal
                isOpen={showExplain}
                onClose={() => setShowExplain(false)}
                selectedText={readerState.selection?.word}
                explanation={explainText}
                isLoading={explainLoading}
                error={explainError}
                onRetry={() => handleExplain()}
                onSave={handleExplainSave}
                isSaved={explainSaved}
                onFollowUp={handleExplainFollowUp}
                theme={theme}
            />

            <DictionaryModal isOpen={showDictionary} onClose={() => { setShowDictionary(false); clearSelection(); }} word={selection?.word} />

            <SelectionMenu
                selection={selection}
                showDictionary={showDictionary}
                handleHighlight={handleHighlight}
                handleSaveToCommonplace={handleSaveToCommonplace}
                handleExplain={handleExplain}
                handleDictionary={handleDictionary}
                clearSelection={clearSelection}
            />

            <EntryDrawer
                isOpen={showEntryDrawer}
                onClose={() => { setShowEntryDrawer(false); clearSelection(); }}
                quote={selection?.word}
                book={book}
                chapter={location?.start?.tocItem?.label || ''}
                cfi={location?.start?.cfi || null}
                theme={theme}
            />
        </div>
    );
};

export default Reader;
