import React from 'react';
import { ArrowLeft, Sparkles, Clock, BookMarked, Bookmark, BookmarkPlus, Type } from 'lucide-react';

const ReaderHeader = ({
    theme,
    showControls,
    isFocusMode,
    handleBack,
    bookTitle,
    handleSummarize,
    onRecallClick,
    setShowNotes,
    setShowFocusSetup,
    showToc,
    setShowToc,
    showAppearance,
    setShowAppearance,
    setShowSettings,
    isBookmarked,
    onToggleBookmark,
}) => {
    return (
        <header className={`ath-rheader${showControls && !isFocusMode ? '' : ' is-hidden'}`}>
            <div className="ath-rheader-l">
                <button onClick={handleBack} className="ath-iconbtn" aria-label="Back">
                    <ArrowLeft size={19} strokeWidth={2} />
                </button>
                <div className="ath-rheader-titles">
                    <div className="ath-rheader-title serif">{bookTitle}</div>
                </div>
            </div>

            <div className="ath-rheader-r">
                <button
                    onClick={handleSummarize}
                    className="ath-btn ath-btn--accentsoft ath-btn--sm ath-hide-sm-inline"
                    title="Summarize"
                >
                    <Sparkles size={14} />
                    <span>Summarize</span>
                </button>

                <button
                    onClick={onRecallClick}
                    className="ath-btn ath-btn--secondary ath-btn--sm ath-hide-sm-inline"
                    title="Recall — get caught up on what's happened so far"
                >
                    <Clock size={14} />
                    <span>Recall</span>
                </button>

                <button
                    onClick={onToggleBookmark}
                    className={`ath-iconbtn${isBookmarked ? ' is-active' : ''}`}
                    title={isBookmarked ? 'Remove Bookmark' : 'Add Bookmark'}
                >
                    {isBookmarked ? <Bookmark size={18} fill="currentColor" /> : <BookmarkPlus size={18} />}
                </button>

                <button
                    onClick={() => setShowNotes(true)}
                    className="ath-iconbtn"
                    title="Highlights & Notes"
                >
                    <BookMarked size={18} />
                </button>

                <button
                    onClick={() => setShowAppearance(v => !v)}
                    className={`ath-iconbtn${showAppearance ? ' is-active' : ''}`}
                    title="Appearance"
                >
                    <Type size={18} />
                </button>
            </div>
        </header>
    );
};

export default ReaderHeader;
