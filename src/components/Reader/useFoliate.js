import { useEffect, useRef } from 'react';
import { Overlayer } from 'foliate-js/overlayer.js';
import { updateProgress, getHighlights } from '../../utils/storage';
import {
    snapRangeToWords,
    isValidSelection,
    isPointerInsideSelection,
} from '../../utils/selectionUtils';

/** Builds the CSS string to inject into the Foliate iframe.
 *
 * Key principle (from Readest): body margin/padding must be ZERO.
 * The Foliate paginator owns all layout geometry — any body padding/margin
 * will shift the "visual" text relative to its DOM position, causing
 * selection handles to land in the wrong place (especially at page starts).
 */
const buildReaderCSS = (s) => {
    const THEMES = {
        light: { color: '#221d16', background: '#f6f2e9' },
        dark:  { color: '#ece4d2', background: '#131009' },
        sepia: { color: '#463526', background: '#ece0c4' },
    };
    const t = THEMES[s.theme] || THEMES.light;
    // Convert % font-size to px so values are deterministic inside the iframe.
    // % on body is relative to the browser default (usually 16px).
    const fontSizePx = Math.round((s.fontSize / 100) * 16);
    return `
        /* --- Page Layout (Readest-style): body must have zero margin/padding
               so the paginator's column geometry matches the DOM layout. --- */
        html, body {
            margin: 0 !important;
            padding: 0 !important;
            overflow: unset !important;
            max-height: unset !important;
        }
        html {
            font-size: ${fontSizePx}px !important;
            /* Prevent browser font scaling that desynchronises selection boxes */
            -webkit-text-size-adjust: none !important;
            text-size-adjust: none !important;
            background-color: ${t.background} !important;
            color-scheme: ${s.theme === 'dark' ? 'dark' : 'light'};
        }
        body {
            background: ${t.background} !important;
            color: ${t.color} !important;
            font-family: ${s.fontFamily} !important;
            line-height: ${s.lineHeight} !important;
            /* body zoom must stay at 1 — any zoom shifts hit-test coordinates */
            zoom: 1 !important;
        }
        /* --- Text user-select for selection to work everywhere --- */
        html, body {
            -webkit-user-select: text !important;
            user-select: text !important;
        }
        /* Apply font size broadly so EPUB-scoped rules are overridden */
        body, p, div, span, h1, h2, h3, h4, h5, h6,
        li, blockquote, td, th, caption, pre, code, a {
            font-size: ${fontSizePx}px !important;
        }
        /* Images/media should not be selectable */
        img, svg, video, audio {
            -webkit-user-select: none !important;
            user-select: none !important;
        }
        p, li, blockquote, td, th {
            color: ${t.color} !important;
            font-family: ${s.fontFamily} !important;
            line-height: ${s.lineHeight} !important;
            background: transparent !important;
        }
        h1, h2, h3, h4, h5, h6 {
            color: ${t.color} !important;
            font-family: ${s.fontFamily} !important;
            background: transparent !important;
        }
        a { color: inherit !important; background: transparent !important; }
        div, span { color: ${t.color} !important; background: transparent !important; }
        pre { white-space: pre-wrap !important; }
        /* Selection highlight colour */
        ::selection { background: rgba(255,215,0,0.45) !important; }
        ::-moz-selection { background: rgba(255,215,0,0.45) !important; }
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

    const currentCfiRef = useRef(null);

    const { theme, fontSize, fontFamily, lineHeight, maxWidth, flow } = settings;

    // Open + wire Foliate events
    useEffect(() => {
        if (!book || !viewerRef.current) return;
        const view = viewerRef.current;

        const initBook = async () => {
            try {
                let fileToOpen = book.file;
                
                // Fallback: If it's stored in the new ArrayBuffer format but wasn't reconstructed upstream
                if (book.fileData && book.fileData.buffer) {
                    fileToOpen = new File([book.fileData.buffer], book.fileData.name || (book.title + '.epub'), { type: book.fileData.type });
                }
                
                // On iOS standalone mode, Blob URLs in iframes can be flaky.
                // We ensure we have a File/Blob with proper name and type.
                if (!(fileToOpen instanceof Blob)) {
                    const format = book.format || 'epub';
                    const ext  = format === 'pdf' ? '.pdf' : '.epub';
                    const mime = format === 'pdf' ? 'application/pdf' : 'application/epub+zip';
                    fileToOpen = new File([fileToOpen], (book.title || 'book') + ext, { type: mime });
                }

                // In iOS PWA, sometimes the file handle is lost. We try to read it now as a preemptive check.
                console.log('Accessing book buffer for iOS stability...');
                try {
                    await fileToOpen.arrayBuffer();
                } catch (readErr) {
                    console.error('CRITICAL: Failed to read book buffer on iOS:', readErr);
                    throw new Error('Could not access book data (Safari storage limit or stale handle)');
                }

                console.log('Opening book:', fileToOpen.name, 'size:', fileToOpen.size);
                await view.open(fileToOpen);

                // --- PATCH FOR IOS STABILITY ---
                // Delay section unloading to prevent "NotFoundError" on Safari/PWA 
                // when images/resources are still being rendered while a section is revoked.
                if (view.book?.sections) {
                    console.log('Applying delayed-unload patch to sections');
                    view.book.sections = view.book.sections.map(s => {
                        const originalUnload = s.unload;
                        return {
                            ...s,
                            unload: () => {
                                console.log('Delaying section unload for iOS stability (15s)...');
                                setTimeout(() => {
                                    try { originalUnload(); } catch (e) { console.warn('Delayed unload failed:', e); }
                                }, 15000); 
                            }
                        };
                    });
                    // Ensure renderer has the same patched section list
                    if (view.renderer) view.renderer.sections = view.book.sections;
                }
                // -------------------------------

                const startLocation = book.cfi || 0;
                console.log('Reader goTo startLocation:', startLocation);
                try {
                    await view.goTo(startLocation);
                } catch (goErr) {
                    console.warn('Initial goTo failed, retrying at index 0:', goErr);
                    await view.goTo(0);
                }

                const foliateBook = view.book;
                if (foliateBook) setToc(foliateBook.toc || []);
                setIsReady(true);
            } catch (err) {
                console.error('Foliate load error detail:', err);
                setLoadError(`Reader Error: ${err.message || 'Could not open book'}. (Check console for details)`);
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

            if (detail.cfi) { currentCfiRef.current = detail.cfi; updateProgress(book.id, detail.cfi, detail.fraction); }
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
                // Use individual margin attributes (NOT the combined 'margin' shorthand)
                // Readest uses this pattern so the paginator can cleanly compute
                // column widths and hit-test regions without any offset error.
                const margin = '24px';
                view.renderer.setAttribute('margin-top', margin);
                view.renderer.setAttribute('margin-right', margin);
                view.renderer.setAttribute('margin-bottom', margin);
                view.renderer.setAttribute('margin-left', margin);
                view.renderer.setAttribute('gap', '5%');
                view.renderer.setAttribute('max-inline-size', s.maxWidth === '100%' ? '1200px' : s.maxWidth);
                view.renderer.setAttribute('flow', s.flow);
                view.style.setProperty('color-scheme', s.theme === 'dark' ? 'dark' : 'light');
                // Literal background on the foliate-view element itself so the paginator's
                // transparent #background div always reveals the correct colour.
                const LOAD_THEME_BG = { light: '#f6f2e9', dark: '#131009', sepia: '#ece0c4' };
                view.style.background = LOAD_THEME_BG[s.theme] || LOAD_THEME_BG.light;
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

            let touchStart = null;
            let lastTouchMoveAt = 0;
            let lastTouchEndAt = 0;
            let lastSelectionAt = 0;
            let lastSelectionClearAt = 0;
            let lastHandledTouchTapAt = 0;
            let lastTouchMoved = false;
            let hadActiveSelection = false;
            const tapMoveTolerance = 10;
            const gestureSettleMs = 350;
            const selectionSettleMs = 700;
            const longPressMs = 450;

            const getSelectedText = () => doc.getSelection()?.toString().trim() || '';

            const getTapTarget = (target) => {
                if (!target) return null;
                return typeof target.closest === 'function' ? target : target.parentElement;
            };

            const handleReaderTap = () => {
                if (isFocusModeRef.current) {
                    setShowFocusExit(prev => !prev);
                    return;
                }

                setShowAppearance(false);
                setShowToc(false);
                setShowSettings(false);
                setShowNotes(false);
                setShowControls(prev => !prev);
            };

            const shouldHandleReaderTap = (ev, now = Date.now()) => {
                const target = getTapTarget(ev.target);
                const tag = target?.tagName?.toLowerCase?.();

                if (ev.defaultPrevented) return false;
                if (getSelectedText().length > 0) return false;
                if (now - lastSelectionAt < selectionSettleMs) return false;
                if (now - lastSelectionClearAt < gestureSettleMs) return false;
                if (lastTouchMoved && now - lastTouchEndAt < gestureSettleMs) return false;
                if (now - lastTouchMoveAt < gestureSettleMs) return false;
                if (target?.closest?.('a[href], button, input, textarea, select, [role="button"]')) return false;
                if (['img', 'svg', 'video', 'audio'].includes(tag)) return false;

                return true;
            };

            const handleTouchStart = (ev) => {
                const root = doc.documentElement;
                const touch = ev.changedTouches?.[0];
                if (!touch) return;
                lastTouchMoved = false;
                touchStart = {
                    x: touch.clientX,
                    y: touch.clientY,
                    t: Date.now(),
                    isBottom: Math.ceil(root.scrollTop + root.clientHeight) >= Math.floor(root.scrollHeight) - 2,
                    isTop: root.scrollTop <= 2
                };
            };

            const handleTouchMove = (ev) => {
                const touch = ev.changedTouches?.[0];
                if (!touch || !touchStart) return;
                const dx = Math.abs(touch.clientX - touchStart.x);
                const dy = Math.abs(touch.clientY - touchStart.y);
                if (dx > tapMoveTolerance || dy > tapMoveTolerance) {
                    lastTouchMoved = true;
                    lastTouchMoveAt = Date.now();
                }
            };

            const handleTouchEnd = (ev) => {
                const endedAt = Date.now();
                const wasLongPress = touchStart && endedAt - touchStart.t > longPressMs;
                lastTouchEndAt = endedAt;

                // --- Overscroll Auto-Advance (Mobile/Touch) — SCROLL MODE ONLY ---
                // CRITICAL: In paginated mode, scrollTop is ALWAYS 0, which means
                // isTop AND isBottom are both true at the same time. Any selection
                // handle drag > 80px would then fire view.next() or view.prev(),
                // destroying the selection. This block must be fully skipped in
                // paginated mode. Paginated navigation uses left/right tap zones instead.
                const isPaginated = settingsRef.current?.flow === 'paginated';
                const isSelecting = hadActiveSelection || getSelectedText().length > 0;

                if (lastTouchMoved && touchStart && !isPaginated && !isSelecting) {
                    const root = doc.documentElement;
                    const isBottom = Math.ceil(root.scrollTop + root.clientHeight) >= Math.floor(root.scrollHeight) - 2;
                    const isTop = root.scrollTop <= 2;
                    
                    const touch = ev.changedTouches?.[0];
                    if (touch) {
                        const dy = touchStart.y - touch.clientY; // Positive = swiping UP (scrolling down page)
                        
                        // Demand a 80px "hard pull" to advance
                        if (dy > 80 && isBottom && touchStart.isBottom) {
                            view.next();
                        } else if (dy < -80 && isTop && touchStart.isTop) {
                            view.prev();
                        }
                    }
                }
                // -------------------------------------------------------------------

                if (lastTouchMoved || wasLongPress) return;

                setTimeout(() => {
                    const now = Date.now();
                    if (now - lastHandledTouchTapAt < 500) return;
                    if (!shouldHandleReaderTap(ev, now)) return;
                    lastHandledTouchTapAt = now;
                    handleReaderTap();
                }, 60);
            };

            doc.addEventListener('touchstart', handleTouchStart, { passive: true });
            doc.addEventListener('touchmove', handleTouchMove, { passive: true });
            doc.addEventListener('touchend', handleTouchEnd, { passive: true });

            // --- Overscroll Auto-Advance (Desktop/Wheel) — SCROLL MODE ONLY ---
            // Same as touch: paginated mode must be excluded because scrollTop is
            // always 0 there. Wheel/keyboard is how desktop users navigate in
            // paginated mode (via the renderer itself), not this overscroll logic.
            let arrivedAtBottomAt = 0;
            let arrivedAtTopAt = 0;
            let overscrollDownAmount = 0;
            let overscrollUpAmount = 0;
            let wheelDebounce = null;
            
            const MOMENTUM_IGNORE_MS = 600;
            const HARD_PULL_THRESHOLD = 150;

            doc.addEventListener('wheel', (ev) => {
                // Skip entirely in paginated mode or during active selection
                if (settingsRef.current?.flow === 'paginated') return;
                if (hadActiveSelection || getSelectedText().length > 0) return;

                const root = doc.documentElement;
                const isBottom = Math.ceil(root.scrollTop + root.clientHeight) >= Math.floor(root.scrollHeight) - 2;
                const isTop = root.scrollTop <= 2;

                if (ev.deltaY > 0) {
                    overscrollUpAmount = 0;
                    if (isBottom) {
                        if (arrivedAtBottomAt === 0) arrivedAtBottomAt = Date.now();
                        if (Date.now() - arrivedAtBottomAt > MOMENTUM_IGNORE_MS) {
                            overscrollDownAmount += ev.deltaY;
                            if (overscrollDownAmount > HARD_PULL_THRESHOLD) {
                                view.next();
                                overscrollDownAmount = 0;
                                arrivedAtBottomAt = 0;
                            }
                        }
                    } else {
                        arrivedAtBottomAt = 0;
                        overscrollDownAmount = 0;
                    }
                } else if (ev.deltaY < 0) {
                    overscrollDownAmount = 0;
                    if (isTop) {
                        if (arrivedAtTopAt === 0) arrivedAtTopAt = Date.now();
                        if (Date.now() - arrivedAtTopAt > MOMENTUM_IGNORE_MS) {
                            overscrollUpAmount += Math.abs(ev.deltaY);
                            if (overscrollUpAmount > HARD_PULL_THRESHOLD) {
                                view.prev();
                                overscrollUpAmount = 0;
                                arrivedAtTopAt = 0;
                            }
                        }
                    } else {
                        arrivedAtTopAt = 0;
                        overscrollUpAmount = 0;
                    }
                }

                clearTimeout(wheelDebounce);
                wheelDebounce = setTimeout(() => {
                    overscrollDownAmount = 0;
                    overscrollUpAmount = 0;
                }, 200);
            }, { passive: true });
            // -------------------------------------------------------------------

            // ═══════════════════════════════════════════════════════════════
            // SELECTION PIPELINE — exact port of Readest
            //
            // Source: Annotator.tsx lines 279-324 + useTextSelector.ts
            //
            //  pointerdown  → lock scroll, record start point
            //  pointermove  → (no-op for basic selection; instant-annotation
            //                  is a separate feature we skip here)
            //  pointerup    → THIS is where makeSelection() is called.
            //                  Readest checks isPointerInsideSelection before
            //                  calling to distinguish "tap on existing selection"
            //                  from "starting a new one". Applies
            //                  snapRangeToWords() to prevent cross-page drift.
            //  pointercancel→ unlock scroll
            //  selectionchange → Android-only & touch-only fallback
            //                  (pointerup fires pointercancel instead on Android
            //                   when the OS takes over scroll handling)
            //  contextmenu  → suppressed on mobile (from handleContextmenu)
            // ═══════════════════════════════════════════════════════════════

            const isTextSelected = { current: false };
            const lastPointerType = { current: 'mouse' };

            const scrollLock   = () => { try { if (view.renderer) view.renderer.scrollLocked = true;  } catch (_) {} };
            const scrollUnlock = () => { try { if (view.renderer) view.renderer.scrollLocked = false; } catch (_) {} };

            // makeSelection — mirrors useTextSelector.ts:54-70
            // Called when a valid selection exists and we want to surface the
            // SelectionMenu. Applies word-boundary snapping first.
            const makeSelection = (sel) => {
                isTextSelected.current = true;
                try {
                    const range = sel.getRangeAt(0);

                    // snapRangeToWords: Readest's fix for cross-page boundary drift.
                    // A selection that starts at the very first pixel of a page can
                    // silently include trailing whitespace / hidden chars from the
                    // previous CSS column. Snapping to the nearest word boundary
                    // pulls the range back onto the visible page (sel.ts:224-268).
                    snapRangeToWords(range);

                    // Rebuild the browser selection so the visual highlight snaps too
                    sel.removeAllRanges();
                    sel.addRange(range);

                    const word = range.toString().trim();
                    if (!word) return;

                    hadActiveSelection = true;
                    lastSelectionAt = Date.now();

                    setSelection({ word, cfiRange: view.getCFI(index, range) });
                } catch (e) {
                    console.warn('[selection] makeSelection error:', e);
                }
            };

            // makeSelectionOnIOS — mirrors useTextSelector.ts:72-91
            // "FIXME: extremely hacky way to dismiss system selection tools on iOS"
            // Removes and re-adds the range so the native Copy/Look Up bubble
            // retreats and makes room for our SelectionMenu.
            const makeSelectionOnIOS = (sel) => {
                isTextSelected.current = true;
                try {
                    const range = sel.getRangeAt(0);
                    snapRangeToWords(range);
                    const word = range.toString().trim();
                    if (!word) return;

                    hadActiveSelection = true;
                    lastSelectionAt = Date.now();

                    setTimeout(() => {
                        sel.removeAllRanges();
                        setTimeout(() => {
                            if (!isTextSelected.current) return;
                            sel.addRange(range);
                            setSelection({ word, cfiRange: view.getCFI(index, range) });
                        }, 30);
                    }, 30);
                } catch (e) {
                    console.warn('[selection] makeSelectionOnIOS error:', e);
                }
            };

            // ── pointerdown — Annotator.tsx:283 ─────────────────────────────
            // Lock scroll immediately. If user just tapped (no drag), pointerup
            // will unlock. Mirrors startInstantAnnotating() scrollLocked logic.
            doc.addEventListener('pointerdown', (ev) => {
                lastPointerType.current = ev.pointerType;
                scrollLock();
            }, { passive: false });

            // ── pointerup — Annotator.tsx:286, useTextSelector.ts:150-188 ───
            // This is the PRIMARY resolution path for mouse and iOS touch.
            // Readest checks isPointerInsideSelection to decide whether to show
            // the popup. We also handle the iOS variant.
            doc.addEventListener('pointerup', (ev) => {
                const sel = doc.getSelection();

                if (sel && sel.toString().trim().length > 0 && sel.rangeCount > 0) {
                    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
                    const pointerInside = isPointerInsideSelection(sel, ev);

                    if (pointerInside && isIOS) {
                        makeSelectionOnIOS(sel);
                    } else if (pointerInside) {
                        makeSelection(sel);
                    }
                    // On Android the browser often fires pointercancel, not pointerup,
                    // when it takes over for scroll. selectionchange handles that case.
                } else {
                    // Finger lifted on empty area — no selection
                    scrollUnlock();
                }
            });

            // ── pointercancel — Annotator.tsx:285 ───────────────────────────
            // Fired by Android WebView when the OS takes over scroll handling.
            // Just unlock scroll; selectionchange will fire if text was selected.
            doc.addEventListener('pointercancel', () => {
                scrollUnlock();
            });

            // ── selectionchange — useTextSelector.ts:201-219 ────────────────
            // Readest comment: "Available on iOS, Android and Desktop…
            //   On Android native app, this is the primary way to detect text
            //   selection. On web with touch/pen in scroll mode, pointerup never
            //   fires (pointercancel fires instead) so we also handle selectionchange
            //   for touch/pen input to pick up native text selections."
            //
            // We guard it to touch/pen input so it doesn't double-fire on desktop
            // where pointerup already handled it.
            doc.addEventListener('selectionchange', () => {
                const sel = doc.getSelection();
                const hasText = sel && sel.toString().trim().length > 0 && sel.rangeCount > 0;

                if (hasText) {
                    hadActiveSelection = true;
                    lastSelectionAt = Date.now();
                    // Lock so handles can't trigger page flip
                    scrollLock();

                    // Android/touch path (mirrors useTextSelector.ts:207-216):
                    // pointerup fires pointercancel on Android, so selectionchange
                    // is the only reliable signal. We debounce to avoid firing on
                    // every intermediate handle-drag event.
                    const isTouchOrPen = lastPointerType.current === 'touch' || lastPointerType.current === 'pen';
                    if (isTouchOrPen) {
                        clearTimeout(doc._selSettleTimer);
                        doc._selSettleTimer = setTimeout(() => {
                            const currentSel = doc.getSelection();
                            if (currentSel && currentSel.toString().trim().length > 0 && currentSel.rangeCount > 0) {
                                makeSelection(currentSel);
                            }
                        }, 300);
                    }
                } else {
                    if (hadActiveSelection) lastSelectionClearAt = Date.now();
                    hadActiveSelection = false;
                    isTextSelected.current = false;
                    scrollUnlock();
                    setSelection(null);
                }
            });

            // ── contextmenu — useTextSelector.ts:249-259 ────────────────────
            // Mirrors handleContextmenu() exactly.
            doc.addEventListener('contextmenu', (ev) => {
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                if (isMobile || lastPointerType.current === 'touch' || lastPointerType.current === 'pen') {
                    ev.preventDefault();
                    ev.stopPropagation();
                    return false;
                }
            });

            doc.addEventListener('click', (ev) => {
                const now = Date.now();
                if (now - lastHandledTouchTapAt < 500) return;
                if (!shouldHandleReaderTap(ev, now)) return;
                lastHandledTouchTapAt = now;
                handleReaderTap();
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
    }, [book]); // <-- Flow removed from here to prevent full re-open on mode change

    // Resolved hex values for each theme — must match the CSS token values.
    // Used to set the foliate-view element's own background directly (bypassing
    // CSS vars) so that the paginator's transparent #background div always shows
    // the correct colour underneath, regardless of data-theme propagation timing.
    const THEME_BG = {
        light: { bg: '#f6f2e9', color: '#221d16' },
        dark:  { bg: '#131009', color: '#ece4d2' },
        sepia: { bg: '#ece0c4', color: '#463526' },
    };

    // Live style + flow update when appearance/flow settings change
    useEffect(() => {
        const view = viewerRef.current;
        if (!view?.renderer?.setStyles) return;

        const t = THEME_BG[theme] || THEME_BG.light;

        // 1. Update the injected stylesheet in the current section's iframe.
        //    setStyles() also queues a rAF that resets #background to docBackground
        //    (which is transparent for most EPUBs). Setting view.style.background
        //    below ensures that transparent #background reveals the right colour.
        view.renderer.setStyles(buildReaderCSS(settings));

        // 2. Update renderer layout attributes.
        const margin = '24px';
        view.renderer.setAttribute('margin-top', margin);
        view.renderer.setAttribute('margin-right', margin);
        view.renderer.setAttribute('margin-bottom', margin);
        view.renderer.setAttribute('margin-left', margin);
        view.renderer.setAttribute('gap', '5%');
        view.renderer.setAttribute('max-inline-size', maxWidth === '100%' ? '1200px' : maxWidth);
        view.renderer.setAttribute('flow', flow);

        // 3. Set literal background on the foliate-view element itself so the
        //    transparent paginator background always shows the right colour.
        //    This is more reliable than var(--paper) which depends on data-theme
        //    propagation timing.
        view.style.background = t.bg;
        view.style.setProperty('color-scheme', theme === 'dark' ? 'dark' : 'light');

        // 4. Patch any already-rendered iframes directly so the change is instant
        //    (the stylesheet injection above may not repaint immediately in all engines).
        try {
            view.querySelectorAll('iframe').forEach(iframe => {
                try {
                    const doc = iframe.contentDocument;
                    if (doc?.documentElement) {
                        doc.documentElement.style.setProperty('background-color', t.bg, 'important');
                        if (doc.body) {
                            doc.body.style.setProperty('background-color', t.bg, 'important');
                            doc.body.style.setProperty('color', t.color, 'important');
                        }
                    }
                } catch (_) {}
            });
        } catch (_) {}

        // 5. Navigate back to current position so the renderer reflows and repaints.
        //    Without this, font/theme changes often don't visually apply until the
        //    user turns a page manually.
        try {
            const cfi = currentCfiRef.current;
            if (cfi) view.goTo(cfi).catch(() => {});
        } catch (_) {}
    }, [theme, fontSize, fontFamily, lineHeight, maxWidth, flow]);
};
