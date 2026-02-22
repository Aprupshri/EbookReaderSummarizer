import React, { useEffect, useRef, useState } from 'react';
import 'foliate-js/view.js';
import { Overlayer } from 'foliate-js/overlayer.js';
import { updateProgress, saveEbookSession, saveHighlight, getHighlights, deleteHighlight, saveSummary } from '../utils/storage';
import { generateSummary } from '../utils/gemini';
import { useReaderSettings } from '../utils/useReaderSettings';
import { ArrowLeft, Settings, Sparkles, ChevronLeft, ChevronRight, Type, AlignJustify, Scroll, X, List, Highlighter, BookOpen, BookMarked } from 'lucide-react';
import SummaryModal from './SummaryModal';
import SettingsModal from './SettingsModal';
import DictionaryModal from './DictionaryModal';
import NotesModal from './NotesModal';
import { StatusBar, Style } from '@capacitor/status-bar';

const Reader = ({ book, onBack }) => {
    const viewerRef = useRef(null);
    const [location, setLocation] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showAppearance, setShowAppearance] = useState(false);
    const [showToc, setShowToc] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [toc, setToc] = useState([]);

    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryText, setSummaryText] = useState('');
    const [loadError, setLoadError] = useState(null);

    const [selection, setSelection] = useState(null);
    const [showDictionary, setShowDictionary] = useState(false);
    const selectionRef = useRef(null);

    // ✅ Persisted appearance settings — must be before any useEffect that uses `theme`
    const { settings, update } = useReaderSettings();
    const { theme, fontSize, fontFamily, lineHeight, maxWidth, flow } = settings;

    // Toggle Android status bar with the controls (immersive reading mode)
    useEffect(() => {
        const toggle = async () => {
            try {
                if (showControls) {
                    await StatusBar.show();
                    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light });
                } else {
                    await StatusBar.hide();
                }
            } catch (_) { /* no-op on web */ }
        };
        toggle();
        // Restore status bar when leaving the reader
        return () => { StatusBar.show().catch(() => { }); };
    }, [showControls, theme]);


    // ✅ Session Tracking
    const sessionRef = useRef({
        startTime: Date.now(),
        startPage: null,
        lastPage: null,
        maxPageReached: 0
    });

    useEffect(() => {
        if (!book || !viewerRef.current) return;

        const view = viewerRef.current;
        let isActive = true;

        const initBook = async () => {
            try {
                // foliate-view has an open() method that accepts a File or Blob.
                // Depending on the format of book.file (ArrayBuffer or Blob), we might need to convert it.
                let fileToOpen = book.file;
                if (!(fileToOpen instanceof Blob)) {
                    // Was stored as ArrayBuffer - wrap as a proper File object with .epub extension
                    // foliate-js needs the filename to detect the format
                    fileToOpen = new File(
                        [fileToOpen],
                        (book.title || 'book') + '.epub',
                        { type: 'application/epub+zip' }
                    );
                }
                await view.open(fileToOpen);

                // Always navigate after open() - foliate-view won't render
                // content until an explicit navigation is triggered.
                await view.goTo(book.cfi || 0);

                // Read TOC after open
                const foliateBook = view.book;
                if (foliateBook) {
                    setToc(foliateBook.toc || []);
                }

                setIsReady(true);

                // Wait for the renderer to be ready before applying annotations is now handled
                // by the 'load' event listener below.

            } catch (err) {
                console.error("Foliate load error", err);
                setLoadError(err.message || String(err));
            }
        };

        const handleRelocate = (e) => {
            const detail = e.detail;
            if (!detail) return;

            // Re-shape foliate's location detail into our state variable
            const sectionCurrent = detail.section?.current !== undefined ? detail.section.current + 1 : (detail.index !== undefined ? detail.index + 1 : 1);
            const sectionTotal = detail.section?.total || view.book?.sections?.length || 1;

            const locationData = {
                start: {
                    cfi: detail.cfi,
                    percentage: detail.fraction,
                    displayed: { page: sectionCurrent, total: sectionTotal }, // Approximations for now
                    tocItem: detail.tocItem,
                }
            };

            setLocation(locationData);
            if (detail.cfi) {
                updateProgress(book.id, detail.cfi);
            }

            if (detail.index !== undefined) {
                const currentPage = detail.index;
                if (sessionRef.current.startPage === null) {
                    sessionRef.current.startPage = currentPage;
                }
                sessionRef.current.lastPage = currentPage;
                sessionRef.current.maxPageReached = Math.max(sessionRef.current.maxPageReached, currentPage);
            }
        };

        view.addEventListener('relocate', handleRelocate);

        view.addEventListener('draw-annotation', e => {
            const { draw, annotation } = e.detail;
            const color = annotation.color || 'yellow';
            draw(Overlayer.highlight, { color });
        });

        const handleLoad = async (e) => {
            const { doc, index } = e.detail;

            // Apply theme NOW — renderer is ready for this section
            updateTheme(view);

            // Re-apply highlights for this newly loaded section
            try {
                const savedHighlights = await getHighlights(book.id);
                if (savedHighlights && savedHighlights.length > 0) {
                    for (const hl of savedHighlights) {
                        try {
                            view.addAnnotation({ value: hl.cfiRange, color: hl.color || 'yellow' });
                        } catch (err) {
                            // cfi might not belong to this index, foliate ignores it or throws, safely catch
                        }
                    }
                }
            } catch (err) {
                console.warn("Could not load highlights for section", err);
            }

            doc.addEventListener('selectionchange', () => {
                const sel = doc.getSelection();
                const word = sel.toString().trim();

                if (word && word.length > 0) {
                    try {
                        const range = sel.getRangeAt(0);
                        const cfiRange = view.getCFI(index, range);
                        setSelection({ word, cfiRange });
                    } catch (err) {
                        setSelection({ word, cfiRange: null });
                    }
                } else {
                    setSelection(null);
                }
            });

            // ✅ Immersive mode toggle on click
            doc.addEventListener('click', (ev) => {
                const sel = doc.getSelection();
                if (sel && sel.toString().trim().length > 0) return; // Don't toggle if selecting text
                if (ev.target.closest('a') || ev.target.tagName.toLowerCase() === 'img') return;

                setShowControls(prev => {
                    if (prev) {
                        setShowAppearance(false);
                        setShowToc(false);
                        setShowSettings(false);
                        setShowNotes(false);
                    }
                    return !prev;
                });
            });
        };

        view.addEventListener('load', handleLoad);

        // ── Selection approach ─────────────────────────────────────
        // Since Foliate renders into an iframe (or shadow DOM), we can listen to selectionchange on its document
        // Or listen for custom text selection events. Foliate doesn't fire a custom 'selected' event by default.
        // We will add an overlay interceptor below.

        initBook();

        return () => {
            isActive = false;
            view.removeEventListener('relocate', handleRelocate);
            view.removeEventListener('load', handleLoad);
            try { view.close && view.close(); } catch (_) { /* foliate cleanup may throw if renderer was never initialized */ }
        };
    }, [book, flow]);

    // Update styles when settings change
    useEffect(() => {
        if (viewerRef.current) {
            updateTheme(viewerRef.current);
        }
    }, [theme, fontSize, fontFamily, lineHeight, maxWidth]);

    const updateTheme = (view) => {
        if (!view) return;
        const themes = {
            light: { color: '#1a1a1a', background: '#ffffff' },
            dark: { color: '#e5e7eb', background: '#111827' },
            sepia: { color: '#5b4636', background: '#f4ecd8' }
        };

        const selectedTheme = themes[theme] || themes.light;

        const inlineStyles = `
            body {
                background: ${selectedTheme.background} !important;
                color: ${selectedTheme.color} !important;
                font-family: ${fontFamily} !important;
                line-height: ${lineHeight} !important;
                font-size: ${fontSize}% !important;
                padding: 0 10px !important;
                margin: 0;
            }
            p, div, span, h1, h2, h3, h4, h5, h6, li, blockquote, a {
                color: ${selectedTheme.color} !important;
                font-family: ${fontFamily} !important;
                line-height: ${lineHeight} !important;
                background: transparent !important;
            }
            ::selection {
                background: rgba(255, 255, 0, 0.3) !important;
            }
        `;

        // foliate-view injects CSS using the .renderer.setStyles() API
        if (view.renderer && view.renderer.setStyles) {
            view.renderer.setStyles(inlineStyles);

            // Setup view properties and layout settings
            view.renderer.setAttribute('margin', '20px');
            view.renderer.setAttribute('max-inline-size', maxWidth === '100%' ? '1200px' : maxWidth);
            view.renderer.setAttribute('flow', flow); // 'paginated' or 'scrolled'

            // Setting filter for dark mode natively on the web component part wrapper
            if (theme === 'dark') {
                view.style.setProperty('color-scheme', 'dark');
            } else {
                view.style.setProperty('color-scheme', 'light');
            }
        }
    };

    const handleBack = async () => {
        const durationMs = Date.now() - sessionRef.current.startTime;
        let pagesRead = 0;

        if (sessionRef.current.startPage !== null && sessionRef.current.lastPage !== null) {
            pagesRead = Math.abs(sessionRef.current.lastPage - sessionRef.current.startPage);
        }

        // Only save if meaningful (they read for > 5s or turned a page)
        if (durationMs > 5000 || pagesRead > 0) {
            try {
                await saveEbookSession(book.id, pagesRead, durationMs, sessionRef.current.maxPageReached);
            } catch (e) {
                console.warn("Could not save ebook session", e)
            }
        }

        onBack();
    };

    const handlePrev = () => viewerRef.current?.prev();
    const handleNext = () => viewerRef.current?.next();

    // ✅ Extract "Anchors" (first and last readable paragraph of current chapter)
    const extractChapterAnchors = async (epubBook, chapterHref) => {
        try {
            const doc = await epubBook.load(chapterHref);
            const textNodes = Array.from(doc.body.querySelectorAll('p, div'))
                .map(node => node.textContent.trim())
                .filter(text => text.length > 30); // Filters out empty tags and tiny headers

            if (textNodes.length === 0) return { start: '', end: '' };
            if (textNodes.length === 1) return { start: textNodes[0], end: textNodes[0] };

            return {
                start: textNodes[0].substring(0, 150),
                end: textNodes[textNodes.length - 1].substring(0, 150)
            };
        } catch (err) {
            console.warn('Could not extract anchors for:', chapterHref, err);
            return { start: '', end: '' };
        }
    };

    const handleSummarize = async () => {
        const apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) {
            setShowSettings(true);
            return;
        }

        setShowSummary(true);
        setSummaryLoading(true);
        setSummaryText('');

        try {
            const view = viewerRef.current;
            const foliateBook = view.book;
            const currentLocationDetail = location?.start;
            const cfi = currentLocationDetail?.cfi;

            // Foliate gives us the current section via index
            const currentSectionIndex = location?.start?.displayed?.page ? location.start.displayed.page - 1 : 0;
            const chapterItem = foliateBook.sections[currentSectionIndex];
            const chapterName = chapterItem?.id || `Section ${currentSectionIndex}`;

            let betterChapterTitle = chapterName;
            let previousChapters = [];

            const toc = foliateBook.toc || [];
            // Basic matching of section ID or CFI against TOC index
            const currentChapterIndex = toc.findIndex(item => item.href && item.href.includes(chapterItem?.id));

            if (currentChapterIndex !== -1) {
                betterChapterTitle = toc[currentChapterIndex].label;
                previousChapters = toc.slice(0, currentChapterIndex).map(item => item.label);
            }

            // Extract anchor text natively from the loaded section document
            let anchors = { start: '', end: '' };
            if (chapterItem && chapterItem.createDocument) {
                try {
                    const doc = await chapterItem.createDocument();
                    const textNodes = Array.from(doc.body.querySelectorAll('p, div'))
                        .map(node => node.textContent.trim())
                        .filter(text => text.length > 30);

                    if (textNodes.length > 0) {
                        anchors.start = textNodes[0].substring(0, 150);
                        anchors.end = textNodes[textNodes.length - 1].substring(0, 150);
                    }
                } catch (e) { console.warn(e); }
            }

            const metadata = {
                title: book.title,
                author: book.author,
                chapterName: betterChapterTitle,
                progress: currentLocationDetail?.percentage || Math.max(0, currentSectionIndex / foliateBook.sections.length),
                previousChapters,
                anchors,
            };

            const summary = await generateSummary(metadata, apiKey);
            setSummaryText(summary);
            await saveSummary(book.id, betterChapterTitle, summary);
        } catch (error) {
            console.error(error);
            if (error.message.includes('limit: 0')) {
                setSummaryText(`**API Key Issue:** Your Gemini API Key has its free tier limit set to 0.\n\nThis usually means Google requires you to enable billing in your Google Cloud Console for this project. They won't charge you for our tiny requests, but they require a card on file to unlock the API. \n\n[Go to Google AI Studio to check your billing status](https://aistudio.google.com/app/apikey)`);
            } else if (error.message.includes('Too many requests')) {
                setSummaryText(`🚦 **Slow down:** ${error.message}`);
            } else {
                setSummaryText(`Error: ${error.message}. Please check your API Key in settings.`);
            }
        } finally {
            setSummaryLoading(false);
        }
    };

    const handleHighlight = async () => {
        if (!selection) return;

        try {
            // foliate-js highlight implementation needs a custom overlayer integration
            console.log("Saving highlight: ", selection.word, selection.cfiRange);
            await saveHighlight(book.id, selection.cfiRange, selection.word, 'yellow');

            // Visually apply it to foliate
            if (viewerRef.current) {
                viewerRef.current.addAnnotation({ value: selection.cfiRange, color: 'yellow' });
            }
        } catch (e) {
            console.warn('Could not apply highlight', e);
        }

        clearSelection();
    };

    const handleDictionary = () => {
        if (!selection) return;
        setShowDictionary(true);
    };

    const clearSelection = () => {
        if (viewerRef.current) {
            const view = viewerRef.current;
            // Try to clear selection from foliate's active document iframe
            try {
                if (view.renderer && view.renderer.iframe) {
                    const doc = view.renderer.iframe.contentDocument;
                    if (doc) doc.getSelection().removeAllRanges();
                }
            } catch (e) { }
        }
        setSelection(null);
    };


    return (
        <div
            className={`flex-1 w-full flex flex-col relative overflow-hidden ${theme === 'dark' ? 'bg-gray-900 text-white' : theme === 'sepia' ? 'bg-[#f4ecd8] text-[#5b4636]' : 'bg-white text-gray-900'}`}
        >
            {/* Toolbar */}
            <header
                className={`absolute top-0 left-0 right-0 flex items-center justify-between px-2 sm:px-4 pb-2 sm:pb-3 border-b z-50 shadow-sm backdrop-blur-sm transition-transform duration-300 ${showControls ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
                    } ${theme === 'dark' ? 'border-gray-800 bg-gray-900/95' :
                        theme === 'sepia' ? 'border-[#e3dccb] bg-[#f4ecd8]/95' :
                            'border-gray-200 bg-white/95'
                    }`}
                style={{ paddingTop: 'var(--safe-pt)' }}
            >
                <div className="flex items-center gap-2 sm:gap-4">
                    <button onClick={handleBack} className="p-2 hover:opacity-70 rounded-full transition-colors flex-shrink-0">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="font-medium truncate max-w-[100px] sm:max-w-[150px] md:max-w-md text-xs sm:text-base">
                        {book.title}
                    </h1>
                </div>

                <div className="flex items-center gap-1 md:gap-2">
                    <button
                        onClick={handleSummarize}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors mr-2 ${theme === 'dark' ? 'bg-purple-900/30 text-purple-300 hover:bg-purple-900/50' :
                            'bg-purple-100 text-purple-700 hover:bg-purple-200'
                            }`}
                    >
                        <Sparkles size={16} />
                        <span className="hidden sm:inline">Summarize</span>
                    </button>

                    <button
                        onClick={() => setShowNotes(true)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors mr-2 ${theme === 'dark' ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-900/50' :
                            'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                    >
                        <BookMarked size={16} />
                        <span className="hidden sm:inline">Notes</span>
                    </button>

                    <div className={`h-6 w-px mx-1 hidden md:block ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}></div>

                    <button
                        onClick={() => setShowToc(!showToc)}
                        className={`p-2 rounded-full flex-shrink-0 transition-colors ${showToc ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        title="Table of Contents"
                    >
                        <List size={20} />
                    </button>

                    <button
                        onClick={() => setShowAppearance(!showAppearance)}
                        className={`p-2 rounded-full flex-shrink-0 transition-colors ${showAppearance ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        title="Appearance Settings"
                    >
                        <Type size={20} />
                    </button>

                    <button onClick={() => setShowSettings(true)} className="p-2 flex-shrink-0 hover:opacity-70 rounded-full transition-colors">
                        <Settings size={20} />
                    </button>
                </div>
            </header>

            {/* Appearance Menu Popover */}
            {showAppearance && (
                <div className={`absolute top-14 right-4 z-[60] w-72 p-4 rounded-xl shadow-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                    }`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium text-sm">Appearance</h3>
                        <button onClick={() => setShowAppearance(false)}><X size={16} /></button>
                    </div>

                    {/* Theme */}
                    <div className="mb-4">
                        <label className="text-xs text-gray-500 mb-2 block">Theme</label>
                        <div className={`flex gap-2 p-1 rounded-lg ${theme === 'dark' ? 'bg-gray-900' : theme === 'sepia' ? 'bg-[#e3dccb]' : 'bg-gray-100'}`}>
                            {['light', 'sepia', 'dark'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => update('theme', t)}
                                    className={`flex-1 py-1.5 rounded-md text-xs capitalize transition-colors ${theme === t
                                        ? (theme === 'dark' ? 'bg-gray-700 shadow-sm font-medium' : theme === 'sepia' ? 'bg-[#f4ecd8] shadow-sm font-medium' : 'bg-white shadow-sm font-medium')
                                        : (theme === 'dark' ? 'hover:bg-gray-800' : theme === 'sepia' ? 'hover:bg-[#d6cebc]' : 'hover:bg-gray-200')
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Font Size */}
                    <div className="mb-4">
                        <label className="text-xs text-gray-500 mb-2 block">Font Size ({fontSize}%)</label>
                        <div className="flex items-center gap-3">
                            <button onClick={() => update('fontSize', Math.max(50, fontSize - 10))} className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-gray-700' : theme === 'sepia' ? 'hover:bg-[#e3dccb]' : 'hover:bg-gray-100'}`}>A-</button>
                            <input
                                type="range" min="50" max="200" value={fontSize}
                                onChange={(e) => update('fontSize', Number(e.target.value))}
                                className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer ${theme === 'dark' ? 'bg-gray-700' : theme === 'sepia' ? 'bg-[#e3dccb]' : 'bg-gray-200'}`}
                            />
                            <button onClick={() => update('fontSize', Math.min(200, fontSize + 10))} className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-gray-700' : theme === 'sepia' ? 'hover:bg-[#e3dccb]' : 'hover:bg-gray-100'}`}>A+</button>
                        </div>
                    </div>

                    {/* Font Family */}
                    <div className="mb-4">
                        <label className="text-xs text-gray-500 mb-2 block">Font Family</label>
                        <div className={`flex gap-1 p-1 rounded-lg ${theme === 'dark' ? 'bg-gray-900' : theme === 'sepia' ? 'bg-[#e3dccb]' : 'bg-gray-100'}`}>
                            {[
                                { label: 'Sans', value: 'Inter, sans-serif' },
                                { label: 'Serif', value: 'Merriweather, serif' },
                                { label: 'Mono', value: 'monospace' }
                            ].map(f => (
                                <button
                                    key={f.value}
                                    onClick={() => update('fontFamily', f.value)}
                                    style={{ fontFamily: f.value }}
                                    className={`flex-1 py-1.5 rounded-md text-[11px] sm:text-xs transition-colors truncate px-1 ${fontFamily === f.value
                                        ? (theme === 'dark' ? 'bg-gray-700 shadow-sm font-medium' : theme === 'sepia' ? 'bg-[#f4ecd8] shadow-sm font-medium' : 'bg-white shadow-sm font-medium')
                                        : (theme === 'dark' ? 'hover:bg-gray-800' : theme === 'sepia' ? 'hover:bg-[#d6cebc]' : 'hover:bg-gray-200')
                                        }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Width & Line Height Sections */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                            <label className="text-xs text-gray-500 mb-2 block">Max Width</label>
                            <div className={`flex flex-col gap-1 p-1 rounded-lg ${theme === 'dark' ? 'bg-gray-900' : theme === 'sepia' ? 'bg-[#e3dccb]' : 'bg-gray-100'}`}>
                                {[
                                    { label: 'Narrow', value: '600px' },
                                    { label: 'Standard', value: '800px' },
                                    { label: 'Wide', value: '1000px' },
                                    { label: 'Full', value: '100%' }
                                ].map(w => (
                                    <button
                                        key={w.value}
                                        onClick={() => update('maxWidth', w.value)}
                                        className={`w-full py-1.5 rounded-md text-[11px] sm:text-xs transition-colors truncate px-1 ${maxWidth === w.value
                                            ? (theme === 'dark' ? 'bg-gray-700 shadow-sm font-medium' : theme === 'sepia' ? 'bg-[#f4ecd8] shadow-sm font-medium' : 'bg-white shadow-sm font-medium')
                                            : (theme === 'dark' ? 'hover:bg-gray-800' : theme === 'sepia' ? 'hover:bg-[#d6cebc]' : 'hover:bg-gray-200')
                                            }`}
                                    >
                                        {w.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-2 block">Line Height</label>
                            <div className={`flex flex-col gap-1 p-1 rounded-lg h-full ${theme === 'dark' ? 'bg-gray-900' : theme === 'sepia' ? 'bg-[#e3dccb]' : 'bg-gray-100'}`}>
                                {[
                                    { label: 'Compact', value: '1.4' },
                                    { label: 'Normal', value: '1.8' },
                                    { label: 'Loose', value: '2.2' }
                                ].map(lh => (
                                    <button
                                        key={lh.value}
                                        onClick={() => update('lineHeight', lh.value)}
                                        className={`w-full py-1.5 rounded-md text-[11px] sm:text-xs transition-colors truncate px-1 flex-1 ${lineHeight === lh.value
                                            ? (theme === 'dark' ? 'bg-gray-700 shadow-sm font-medium' : theme === 'sepia' ? 'bg-[#f4ecd8] shadow-sm font-medium' : 'bg-white shadow-sm font-medium')
                                            : (theme === 'dark' ? 'hover:bg-gray-800' : theme === 'sepia' ? 'hover:bg-[#d6cebc]' : 'hover:bg-gray-200')
                                            }`}
                                    >
                                        {lh.label}
                                    </button>
                                ))}
                                <div className="flex-1"></div>
                            </div>
                        </div>
                    </div>

                    {/* View Mode */}
                    <div>
                        <label className="text-xs text-gray-500 mb-2 block">View Mode</label>
                        <div className={`flex gap-2 p-1 rounded-lg ${theme === 'dark' ? 'bg-gray-900' : theme === 'sepia' ? 'bg-[#e3dccb]' : 'bg-gray-100'}`}>
                            <button
                                onClick={() => update('flow', 'paginated')}
                                className={`flex-1 py-1.5 rounded-md text-xs flex items-center justify-center gap-1 transition-colors ${flow === 'paginated'
                                    ? (theme === 'dark' ? 'bg-gray-700 shadow-sm font-medium' : theme === 'sepia' ? 'bg-[#f4ecd8] shadow-sm font-medium' : 'bg-white shadow-sm font-medium')
                                    : (theme === 'dark' ? 'hover:bg-gray-800' : theme === 'sepia' ? 'hover:bg-[#d6cebc]' : 'hover:bg-gray-200')
                                    }`}
                            >
                                <AlignJustify size={14} /> Pages
                            </button>
                            <button
                                onClick={() => update('flow', 'scrolled')}
                                className={`flex-1 py-1.5 rounded-md text-xs flex items-center justify-center gap-1 transition-colors ${flow === 'scrolled'
                                    ? (theme === 'dark' ? 'bg-gray-700 shadow-sm font-medium' : theme === 'sepia' ? 'bg-[#f4ecd8] shadow-sm font-medium' : 'bg-white shadow-sm font-medium')
                                    : (theme === 'dark' ? 'hover:bg-gray-800' : theme === 'sepia' ? 'hover:bg-[#d6cebc]' : 'hover:bg-gray-200')
                                    }`}
                            >
                                <Scroll size={14} /> Scroll
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reader Area — top offset prevents content bleeding behind status bar */}
            <div
                className={`absolute bottom-0 left-0 right-0 ${theme === 'dark' ? 'bg-gray-900' : theme === 'sepia' ? 'bg-[#f4ecd8]' : 'bg-gray-50'}`}
                style={{ top: 'var(--safe-pt)' }}
            >
                {loadError && (
                    <div className="absolute inset-x-4 top-20 z-[100] bg-red-100 dark:bg-red-900/50 rounded-xl p-4 text-red-900 dark:text-red-100 flex flex-col items-center justify-center text-center shadow-lg border border-red-200 dark:border-red-800">
                        <span className="font-bold text-lg mb-2">⚠ Error Loading Book</span>
                        <p className="text-sm font-mono break-all max-w-[90%]">{loadError}</p>
                        <button onClick={onBack} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg">
                            Go Back
                        </button>
                    </div>
                )}

                <foliate-view
                    ref={viewerRef}
                    class={`absolute inset-0 ${theme === 'dark' ? 'bg-gray-900' : theme === 'sepia' ? 'bg-[#f4ecd8]' : 'bg-white'}`}
                    style={{ outline: 'none' }}
                />

                {/* Navigation Overlays - only for paginated mode */}
                {flow === 'paginated' && (
                    <>
                        <button
                            onClick={handlePrev}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/80 dark:bg-black/50 rounded-full shadow-lg hover:scale-110 transition-transform hidden md:block z-10"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <button
                            onClick={handleNext}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/80 dark:bg-black/50 rounded-full shadow-lg hover:scale-110 transition-transform hidden md:block z-10"
                        >
                            <ChevronRight size={24} />
                        </button>
                        <div className="absolute inset-y-0 left-0 w-1/6 z-0 md:hidden" onClick={handlePrev} />
                        <div className="absolute inset-y-0 right-0 w-1/6 z-0 md:hidden" onClick={handleNext} />
                    </>
                )}
            </div>

            {/* TOC Sidebar Overlay */}
            {showToc && (
                <div className={`absolute top-14 left-0 bottom-10 w-72 sm:w-80 shadow-2xl z-50 flex flex-col transform transition-transform border-r ${theme === 'dark' ? 'bg-gray-900 border-gray-800' :
                    theme === 'sepia' ? 'bg-[#f4ecd8] border-[#e3dccb]' :
                        'bg-white border-gray-200'
                    }`}>
                    <div className="flex justify-between items-center p-4 border-b border-inherit">
                        <h3 className="font-bold text-lg">Table of Contents</h3>
                        <button onClick={() => setShowToc(false)} className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        {toc.length > 0 ? (
                            <ul className="space-y-1">
                                {toc.map((item, idx) => (
                                    <li key={idx}>
                                        <button
                                            onClick={() => {
                                                viewerRef.current?.goTo(item.href);
                                                setShowToc(false);
                                            }}
                                            className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-black/5 dark:hover:bg-white/10 transition-colors truncate"
                                        >
                                            {item.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="p-4 text-center text-sm opacity-60 italic">
                                No chapters found in this book.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Footer / Progress */}
            <div
                className={`absolute left-0 right-0 bottom-0 px-4 py-2 text-xs z-50 flex justify-between items-center gap-4 transition-transform duration-300 ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
                    } ${theme === 'dark' ? 'border-gray-800 bg-gray-900/95 border-t text-gray-400' :
                        theme === 'sepia' ? 'border-[#e3dccb] bg-[#f4ecd8]/95 text-[#5b4636]/70' :
                            'border-gray-200 bg-white/95 text-gray-500'
                    }`}
                style={{ paddingBottom: '8px' }}
            >
                {location ? (
                    <>
                        <span className="truncate flex-1 text-left font-medium opacity-80" title={location.start.tocItem?.label}>
                            {location.start.tocItem?.label || ''}
                        </span>
                        <span className="flex-shrink-0 text-right opacity-90">
                            {flow === 'paginated'
                                ? `Section ${location.start.displayed.page} of ${location.start.displayed.total}`
                                : `${Math.round((location.start.percentage || 0) * 100)}% Completed`
                            }
                        </span>
                    </>
                ) : (
                    <span className="w-full text-center">Loading...</span>
                )}
            </div>

            <SummaryModal
                isOpen={showSummary}
                onClose={() => setShowSummary(false)}
                summary={summaryText}
                isLoading={summaryLoading}
            />

            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
            />

            <NotesModal
                isOpen={showNotes}
                onClose={() => setShowNotes(false)}
                bookId={book.id}
                bookTitle={book.title}
                onDeleteHighlight={(cfiRange) => {
                    if (viewerRef.current) {
                        try {
                            viewerRef.current.deleteAnnotation({ value: cfiRange });
                        } catch (e) {
                            console.warn("Could not visually remove highlight", e);
                        }
                    }
                }}
            />

            <DictionaryModal
                isOpen={showDictionary}
                onClose={() => {
                    setShowDictionary(false);
                    clearSelection();
                }}
                word={selection?.word}
            />

            {/* Selection Floating Toolbar */}
            {selection && !showDictionary && (
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-800 rounded-full shadow-2xl border border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center gap-4 animate-in slide-in-from-bottom-5">
                    <button onClick={handleHighlight} className="flex items-center gap-2 text-sm font-medium text-yellow-600 dark:text-yellow-500 hover:opacity-80 transition-opacity">
                        <Highlighter size={18} />
                        <span>Highlight</span>
                    </button>
                    <div className="w-px h-5 bg-gray-300 dark:bg-gray-600"></div>
                    <button onClick={handleDictionary} className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity">
                        <BookOpen size={18} />
                        <span>Define</span>
                    </button>
                    <div className="w-px h-5 bg-gray-300 dark:bg-gray-600"></div>
                    <button onClick={clearSelection} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <X size={18} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default Reader;
