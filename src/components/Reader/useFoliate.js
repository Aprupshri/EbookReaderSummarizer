import { useEffect, useRef } from 'react';
import { Overlayer } from 'foliate-js/overlayer.js';
import { updateProgress, getHighlights } from '../../utils/storage';

/** Builds the CSS string to inject into the Foliate iframe */
const buildReaderCSS = (s) => {
    const THEMES = {
        light: { color: '#1a1a1a', background: '#ffffff' },
        dark:  { color: '#e5e7eb', background: '#111827' },
        sepia: { color: '#5b4636', background: '#f4ecd8' },
    };
    const t = THEMES[s.theme] || THEMES.light;
    return `
        body {
            background: ${t.background} !important;
            color: ${t.color} !important;
            font-family: ${s.fontFamily} !important;
            line-height: ${s.lineHeight} !important;
            font-size: ${s.fontSize}% !important;
            padding: 0 10px !important;
            margin: 0;
        }
        p, div, span, h1, h2, h3, h4, h5, h6, li, blockquote, a {
            color: ${t.color} !important;
            font-family: ${s.fontFamily} !important;
            line-height: ${s.lineHeight} !important;
            background: transparent !important;
        }
        ::selection { background: rgba(255,255,0,0.3) !important; }
    `;
};

/**
 * Manages the Foliate viewer lifecycle: open, relocate, load-with-styles, annotations.
 * Also applies live style updates when settings change.
 */
export const useFoliate = ({
    book,
    settings,
    viewerRef,
    setLocation,
    setToc,
    setIsReady,
    setLoadError,
    setSelection,
    setShowControls,
    setShowAppearance,
    setShowToc,
    setShowSettings,
    setShowNotes,
    setShowFocusExit,
    isFocusModeRef,
    recordPage,
}) => {
    const settingsRef = useRef(settings);
    useEffect(() => { settingsRef.current = settings; }, [settings]);

    const { theme, fontSize, fontFamily, lineHeight, maxWidth, flow } = settings;

    // Open + wire Foliate events
    useEffect(() => {
        if (!book || !viewerRef.current) return;
        const view = viewerRef.current;

        const initBook = async () => {
            try {
                let fileToOpen = book.file;
                if (!(fileToOpen instanceof Blob)) {
                    const format = book.format || 'epub';
                    const ext  = format === 'pdf' ? '.pdf' : '.epub';
                    const mime = format === 'pdf' ? 'application/pdf' : 'application/epub+zip';
                    fileToOpen = new File([fileToOpen], (book.title || 'book') + ext, { type: mime });
                } else if (!fileToOpen.name) {
                    const format = book.format || 'epub';
                    const ext  = format === 'pdf' ? '.pdf' : '.epub';
                    const mime = format === 'pdf' ? 'application/pdf' : 'application/epub+zip';
                    fileToOpen = new File([fileToOpen], (book.title || 'book') + ext, { type: fileToOpen.type || mime });
                }

                await view.open(fileToOpen);
                await view.goTo(book.cfi || 0);
                const foliateBook = view.book;
                if (foliateBook) setToc(foliateBook.toc || []);
                setIsReady(true);
            } catch (err) {
                console.error('Foliate load error', err);
                setLoadError(err.message || String(err));
            }
        };

        const handleRelocate = (e) => {
            const detail = e.detail;
            if (!detail) return;

            const sectionCurrent = detail.section?.current !== undefined
                ? detail.section.current + 1
                : (detail.index !== undefined ? detail.index + 1 : 1);
            const sectionTotal = detail.section?.total || view.book?.sections?.length || 1;

            setLocation({
                start: {
                    cfi: detail.cfi,
                    percentage: detail.fraction,
                    displayed: { page: sectionCurrent, total: sectionTotal },
                    tocItem: detail.tocItem,
                },
            });

            if (detail.cfi) updateProgress(book.id, detail.cfi);
            if (detail.index !== undefined) recordPage(detail.index);
        };

        const handleDrawAnnotation = (e) => {
            const { draw, annotation } = e.detail;
            draw(Overlayer.highlight, { color: annotation.color || 'yellow' });
        };

        const handleLoad = async (e) => {
            const { doc, index } = e.detail;
            const s = settingsRef.current;

            if (view.renderer?.setStyles) {
                view.renderer.setStyles(buildReaderCSS(s));
                view.renderer.setAttribute('margin', '20px');
                view.renderer.setAttribute('max-inline-size', s.maxWidth === '100%' ? '1200px' : s.maxWidth);
                view.renderer.setAttribute('flow', s.flow);
                view.style.setProperty('color-scheme', s.theme === 'dark' ? 'dark' : 'light');
            }

            // Re-apply saved highlights for this section
            try {
                const savedHighlights = await getHighlights(book.id);
                if (savedHighlights?.length) {
                    for (const hl of savedHighlights) {
                        if (!hl.cfiRange) continue;
                        view.addAnnotation({ value: hl.cfiRange, color: hl.color || 'yellow' }).catch(() => {});
                    }
                }
            } catch (err) { console.warn('Could not load highlights', err); }

            doc.addEventListener('selectionchange', () => {
                const sel = doc.getSelection();
                const word = sel.toString().trim();
                if (word) {
                    try {
                        const range = sel.getRangeAt(0);
                        setSelection({ word, cfiRange: view.getCFI(index, range) });
                    } catch (_) {
                        setSelection({ word, cfiRange: null });
                    }
                } else {
                    setSelection(null);
                }
            });

            doc.addEventListener('click', (ev) => {
                const sel = doc.getSelection();
                if (sel?.toString().trim().length > 0) return;
                if (ev.target.closest('a') || ev.target.tagName.toLowerCase() === 'img') return;

                if (isFocusModeRef.current) {
                    setShowFocusExit(prev => !prev);
                    return;
                }

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

        view.addEventListener('relocate', handleRelocate);
        view.addEventListener('draw-annotation', handleDrawAnnotation);
        view.addEventListener('load', handleLoad);
        initBook();

        return () => {
            view.removeEventListener('relocate', handleRelocate);
            view.removeEventListener('draw-annotation', handleDrawAnnotation);
            view.removeEventListener('load', handleLoad);
            try { view.close?.(); } catch (_) {}
        };
    }, [book, flow]);

    // Live style update when appearance settings change
    useEffect(() => {
        const view = viewerRef.current;
        if (!view?.renderer?.setStyles) return;
        view.renderer.setStyles(buildReaderCSS(settings));
        view.renderer.setAttribute('max-inline-size', maxWidth === '100%' ? '1200px' : maxWidth);
        view.style.setProperty('color-scheme', theme === 'dark' ? 'dark' : 'light');
    }, [theme, fontSize, fontFamily, lineHeight, maxWidth]);
};
