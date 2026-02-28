import React, { useState, useEffect } from 'react';
import 'foliate-js/view.js';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { useReader } from './Reader/useReader';

import SummaryModal from './SummaryModal';
import RecallModal from './RecallModal';
import ExplainModal from './ExplainModal';
import SettingsModal from './SettingsModal';
import DictionaryModal from './DictionaryModal';
import NotesModal from './NotesModal';
import PredictionPrompt from './PredictionPrompt';
import ReflectionCard from './ReflectionCard';
import FocusSetupModal from './FocusSetupModal';
import ReaderHeader from './Reader/ReaderHeader';
import AppearanceMenu from './Reader/AppearanceMenu';
import TocSidebar from './Reader/TocSidebar';
import ReaderFooter from './Reader/ReaderFooter';
import SelectionMenu from './Reader/SelectionMenu';
import { updatePredictionOutcome, savePrediction, setBookGenre, getHighlights, saveHighlight, deleteHighlight } from '../utils/storage';

const Reader = ({ book, onBack }) => {
    const readerState = useReader({ book, onBack });

    // Destructure everything needed from our custom hook
    const {
        viewerRef, location, isReady, showSummary, setShowSummary, showSettings, setShowSettings,
        showAppearance, setShowAppearance, showToc, setShowToc, showNotes, setShowNotes, showControls, setShowControls,
        toc, summaryLoading, summaryText, loadError,
        showRecall, setShowRecall, recallText, recallLoading, recallError, recallLength, setRecallLength, isOrientation,
        selection, showDictionary, setShowDictionary, clearSelection,
        showExplain, setShowExplain, explainText, explainLoading, explainError, explainSaved,
        showPrediction, setShowPrediction, showReflection, setShowReflection, sessionPrediction, setSessionPrediction, pendingBack, setPendingBack,
        showFocusSetup, setShowFocusSetup, isFocusMode, showFocusExit, focusGoal, focusTimeRemaining, showFocusCelebration,
        settings, update, theme, fontSize, fontFamily, lineHeight, maxWidth, flow,
        handleRecall, handleBack, handlePrev, handleNext, handleSummarize, handleHighlight, handleDictionary,
        handleExplain, handleExplainSave, handleExplainFollowUp, handleStartFocus, handleExitFocus,
    } = readerState;

    const [bookmarks, setBookmarks] = useState([]);

    // Keep bookmarks state fresh
    useEffect(() => {
        if (book?.id) {
            getHighlights(book.id).then(h => {
                // Bookmarks are highlights without a 'note'
                setBookmarks(h.filter(x => !x.note));
            });
        }
    }, [book?.id, showToc]); // Refresh when TOC opens (in case deleted there)

    // Check if the exact current CFI is bookmarked
    const currentCfi = location?.start?.cfi;
    const isBookmarked = currentCfi && bookmarks.some(b => b.cfiRange === currentCfi);

    const handleToggleBookmark = async () => {
        if (!currentCfi) return;

        if (isBookmarked) {
            await deleteHighlight(book.id, currentCfi);
            setBookmarks(prev => prev.filter(b => b.cfiRange !== currentCfi));
        } else {
            const label = location?.start?.tocItem?.label || `Page ${location?.start?.displayed?.page || 'Unknown'}`;
            // Use 'gray' color to distinguish from real highlights internally, empty note
            await saveHighlight(book.id, currentCfi, label, 'gray', '');
            setBookmarks(prev => [...prev, { cfiRange: currentCfi, text: label, color: 'gray', note: '', timestamp: Date.now() }]);
        }
    };

    return (
        <div className={`flex-1 w-full flex flex-col relative overflow-hidden ${theme === 'dark' ? 'bg-gray-900 text-white' : theme === 'sepia' ? 'bg-[#f4ecd8] text-[#5b4636]' : 'bg-white text-gray-900'}`}>
            {/* Extracted Top Toolbar & Appearance Menu */}
            <ReaderHeader
                theme={theme}
                showControls={showControls}
                isFocusMode={isFocusMode}
                handleBack={handleBack}
                bookTitle={book.title}
                handleSummarize={handleSummarize}
                onRecallClick={() => {
                    setShowRecall(true);
                    // Clear state before opening usually handled nicely by handleRecall
                }}
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
                fontSize={fontSize}
                fontFamily={fontFamily}
                maxWidth={maxWidth}
                lineHeight={lineHeight}
                flow={flow}
            />

            {/* Reader Area */}
            <div className={`absolute bottom-0 left-0 right-0 ${theme === 'dark' ? 'bg-gray-900' : theme === 'sepia' ? 'bg-[#f4ecd8]' : 'bg-gray-50'}`} style={{ top: 'var(--safe-pt)' }}>
                {loadError && (
                    <div className="absolute inset-x-4 top-20 z-[100] bg-red-100 dark:bg-red-900/50 rounded-xl p-4 text-red-900 dark:text-red-100 flex flex-col items-center justify-center text-center shadow-lg border border-red-200 dark:border-red-800">
                        <span className="font-bold text-lg mb-2">⚠ Error Loading Book</span>
                        <p className="text-sm font-mono break-all max-w-[90%]">{loadError}</p>
                        <button onClick={onBack} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg">
                            Go Back
                        </button>
                    </div>
                )}

                <foliate-view ref={viewerRef} class={`absolute inset-0 ${theme === 'dark' ? 'bg-gray-900' : theme === 'sepia' ? 'bg-[#f4ecd8]' : 'bg-white'}`} style={{ outline: 'none' }} />

                {/* Navigation Overlays */}
                {flow === 'paginated' && (
                    <>
                        <div className="absolute inset-y-0 left-0 w-1/6 z-0" onClick={handlePrev} />
                        <div className="absolute inset-y-0 right-0 w-1/6 z-0" onClick={handleNext} />
                    </>
                )}
            </div>

            <TocSidebar
                showToc={showToc}
                setShowToc={setShowToc}
                theme={theme}
                toc={toc}
                onNavigate={(href) => viewerRef.current?.goTo(href)}
                bookTitle={book.title}
                bookId={book.id}
                location={location}
                viewerRef={viewerRef}
            />

            {/* Bottom Toolbar / Progress */}
            <ReaderFooter
                showControls={showControls}
                isFocusMode={isFocusMode}
                theme={theme}
                location={location}
                toc={toc}
                onMenuClick={() => setShowToc(true)}
                onNavigate={(href) => viewerRef.current?.goTo(href)}
            />

            <RecallModal
                isOpen={showRecall}
                onClose={() => {
                    setShowRecall(false);
                    // After any recall dismissal, invite a curiosity nudge if not already set
                    if (!sessionPrediction) {
                        setShowPrediction(true);
                    }
                }}
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

            <PredictionPrompt
                isOpen={showPrediction}
                genre={book.genre ?? null}
                onGenreSelect={async (genre) => {
                    if (!book.genre) await setBookGenre(book.id, genre);
                }}
                onSubmit={async (text, genre) => {
                    if (!book.genre) await setBookGenre(book.id, genre);
                    const ts = Date.now();
                    await savePrediction(book.id, text, genre);
                    setSessionPrediction({ text, genre, timestamp: ts });
                    setShowPrediction(false);
                }}
                onSkip={() => setShowPrediction(false)}
            />

            <ReflectionCard
                isOpen={showReflection}
                prediction={sessionPrediction}
                onOutcome={async (outcome) => {
                    if (sessionPrediction) {
                        await updatePredictionOutcome(book.id, sessionPrediction.timestamp, outcome);
                    }
                    setShowReflection(false);
                    setSessionPrediction(null);
                    onBack();
                }}
                onSkip={() => {
                    setShowReflection(false);
                    setPendingBack(false);
                    onBack();
                }}
            />

            <FocusSetupModal isOpen={showFocusSetup} onClose={() => setShowFocusSetup(false)} onStart={handleStartFocus} />

            <AnimatePresence>
                {isFocusMode && showFocusExit && (
                    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3">
                        {focusGoal > 0 && (
                            <div className="bg-black/70 backdrop-blur-md text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xl tracking-wider">
                                {Math.floor(focusTimeRemaining / 60)}:{String(focusTimeRemaining % 60).padStart(2, '0')} REMAINING
                            </div>
                        )}
                        <button onClick={handleExitFocus} className="bg-red-500/90 hover:bg-red-600 backdrop-blur-md text-white px-6 py-3 rounded-full font-bold shadow-xl transition-all active:scale-95 flex items-center gap-2 border border-red-400/30">
                            <X size={20} /> Exit Focus
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showFocusCelebration && (
                    <motion.div initial={{ opacity: 0, y: -50, scale: 0.9 }} animate={{ opacity: 1, y: 20, scale: 1 }} exit={{ opacity: 0, y: -50, scale: 0.9 }} className="fixed top-safe left-1/2 -translate-x-1/2 z-[100] mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[300px]">
                        <Sparkles size={28} className="text-emerald-100 flex-shrink-0" />
                        <div>
                            <p className="font-bold text-base leading-tight">Session Complete!</p>
                            <p className="text-xs text-emerald-50 mt-0.5">You crushed your {focusGoal}-minute goal.</p>
                        </div>
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
                        try { viewerRef.current.deleteAnnotation({ value: cfiRange }); } catch (e) { }
                    }
                }}
                onClickHighlight={(cfiRange) => {
                    setShowNotes(false);
                    if (viewerRef.current) {
                        setTimeout(() => {
                            try { viewerRef.current.goTo(cfiRange); } catch (e) { }
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
                handleExplain={handleExplain}
                handleDictionary={handleDictionary}
                clearSelection={clearSelection}
            />
        </div>
    );
};

export default Reader;
