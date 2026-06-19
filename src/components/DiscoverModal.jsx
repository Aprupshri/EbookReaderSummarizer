import React, { useState, useEffect } from 'react';
import { X, Search, Download, BookOpen, Loader, CheckCircle2 } from 'lucide-react';

const DiscoverModal = ({ isOpen, onClose, onBookAdded }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [downloadedIds, setDownloadedIds] = useState(new Set());

    useEffect(() => {
        if (isOpen) fetchBooks();
    }, [isOpen]);

    const fetchBooks = async (query = '') => {
        setLoading(true);
        try {
            const url = query
                ? `https://gutendex.com/books/?search=${encodeURIComponent(query)}`
                : 'https://gutendex.com/books/?sort=popular';
            const response = await fetch(url);
            const data = await response.json();
            setBooks(data.results.filter(b => b.formats['application/epub+zip']));
        } catch {}
        finally { setLoading(false); }
    };

    const handleSearch = (e) => { e.preventDefault(); fetchBooks(searchQuery); };

    const handleDownload = (book) => {
        window.location.href = book.formats['application/epub+zip'];
        alert(`You are downloading "${book.title}" directly from Project Gutenberg to your device's Downloads folder.\n\nOnce the download finishes, simply use the "Upload File" button in your Library to add it to your collection!`);
        setDownloadedIds(prev => new Set(prev).add(book.id));
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="ath-overlay" onClick={onClose}>
            <div
                className="ath-modal ath-modal--center"
                style={{ maxWidth: 860 }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="ath-modal-head">
                    <div>
                        <div className="label-cat">Project Gutenberg</div>
                        <h2 className="serif" style={{ fontSize: '1.2rem' }}>Discover Free Classics</h2>
                    </div>
                    <button className="ath-iconbtn" onClick={onClose} aria-label="Close"><X size={18} /></button>
                </div>

                {/* Search */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
                    <form onSubmit={handleSearch} style={{ position: 'relative', display: 'flex', gap: 10 }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', pointerEvents: 'none' }} />
                            <input
                                type="text"
                                placeholder="Search by title or author…"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="ath-input"
                                style={{ paddingLeft: 36 }}
                            />
                        </div>
                        <button type="submit" className="ath-btn ath-btn--primary ath-btn--md">Search</button>
                    </form>
                </div>

                {/* Results */}
                <div className="ath-modal-body">
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 280, gap: 12, color: 'var(--ink-soft)' }}>
                            <Loader size={28} style={{ color: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
                            <p style={{ fontSize: 14 }}>Loading books from Gutenberg…</p>
                        </div>
                    ) : books.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 20 }}>
                            {books.map(book => (
                                <div
                                    key={book.id}
                                    style={{
                                        background: 'var(--surface)',
                                        border: '1px solid var(--line)',
                                        borderRadius: 'var(--r-lg)',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        transition: 'box-shadow .2s, transform .2s',
                                    }}
                                    className="group"
                                    onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
                                >
                                    {/* Cover */}
                                    <div style={{ aspectRatio: '2/3', background: 'var(--surface-2)', position: 'relative', overflow: 'hidden' }}>
                                        {book.formats['image/jpeg'] ? (
                                            <img
                                                src={book.formats['image/jpeg']}
                                                alt={book.title}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-faint)' }}>
                                                <BookOpen size={36} />
                                            </div>
                                        )}
                                        {/* Hover CTA overlay */}
                                        <div style={{
                                            position: 'absolute', inset: 0,
                                            background: 'linear-gradient(to top, rgba(0,0,0,.75) 0%, transparent 55%)',
                                            display: 'flex', alignItems: 'flex-end', padding: 10,
                                            opacity: 0, transition: 'opacity .2s',
                                        }}
                                            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                            onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                                        >
                                            {downloadedIds.has(book.id) ? (
                                                <button disabled className="ath-btn ath-btn--sm" style={{ width: '100%', background: '#2f9e44', color: '#fff', border: 0, gap: 4 }}>
                                                    <CheckCircle2 size={13} /> Downloaded
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={e => { e.stopPropagation(); handleDownload(book); }}
                                                    className="ath-btn ath-btn--primary ath-btn--sm"
                                                    style={{ width: '100%', gap: 4 }}
                                                >
                                                    <Download size={13} /> Get Book
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Meta */}
                                    <div style={{ padding: '10px 12px' }}>
                                        <div style={{ fontSize: 13, fontWeight: 550, color: 'var(--ink)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.35, marginBottom: 4 }}>
                                            {book.title}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--ink-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {book.authors?.[0]?.name || 'Unknown'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--ink-faint)' }}>
                            <BookOpen size={40} style={{ marginBottom: 12, opacity: .4 }} />
                            <p style={{ fontSize: 14 }}>No free books found for this query.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DiscoverModal;
