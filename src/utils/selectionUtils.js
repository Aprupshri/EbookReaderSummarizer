/**
 * selectionUtils.js - Ported verbatim from Readest source
 *
 * Sources:
 *   readest/apps/readest-app/src/utils/sel.ts  (snapRangeToWords, isPointerInsideSelection)
 *   readest/apps/readest-app/src/app/reader/hooks/useInstantAnnotation.ts (findPositionAtPoint, isSelectableContent)
 */

// ---------------------------------------------------------------------------
// snapRangeToWords  (verbatim port of sel.ts:224-268)
// ---------------------------------------------------------------------------

const _isPunctuation = (ch) => /^[\p{P}\p{S}]$/u.test(ch);

function _snapStartToWordBoundary(range) {
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;
    const text = node.textContent ?? '';
    const offset = range.startOffset;
    if (offset === 0 || offset >= text.length) return;

    const charAtOffset = text[offset] ?? '';
    if (_isPunctuation(charAtOffset)) return;

    const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
    for (const seg of segmenter.segment(text)) {
        if (seg.isWordLike && seg.index < offset && seg.index + seg.segment.length > offset) {
            range.setStart(node, seg.index);
            break;
        }
    }
}

function _snapEndToWordBoundary(range) {
    const node = range.endContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;
    const text = node.textContent ?? '';
    const offset = range.endOffset;
    if (offset === 0 || offset >= text.length) return;

    const charBeforeOffset = text[offset - 1] ?? '';
    if (_isPunctuation(charBeforeOffset)) return;

    const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
    for (const seg of segmenter.segment(text)) {
        if (seg.isWordLike && seg.index < offset && seg.index + seg.segment.length > offset) {
            range.setEnd(node, seg.index + seg.segment.length);
            break;
        }
    }
}

export function snapRangeToWords(range) {
    if (typeof Intl === 'undefined' || !Intl.Segmenter) return;
    _snapStartToWordBoundary(range);
    _snapEndToWordBoundary(range);
}

// ---------------------------------------------------------------------------
// isPointerInsideSelection  (verbatim port of sel.ts:78-95)
// ---------------------------------------------------------------------------

export function isPointerInsideSelection(selection, ev) {
    if (selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    const rects = range.getClientRects();
    const padding = 50;
    for (let i = 0; i < rects.length; i++) {
        const rect = rects[i];
        if (
            ev.clientX >= rect.left - padding &&
            ev.clientX <= rect.right + padding &&
            ev.clientY >= rect.top - padding &&
            ev.clientY <= rect.bottom + padding
        ) {
            return true;
        }
    }
    return false;
}

// ---------------------------------------------------------------------------
// findPositionAtPoint  (verbatim port of useInstantAnnotation.ts:60-70)
// ---------------------------------------------------------------------------

export function findPositionAtPoint(doc, x, y) {
    if (doc.caretPositionFromPoint) {
        const pos = doc.caretPositionFromPoint(x, y);
        if (pos) return { node: pos.offsetNode, offset: pos.offset };
    }
    if (doc.caretRangeFromPoint) {
        const r = doc.caretRangeFromPoint(x, y);
        if (r) return { node: r.startContainer, offset: r.startOffset };
    }
    return null;
}

// ---------------------------------------------------------------------------
// isValidSelection  (verbatim port of useTextSelector.ts:50-52)
// ---------------------------------------------------------------------------

export function isValidSelection(sel) {
    return !!(sel && sel.toString().trim().length > 0 && sel.rangeCount > 0);
}
