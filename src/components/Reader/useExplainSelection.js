import { useState, useRef } from 'react';
import { generateExplain, generateFollowUp, getAISettings, PROVIDERS } from '../../utils/ai';
import { saveHighlight, saveEntry } from '../../utils/storage';

/**
 * Manages text selection, highlight, dictionary lookup, and AI explain flow.
 */
export const useExplainSelection = ({ book, location, viewerRef, setShowSettings }) => {
    const [selection, setSelection] = useState(null);
    const [showDictionary, setShowDictionary] = useState(false);

    const [showExplain, setShowExplain] = useState(false);
    const [explainText, setExplainText] = useState('');
    const [explainLoading, setExplainLoading] = useState(false);
    const [explainError, setExplainError] = useState(null);
    const [explainSaved, setExplainSaved] = useState(false);
    const explainContextRef = useRef(null);

    const clearSelection = () => {
        if (viewerRef.current) {
            try {
                const view = viewerRef.current;
                if (view.renderer?.iframe) {
                    const doc = view.renderer.iframe.contentDocument;
                    if (doc) doc.getSelection().removeAllRanges();
                }
            } catch (_) { }
        }
        setSelection(null);
    };

    const handleHighlight = async () => {
        if (!selection) return;
        try {
            await saveHighlight(book.id, selection.cfiRange, selection.word, 'yellow');
            viewerRef.current?.addAnnotation({ value: selection.cfiRange, color: 'yellow' });
        } catch (e) {
            console.warn('Could not apply highlight', e);
        }
        clearSelection();
    };

    const handleDictionary = () => {
        if (!selection) return;
        setShowDictionary(true);
    };

    const handleExplain = async () => {
        if (!selection) return;
        const aiSettings = getAISettings();
        const providerCfg = PROVIDERS.find(p => p.id === aiSettings.provider);
        if (providerCfg?.requiresApiKey && !aiSettings.apiKey) { setShowSettings(true); return; }

        const view = viewerRef.current;
        const foliateBook = view?.book;
        const currentSectionIndex = location?.start?.displayed?.page
            ? location.start.displayed.page - 1 : 0;

        let chapterName = '';
        if (foliateBook) {
            const tocItems = foliateBook.toc || [];
            const chapterItem = foliateBook.sections?.[currentSectionIndex];
            const tocIdx = tocItems.findIndex(
                item => item.href && chapterItem?.id && item.href.includes(chapterItem.id)
            );
            if (tocIdx !== -1) chapterName = tocItems[tocIdx].label;
        }

        const ctx = {
            selectedText: selection.word,
            bookTitle: book.title || 'this book',
            bookAuthor: book.author || 'Unknown Author',
            chapterName,
            surroundingText: '',
        };
        explainContextRef.current = ctx;

        setExplainText('');
        setExplainError(null);
        setExplainSaved(false);
        setShowExplain(true);
        setExplainLoading(true);
        clearSelection();

        try {
            const text = await generateExplain(ctx);
            setExplainText(text);
        } catch (err) {
            setExplainError(err.message || 'Could not explain. Please check your API key.');
        } finally {
            setExplainLoading(false);
        }
    };

    const handleExplainSave = async () => {
        if (!explainContextRef.current || !explainText) return;
        try {
            await saveEntry({
                bookId: book.id,
                bookTitle: explainContextRef.current.bookTitle,
                bookAuthor: explainContextRef.current.bookAuthor,
                quote: explainContextRef.current.selectedText,
                myNote: explainText,
                tags: ['ai-explanation'],
                chapter: explainContextRef.current.chapterName || '',
                cfi: null,
            });
            setExplainSaved(true);
        } catch (e) {
            console.warn('Could not save explanation', e);
        }
    };

    const handleExplainFollowUp = async (question) => {
        const aiSettings = getAISettings();
        const providerCfg = PROVIDERS.find(p => p.id === aiSettings.provider);
        if (providerCfg?.requiresApiKey && !aiSettings.apiKey) throw new Error('No API key configured');
        return generateFollowUp({ ...explainContextRef.current, explanation: explainText, question });
    };

    return {
        selection, setSelection,
        showDictionary, setShowDictionary,
        showExplain, setShowExplain,
        explainText, explainLoading, explainError, explainSaved,
        explainContextRef,
        clearSelection,
        handleHighlight, handleDictionary, handleExplain, handleExplainSave, handleExplainFollowUp,
    };
};
