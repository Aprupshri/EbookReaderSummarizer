import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Send, BookMarked, Loader, AlertCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { getAllEntries } from '../utils/storage';

const searchEntries = (query, entries) => {
    if (!query.trim() || !entries.length) return [];
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    if (!terms.length) return entries.slice(0, 8);
    const scored = entries.map(e => {
        const haystack = [e.quote, e.myNote, e.bookTitle, e.bookAuthor, ...(e.tags || [])].join(' ').toLowerCase();
        let score = 0;
        for (const term of terms) {
            score += (haystack.match(new RegExp(term, 'g')) || []).length;
            if ((e.myNote || '').toLowerCase().includes(term)) score += 2;
            if ((e.tags || []).some(t => t.includes(term))) score += 2;
        }
        return { entry: e, score };
    });
    return scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 8).map(s => s.entry);
};

const buildRAGPrompt = (question, relevantEntries) => {
    const context = relevantEntries.map((e, i) =>
        `[${i + 1}] From "${e.bookTitle}" by ${e.bookAuthor}${e.chapter ? ` (${e.chapter})` : ''}:\nQuote: "${e.quote}"${e.myNote ? `\nMy note: ${e.myNote}` : ''}`
    ).join('\n\n');
    return `You are a personal knowledge assistant for a reader. Your job is to answer questions using ONLY the passages the reader has saved from their books.

Below are the reader's saved passages that may be relevant to their question:

${context}

The reader asks: "${question}"

INSTRUCTIONS:
- Answer based ONLY on the provided passages above. Do not use outside knowledge.
- Be direct and concise (150–250 words max).
- Reference specific passages using [1], [2], etc. notation when you draw from them.
- If the passages don't fully answer the question, say so honestly and suggest what else they might read / highlight.
- Write in warm, first-person conversational prose. No bullet points or headers.
- Start with the direct answer, then expand.`;
};

const CitedEntry = ({ entry, index }) => {
    const [expanded, setExpanded] = useState(false);
    return (
        <button
            className="ath-srcchip"
            onClick={() => setExpanded(p => !p)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: '8px 12px', borderRadius: 'var(--r-md)', width: '100%', textAlign: 'left' }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent-ink)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {index + 1}
                </span>
                <span style={{ flex: 1, fontSize: 12, color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.bookTitle} · {entry.bookAuthor}</span>
                {expanded ? <ChevronUp size={12} style={{ color: 'var(--ink-faint)', flexShrink: 0 }} /> : <ChevronDown size={12} style={{ color: 'var(--ink-faint)', flexShrink: 0 }} />}
            </div>
            <span className="serif" style={{ fontSize: 13, color: 'var(--ink)', fontStyle: 'italic', paddingLeft: 28, display: expanded ? 'block' : 'none' }}>
                "{entry.quote}"
            </span>
            {expanded && entry.myNote && (
                <span style={{ fontSize: 12, color: 'var(--ink-soft)', paddingLeft: 28 }}>
                    Your note: {entry.myNote}
                </span>
            )}
        </button>
    );
};

const SUGGESTIONS = [
    'What have I read about motivation and habits?',
    'What ideas about leadership have I saved?',
    'What passages moved me the most emotionally?',
    'What have I learned about decision-making?',
];

const KnowledgeBase = ({ onBack }) => {
    const [entries, setEntries] = useState([]);
    const [loadingEntries, setLoadingEntries] = useState(true);
    const [question, setQuestion] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [answer, setAnswer] = useState('');
    const [citedEntries, setCitedEntries] = useState([]);
    const [error, setError] = useState('');
    const [history, setHistory] = useState(() => {
        try { return JSON.parse(localStorage.getItem('kb_history') || '[]'); } catch { return []; }
    });
    const answerRef = useRef(null);

    useEffect(() => {
        getAllEntries().then(all => { setEntries(all); setLoadingEntries(false); });
    }, []);

    const handleAsk = useCallback(async (q) => {
        const query = (q || question).trim();
        if (!query) return;
        const apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) { setError('No Gemini API key found. Add it in Settings.'); return; }
        if (entries.length === 0) { setError('Your Commonplace Book is empty. Save some passages while reading first!'); return; }

        setIsThinking(true);
        setAnswer('');
        setCitedEntries([]);
        setError('');

        try {
            const relevant = searchEntries(query, entries);
            if (relevant.length === 0) {
                setError("I couldn't find any saved passages related to that question. Try saving more entries on this topic while reading.");
                return;
            }
            setCitedEntries(relevant);

            const prompt = buildRAGPrompt(query, relevant);
            const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
            const response = await fetch(`${API_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || 'Gemini API error');
            }
            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            setAnswer(text);

            const entry = { question: query, answer: text, timestamp: Date.now(), citedCount: relevant.length };
            const newHistory = [entry, ...history].slice(0, 20);
            setHistory(newHistory);
            localStorage.setItem('kb_history', JSON.stringify(newHistory));

            setTimeout(() => answerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setIsThinking(false);
        }
    }, [question, entries, history]);

    return (
        <div className="ath-screen" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="scroll-area" style={{ flex: 1 }}>
                <div className="ath-screen-inner">
                    <header className="ath-pagehead">
                        <div>
                            <div className="label-cat">Your notes, answered</div>
                            <h1 className="ath-pagetitle serif">Ask</h1>
                        </div>
                    </header>

                    {/* Ask bar */}
                    <form onSubmit={e => { e.preventDefault(); handleAsk(); }}>
                        <div className="ath-askbar">
                            <Sparkles size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                            <input
                                value={question}
                                onChange={e => setQuestion(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk(); } }}
                                placeholder="What have I read about…?"
                            />
                            <button
                                type="submit"
                                disabled={isThinking || !question.trim()}
                                className="ath-btn ath-btn--primary ath-btn--sm"
                                style={{ flexShrink: 0 }}
                            >
                                {isThinking ? <Loader size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Send size={15} />}
                            </button>
                        </div>
                    </form>

                    {/* Entry count notice */}
                    {!loadingEntries && (
                        <div className="label-cat" style={{ textTransform: 'none', letterSpacing: 0, fontSize: '.8rem', color: 'var(--ink-soft)', marginBottom: 20 }}>
                            <BookMarked size={13} style={{ display: 'inline', marginRight: 5 }} />
                            {entries.length > 0
                                ? <>Searching across <strong>{entries.length}</strong> saved {entries.length === 1 ? 'entry' : 'entries'}.</>
                                : <>No entries yet. Save passages while reading to power this feature.</>}
                        </div>
                    )}

                    {/* Suggestions */}
                    {!answer && !isThinking && entries.length > 0 && (
                        <div style={{ marginBottom: 24 }}>
                            <div className="label-cat" style={{ marginBottom: 10 }}>Try asking…</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {SUGGESTIONS.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => { setQuestion(s); handleAsk(s); }}
                                        className="ath-btn ath-btn--secondary ath-btn--sm"
                                        style={{ fontSize: 12 }}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Loading */}
                    {isThinking && (
                        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--ink-soft)' }}>
                            <Loader size={28} style={{ color: 'var(--accent)', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
                            <p style={{ fontSize: '.9rem' }}>Searching your notes and thinking…</p>
                        </div>
                    )}

                    {/* Error */}
                    {error && !isThinking && (
                        <div style={{ display: 'flex', gap: 10, background: 'color-mix(in oklab, red 8%, var(--surface))', border: '1px solid color-mix(in oklab, red 20%, var(--line))', borderRadius: 'var(--r-md)', padding: '12px 16px', marginBottom: 16, color: 'var(--ink)' }}>
                            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2, color: 'red' }} />
                            <span style={{ fontSize: '.88rem' }}>{error}</span>
                        </div>
                    )}

                    {/* Answer */}
                    {answer && !isThinking && (
                        <div ref={answerRef} className="ath-answer" style={{ marginBottom: 24 }}>
                            <div className="ath-answer-q serif">{question}</div>
                            <p className="ath-answer-a">{answer}</p>
                            {citedEntries.length > 0 && (
                                <>
                                    <div className="label-cat" style={{ marginBottom: 10 }}>Passages used ({citedEntries.length})</div>
                                    <div className="ath-answer-src" style={{ flexDirection: 'column' }}>
                                        {citedEntries.map((e, i) => <CitedEntry key={e.id} entry={e} index={i} />)}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Recent history */}
                    {history.length > 0 && !answer && !isThinking && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                <div className="label-cat">Recent questions</div>
                                <button
                                    onClick={() => { setHistory([]); localStorage.removeItem('kb_history'); }}
                                    className="ath-btn ath-btn--ghost ath-btn--sm"
                                    style={{ fontSize: 11, color: 'var(--ink-faint)' }}
                                >
                                    <Trash2 size={11} /> Clear
                                </button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {history.slice(0, 5).map((h, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { setQuestion(h.question); handleAsk(h.question); }}
                                        className="ath-btn ath-btn--secondary"
                                        style={{ textAlign: 'left', flexDirection: 'column', alignItems: 'flex-start', gap: 3, height: 'auto', padding: '12px 16px', overflow: 'hidden', width: '100%' }}
                                    >
                                        <span style={{ fontSize: '.9rem', color: 'var(--ink)', whiteSpace: 'normal', wordBreak: 'break-word', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{h.question}</span>
                                        <span className="label-cat" style={{ textTransform: 'none', letterSpacing: 0 }}>
                                            {h.citedCount} passages · {new Date(h.timestamp).toLocaleDateString()}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KnowledgeBase;
