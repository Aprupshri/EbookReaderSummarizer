import React, { useEffect, useState } from 'react';
import { X, Trash2, Edit3, AlignLeft, BookMarked, MessageSquare, Sparkles } from 'lucide-react';
import { getHighlights, deleteHighlight, getSummaries, deleteSummary, getEntriesByBook, deleteEntry } from '../utils/storage';
import ReactMarkdown from 'react-markdown';

const formatDate = (ts) => new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

const NotesModal = ({ isOpen, onClose, bookId, bookTitle, onDeleteHighlight, onClickHighlight }) => {
    const [activeTab, setActiveTab] = useState('highlights');
    const [highlights, setHighlights] = useState([]);
    const [summaries, setSummaries] = useState([]);
    const [explanations, setExplanations] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadNotes = async () => {
        setLoading(true);
        try {
            const h = await getHighlights(bookId);
            setHighlights(h.sort((a, b) => b.timestamp - a.timestamp));
            const s = await getSummaries(bookId);
            setSummaries(s.sort((a, b) => b.timestamp - a.timestamp));
            const entries = await getEntriesByBook(bookId);
            setExplanations(entries.filter(e => (e.tags || []).includes('ai-explanation')));
        } catch {}
        setLoading(false);
    };

    useEffect(() => { if (isOpen && bookId) loadNotes(); }, [isOpen, bookId]);

    const handleDeleteHighlight = async (cfiRange) => {
        if (!window.confirm('Delete this highlight?')) return;
        await deleteHighlight(bookId, cfiRange);
        await loadNotes();
        onDeleteHighlight?.(cfiRange);
    };

    const handleDeleteSummary = async (timestamp) => {
        if (!window.confirm('Delete this summary?')) return;
        await deleteSummary(bookId, timestamp);
        await loadNotes();
    };

    const handleDeleteExplanation = async (id) => {
        if (!window.confirm('Delete this explanation?')) return;
        await deleteEntry(id);
        await loadNotes();
    };

    if (!isOpen) return null;

    const TABS = [
        { key: 'highlights',   label: 'Highlights',   count: highlights.length },
        { key: 'explanations', label: 'Explanations', count: explanations.length },
        { key: 'summaries',    label: 'Summaries',    count: summaries.length },
    ];

    return (
        <div className="ath-overlay" style={{ zIndex: 120 }} onClick={onClose}>
            <div
                className="ath-modal ath-modal--center"
                style={{ maxWidth: 680 }}
                onClick={e => e.stopPropagation()}
            >
                <div className="ath-modal-head">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <BookMarked size={18} style={{ color: 'var(--accent)' }} />
                        <div>
                            <h2 className="serif">Notes &amp; Highlights</h2>
                            <div className="label-cat" style={{ textTransform: 'none', letterSpacing: 0, marginTop: 2 }}>{bookTitle}</div>
                        </div>
                    </div>
                    <button className="ath-iconbtn" onClick={onClose}><X size={18} /></button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`ath-toc-tab${activeTab === tab.key ? ' is-on' : ''}`}
                        >
                            {tab.label} ({tab.count})
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: 'var(--surface-2)' }}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--line)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
                        </div>

                    ) : activeTab === 'explanations' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {explanations.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--ink-faint)' }}>
                                    <Sparkles size={28} style={{ margin: '0 auto 10px', opacity: .3 }} />
                                    <p style={{ fontSize: 14 }}>No saved explanations yet.</p>
                                    <p style={{ fontSize: 13, marginTop: 4, opacity: .7 }}>Select text while reading, tap Explain, then Save.</p>
                                </div>
                            ) : explanations.map((e) => (
                                <div key={e.id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '14px 16px', borderLeft: '3px solid var(--accent)' }}>
                                    <blockquote className="serif" style={{ fontSize: 14, lineHeight: 1.5, fontStyle: 'italic', color: 'var(--ink)', marginBottom: 10, opacity: .75 }}>
                                        "{e.quote}"
                                    </blockquote>
                                    <div style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--ink)' }}>
                                        <ReactMarkdown>{e.myNote}</ReactMarkdown>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                                        <span className="label-cat" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>{formatDate(e.timestamp)}</span>
                                        <button onClick={() => handleDeleteExplanation(e.id)} className="ath-iconbtn" style={{ width: 28, height: 28, opacity: .4 }} title="Delete">
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                    ) : activeTab === 'highlights' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {highlights.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--ink-faint)' }}>
                                    <Edit3 size={28} style={{ margin: '0 auto 10px', opacity: .3 }} />
                                    <p style={{ fontSize: 14 }}>No highlights yet.</p>
                                    <p style={{ fontSize: 13, marginTop: 4, opacity: .7 }}>Select text while reading to add one.</p>
                                </div>
                            ) : highlights.map((h, i) => (
                                <div
                                    key={i}
                                    onClick={() => h.cfiRange && onClickHighlight?.(h.cfiRange)}
                                    style={{
                                        background: 'var(--surface)', border: '1px solid var(--line)',
                                        borderRadius: 'var(--r-md)', padding: '14px 16px',
                                        cursor: 'pointer', position: 'relative',
                                        borderLeft: '3px solid var(--accent)',
                                    }}
                                >
                                    <blockquote className="serif" style={{ fontSize: 15, lineHeight: 1.6, fontStyle: 'italic', color: 'var(--ink)', marginBottom: 8 }}>
                                        "{h.text}"
                                    </blockquote>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span className="label-cat" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>
                                            {formatDate(h.timestamp)}
                                        </span>
                                        <button
                                            onClick={e => { e.stopPropagation(); handleDeleteHighlight(h.cfiRange); }}
                                            className="ath-iconbtn"
                                            style={{ width: 28, height: 28, opacity: .4 }}
                                            title="Delete"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {summaries.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--ink-faint)' }}>
                                    <AlignLeft size={28} style={{ margin: '0 auto 10px', opacity: .3 }} />
                                    <p style={{ fontSize: 14 }}>No summaries generated.</p>
                                    <p style={{ fontSize: 13, marginTop: 4, opacity: .7 }}>Use the Summarize button while reading.</p>
                                </div>
                            ) : summaries.map((s, i) => (
                                <div
                                    key={i}
                                    style={{
                                        background: 'var(--surface)', border: '1px solid var(--line)',
                                        borderRadius: 'var(--r-md)', padding: '14px 16px',
                                        borderLeft: '3px solid var(--accent-soft)',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-ink)', fontSize: 13, fontWeight: 550 }}>
                                            <MessageSquare size={14} />
                                            <span style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.chapterName}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                            <span className="label-cat" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>{formatDate(s.timestamp)}</span>
                                            <button className="ath-iconbtn" style={{ width: 28, height: 28, opacity: .4 }} onClick={() => handleDeleteSummary(s.timestamp)}>
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--ink)' }}>
                                        <ReactMarkdown>{s.text}</ReactMarkdown>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotesModal;
