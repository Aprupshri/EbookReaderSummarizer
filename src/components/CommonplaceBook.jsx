import React, { useState, useEffect, useCallback } from 'react';
import { Search, BookOpen, Tag, Trash2, ExternalLink, Download, BookMarked, X, Filter } from 'lucide-react';
import { getAllEntries, deleteEntry } from '../utils/storage';

const TAG_COLORS = ['#3b5bdb','#2f9e44','#e67700','#c92a2a','#7048e8','#0c8599'];
const tagColor = (tag) => TAG_COLORS[Math.abs([...tag].reduce((a, c) => a + c.charCodeAt(0), 0)) % TAG_COLORS.length];

const formatDate = (ts) => new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

const EntryCard = ({ entry, onDelete }) => {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const accent = entry.tags?.[0] ? tagColor(entry.tags[0]) : 'var(--accent)';

    return (
        <figure className="ath-quote break-inside-avoid" style={{ '--q': accent }}>
            <div className="ath-quote-mark serif" style={{ fontSize: 48, lineHeight: .8 }}>"</div>
            <blockquote>"{entry.quote}"</blockquote>
            {entry.myNote && (
                <p className="ath-quote-note">{entry.myNote}</p>
            )}
            {entry.tags?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {entry.tags.map(t => (
                        <span key={t} className="label-cat" style={{ background: tagColor(t) + '18', color: tagColor(t), padding: '2px 8px', borderRadius: 99 }}>
                            #{t}
                        </span>
                    ))}
                </div>
            )}
            <figcaption>
                <div className="ath-quote-src">
                    <div className="ath-quote-spine" style={{ background: accent }} />
                    <div>
                        <b>{entry.bookTitle}</b>
                        <div style={{ marginTop: 1, color: 'var(--ink-faint)', fontSize: 11 }}>{entry.bookAuthor} · {formatDate(entry.timestamp)}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                    {confirmDelete ? (
                        <>
                            <button
                                onClick={() => onDelete(entry.id)}
                                className="ath-btn ath-btn--sm"
                                style={{ background: 'var(--error, #c92a2a)', color: '#fff', border: 0 }}
                            >Delete</button>
                            <button onClick={() => setConfirmDelete(false)} className="ath-btn ath-btn--ghost ath-btn--sm">Cancel</button>
                        </>
                    ) : (
                        <button
                            onClick={() => setConfirmDelete(true)}
                            className="ath-iconbtn"
                            title="Delete entry"
                            style={{ opacity: .4, width: 28, height: 28 }}
                        >
                            <Trash2 size={13} />
                        </button>
                    )}
                </div>
            </figcaption>
        </figure>
    );
};

const CommonplaceBook = ({ onBack }) => {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedBook, setSelectedBook] = useState('all');
    const [selectedTag, setSelectedTag] = useState('all');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setEntries(await getAllEntries());
        } catch {}
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleDelete = async (id) => {
        await deleteEntry(id);
        setEntries(prev => prev.filter(e => e.id !== id));
    };

    const books = [...new Map(entries.map(e => [e.bookId, { id: e.bookId, title: e.bookTitle }])).values()];
    const allTags = [...new Set(entries.flatMap(e => e.tags || []))].sort();

    const filtered = entries.filter(e => {
        const matchBook = selectedBook === 'all' || e.bookId === selectedBook;
        const matchTag = selectedTag === 'all' || (e.tags || []).includes(selectedTag);
        const q = search.toLowerCase();
        const matchSearch = !q || e.quote.toLowerCase().includes(q) || (e.myNote || '').toLowerCase().includes(q) || e.bookTitle.toLowerCase().includes(q) || (e.tags || []).some(t => t.includes(q));
        return matchBook && matchTag && matchSearch;
    });

    const handleExport = () => {
        const lines = ['# My Commonplace Book\n'];
        let lastBook = '';
        [...filtered].sort((a, b) => a.bookTitle.localeCompare(b.bookTitle)).forEach(e => {
            if (e.bookTitle !== lastBook) {
                lines.push(`\n## ${e.bookTitle}\n*${e.bookAuthor}*\n`);
                lastBook = e.bookTitle;
            }
            lines.push(`> "${e.quote}"`);
            if (e.chapter) lines.push(`*${e.chapter}*`);
            if (e.myNote) lines.push(`\n${e.myNote}`);
            if (e.tags?.length) lines.push(`\n${e.tags.map(t => `#${t}`).join(' ')}`);
            lines.push(`\n*${formatDate(e.timestamp)}*\n---\n`);
        });
        const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'commonplace-book.md'; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="ath-screen scroll-area">
            <div className="ath-screen-inner">
                <header className="ath-pagehead">
                    <div>
                        <div className="label-cat">Your annotations</div>
                        <h1 className="ath-pagetitle serif">Commonplace Book</h1>
                        <div className="label-cat" style={{ textTransform: 'none', letterSpacing: 0, marginTop: 4, color: 'var(--ink-soft)' }}>
                            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} across {books.length} {books.length === 1 ? 'book' : 'books'}
                        </div>
                    </div>
                    {entries.length > 0 && (
                        <button onClick={handleExport} className="ath-btn ath-btn--secondary ath-btn--sm" title="Export as Markdown">
                            <Download size={14} /><span>Export</span>
                        </button>
                    )}
                </header>

                {/* Filters */}
                <div style={{ marginBottom: 24 }}>
                    <div className="ath-askbar" style={{ marginBottom: 12 }}>
                        <Search size={15} style={{ color: 'var(--ink-faint)', flexShrink: 0 }} />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search quotes, notes, tags, books…"
                        />
                        {search && (
                            <button className="ath-iconbtn" style={{ width: 28, height: 28 }} onClick={() => setSearch('')}>
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {(books.length > 1 || allTags.length > 0) && (
                        <div className="ath-chips" style={{ marginTop: 10 }}>
                            {books.length > 1 && (
                                <select
                                    value={selectedBook}
                                    onChange={e => setSelectedBook(e.target.value)}
                                    className="ath-chip"
                                    style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}
                                >
                                    <option value="all">All Books</option>
                                    {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                                </select>
                            )}
                            {allTags.map(t => (
                                <button
                                    key={t}
                                    onClick={() => setSelectedTag(t === selectedTag ? 'all' : t)}
                                    className={`ath-chip${selectedTag === t ? ' is-on' : ''}`}
                                >
                                    #{t}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Content */}
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--line)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
                    </div>
                ) : entries.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 20px', maxWidth: 360, margin: '0 auto' }}>
                        <BookMarked size={40} style={{ color: 'var(--accent)', margin: '0 auto 16px', opacity: .5 }} />
                        <h2 className="serif" style={{ fontSize: '1.3rem', fontWeight: 500, marginBottom: 10 }}>Your Commonplace Book</h2>
                        <p style={{ fontSize: '.9rem', color: 'var(--ink-soft)', lineHeight: 1.6 }}>
                            Select text while reading, then tap <strong>Save to Commonplace Book</strong> to add your first entry.
                        </p>
                        <p className="serif" style={{ fontSize: '.85rem', color: 'var(--ink-faint)', marginTop: 20, fontStyle: 'italic' }}>
                            "The faintest ink is more powerful than the strongest memory."
                        </p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-faint)' }}>
                        <Filter size={28} style={{ margin: '0 auto 12px', opacity: .4 }} />
                        <p>No entries match your filters.</p>
                        <button
                            onClick={() => { setSearch(''); setSelectedBook('all'); setSelectedTag('all'); }}
                            className="ath-btn ath-btn--ghost ath-btn--sm"
                            style={{ marginTop: 12 }}
                        >
                            Clear filters
                        </button>
                    </div>
                ) : (
                    <div className="ath-quotes">
                        {filtered.map(entry => (
                            <EntryCard key={entry.id} entry={entry} onDelete={handleDelete} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommonplaceBook;
