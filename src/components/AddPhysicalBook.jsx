import React, { useState } from 'react';
import { Book, Search, X, Camera, ChevronRight, Loader } from 'lucide-react';
import { saveBook } from '../utils/storage';

const AddPhysicalBook = ({ onClose, onBookAdded }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState('isbn'); // 'isbn' or 'author'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [searchResults, setSearchResults] = useState([]); // For author search results
    const [selectedBook, setSelectedBook] = useState(null); // For preview
    const [manualForm, setManualForm] = useState({ title: '', author: '', totalPages: '300' });

    const addBookToLibrary = async (bookInfo) => {
        let coverBlob = null;
        let coverUrl = null;

        if (bookInfo.cover) {
            // Handle both URL string (from author search) and object with .medium (from ISBN search)
            const imageUrl = typeof bookInfo.cover === 'string' ? bookInfo.cover : bookInfo.cover.medium;
            if (imageUrl) {
                try {
                    const imgRes = await fetch(imageUrl);
                    coverBlob = await imgRes.blob();
                    coverUrl = imageUrl;
                } catch (e) {
                    console.warn("Could not fetch cover image", e);
                }
            }
        }

        const authors = Array.isArray(bookInfo.authors)
            ? bookInfo.authors.map((a) => a.name || a).join(', ')
            : (bookInfo.author || 'Unknown Author');

        const newBook = {
            id: Date.now().toString(),
            type: 'physical',
            title: bookInfo.title || 'Unknown Title',
            author: authors,
            totalPages: bookInfo.pages || bookInfo.number_of_pages || 300,
            currentPage: 0,
            cover: coverBlob,
            coverUrl: coverUrl,
            rating: bookInfo.ratings_average || null,
            ratingCount: bookInfo.ratings_count || null,
            sessions: [],
            lastRead: Date.now(),
        };

        await saveBook(newBook);
        onBookAdded();
        onClose();
    };

    const searchBook = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setLoading(true);
        setError('');
        setSearchResults([]);

        try {
            if (searchType === 'isbn') {
                const cleanIsbn = searchQuery.replace(/[-\s]/g, '');
                const response = await fetch(
                    `https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&jscmd=data&format=json`
                );
                const data = await response.json();

                if (Object.keys(data).length > 0) {
                    const bookKey = Object.keys(data)[0];
                    const bookInfo = data[bookKey];

                    if (bookInfo.key) {
                        try {
                            const ratingRes = await fetch(`https://openlibrary.org${bookInfo.key}/ratings.json`);
                            const ratingData = await ratingRes.json();
                            bookInfo.ratings_average = ratingData.summary?.average || null;
                            bookInfo.ratings_count = ratingData.summary?.count || null;
                        } catch (e) {
                            console.warn('Could not fetch ratings for ISBN book');
                        }
                    }

                    await addBookToLibrary(bookInfo);
                } else {
                    setError('Book not found. Try author search or manual entry.');
                }
            } else {
                const response = await fetch(
                    `https://openlibrary.org/search.json?author=${encodeURIComponent(searchQuery)}&limit=100`
                );
                const data = await response.json();

                if (data.docs && data.docs.length > 0) {
                    const filterKeywords = [
                        'summary', 'summaries', 'guide', 'review', 'sparknotes', 'cliffsnotes',
                        'instaread', 'audiobook', 'audiobooks', 'analysis', 'study guide'
                    ];
                    let results = data.docs
                        .filter((doc) => {
                            const title = doc.title.toLowerCase();
                            return !filterKeywords.some((keyword) => title.includes(keyword)) && doc.cover_i;
                        })
                        .sort((a, b) => (b.edition_count || 0) - (a.edition_count || 0))
                        .slice(0, 20)
                        .map((doc) => ({
                            title: doc.title,
                            author: doc.author_name?.[0] || 'Unknown Author',
                            pages: doc.number_of_pages_median || 300,
                            cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
                            key: doc.key,
                            ratings_average: null,
                            ratings_count: null,
                        }));

                    if (results.length > 0) {
                        setSearchResults(results);

                        results.forEach((book) => {
                            fetch(`https://openlibrary.org${book.key}/ratings.json`)
                                .then((res) => res.json())
                                .then((rData) => {
                                    setSearchResults((prev) =>
                                        prev.map((b) =>
                                            b.key === book.key
                                                ? { ...b, ratings_average: rData.summary?.average || null, ratings_count: rData.summary?.count || null }
                                                : b
                                        )
                                    );
                                })
                                .catch(() => {});
                        });
                    } else {
                        setError('No actual books found. Try ISBN search or manual entry.');
                    }
                } else {
                    setError('No books found by this author. Try manual entry.');
                }
            }
        } catch (err) {
            console.error(err);
            setError('Network error. Try again or use manual entry.');
        } finally {
            setLoading(false);
        }
    };

    const handleManualAdd = async (e) => {
        e.preventDefault();
        if (!manualForm.title || !manualForm.author) {
            setError('Please enter title and author.');
            return;
        }

        const newBook = {
            id: Date.now().toString(),
            type: 'physical',
            title: manualForm.title,
            author: manualForm.author,
            totalPages: parseInt(manualForm.totalPages) || 300,
            currentPage: 0,
            cover: null,
            sessions: [],
            lastRead: Date.now(),
        };

        await saveBook(newBook);
        onBookAdded();
        onClose();
    };

    return (
        <div className="ath-overlay" onClick={onClose}>
            <div className="ath-modal ath-modal--center" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
                <div className="ath-modal-head">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Book size={16} style={{ color: 'var(--accent)' }} />
                        <h2 className="serif">Add Physical Book</h2>
                    </div>
                    <button className="ath-iconbtn" onClick={onClose} aria-label="Close"><X size={18} /></button>
                </div>

                <div className="ath-modal-body">
                    {!showManualEntry ? (
                        <form onSubmit={searchBook} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                            {/* Search type toggle */}
                            <div style={{ display: 'flex', gap: 8 }}>
                                {['isbn', 'author'].map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => { setSearchType(type); setSearchQuery(''); setSearchResults([]); setSelectedBook(null); setError(''); }}
                                        className={'ath-btn ath-btn--sm ' + (searchType === type ? 'ath-btn--primary' : 'ath-btn--ghost')}
                                        style={{ flex: 1, justifyContent: 'center' }}
                                    >
                                        {type === 'isbn' ? 'ISBN' : 'Author'}
                                    </button>
                                ))}
                            </div>

                            <div>
                                <div className="label-cat" style={{ marginBottom: 8 }}>
                                    {searchType === 'isbn' ? 'Scan or Enter ISBN' : 'Enter Author Name'}
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', pointerEvents: 'none' }} />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={searchType === 'isbn' ? 'e.g. 9780544003415' : 'e.g. Ursula K. Le Guin'}
                                        className="ath-input"
                                        style={{ paddingLeft: 38, paddingRight: searchType === 'isbn' ? 44 : 12 }}
                                    />
                                    {searchType === 'isbn' && (
                                        <button type="button" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, color: 'var(--accent)', cursor: 'pointer', padding: 0 }} title="Scan Barcode (Coming Soon)">
                                            <Camera size={18} />
                                        </button>
                                    )}
                                </div>
                                {error && <p style={{ marginTop: 6, fontSize: 13, color: 'var(--error, #c92a2a)' }}>{error}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !searchQuery.trim()}
                                className="ath-btn ath-btn--primary ath-btn--md"
                                style={{ width: '100%', justifyContent: 'center' }}
                            >
                                {loading
                                    ? <><Loader size={15} style={{ animation: 'spin 0.8s linear infinite' }} /><span>Searching…</span></>
                                    : `Search by ${searchType === 'isbn' ? 'ISBN' : 'Author'}`}
                            </button>

                            {!selectedBook && searchResults.length > 0 && (
                                <div>
                                    <div className="label-cat" style={{ marginBottom: 8 }}>Found {searchResults.length} books</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 320, overflowY: 'auto' }}>
                                        {searchResults.map((book, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setSelectedBook(book)}
                                                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 'var(--r-md)', border: '1px solid var(--line)', background: 'var(--surface-2)', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                                            >
                                                {book.cover && (
                                                    <img src={book.cover} alt={book.title} style={{ width: 36, height: 52, borderRadius: 3, objectFit: 'cover', flexShrink: 0 }} />
                                                )}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.author}</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                                        <span className="label-cat">{book.pages} pages</span>
                                                        {book.ratings_average && (
                                                            <span style={{ fontSize: 11, background: 'color-mix(in oklab, #f59e0b 15%, var(--surface-2))', color: '#b45309', padding: '1px 6px', borderRadius: 99 }}>
                                                                ★ {book.ratings_average.toFixed(1)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <ChevronRight size={16} style={{ color: 'var(--ink-faint)', flexShrink: 0 }} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedBook && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                        {selectedBook.cover && (
                                            <img src={selectedBook.cover} alt={selectedBook.title} style={{ width: 96, height: 140, borderRadius: 6, objectFit: 'cover', boxShadow: 'var(--shadow-md)' }} />
                                        )}
                                        <div style={{ textAlign: 'center' }}>
                                            <div className="serif" style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>{selectedBook.title}</div>
                                            <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{selectedBook.author}</div>
                                            <div className="label-cat" style={{ marginTop: 4 }}>{selectedBook.pages} pages</div>
                                            {selectedBook.ratings_average && (
                                                <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'color-mix(in oklab, #f59e0b 12%, var(--surface-2))', color: '#b45309', padding: '5px 12px', borderRadius: 99, fontSize: 13 }}>
                                                    ★ {selectedBook.ratings_average.toFixed(1)}/5
                                                    <span style={{ fontSize: 11, opacity: 0.7 }}>({selectedBook.ratings_count} ratings)</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button type="button" onClick={() => setSelectedBook(null)} className="ath-btn ath-btn--ghost ath-btn--md" style={{ flex: 1, justifyContent: 'center' }}>Back</button>
                                        <button
                                            type="button"
                                            disabled={loading}
                                            onClick={async () => {
                                                setLoading(true);
                                                try { await addBookToLibrary(selectedBook); }
                                                catch (err) { console.error(err); setError('Failed to add book.'); setLoading(false); }
                                            }}
                                            className="ath-btn ath-btn--primary ath-btn--md"
                                            style={{ flex: 1, justifyContent: 'center' }}
                                        >
                                            {loading ? <Loader size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'Add Book'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                                <span className="label-cat">or</span>
                                <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                            </div>

                            <button type="button" onClick={() => { setShowManualEntry(true); setError(''); }} className="ath-btn ath-btn--ghost ath-btn--md" style={{ width: '100%', justifyContent: 'center' }}>
                                Enter Manually
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleManualAdd} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <div className="label-cat" style={{ marginBottom: 8 }}>Book Title</div>
                                <input type="text" value={manualForm.title} onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })} placeholder="e.g. The Great Gatsby" className="ath-input" />
                            </div>
                            <div>
                                <div className="label-cat" style={{ marginBottom: 8 }}>Author</div>
                                <input type="text" value={manualForm.author} onChange={(e) => setManualForm({ ...manualForm, author: e.target.value })} placeholder="e.g. F. Scott Fitzgerald" className="ath-input" />
                            </div>
                            <div>
                                <div className="label-cat" style={{ marginBottom: 8 }}>Total Pages</div>
                                <input type="number" value={manualForm.totalPages} onChange={(e) => setManualForm({ ...manualForm, totalPages: e.target.value })} placeholder="300" className="ath-input" />
                            </div>
                            {error && <p style={{ fontSize: 13, color: 'var(--error, #c92a2a)' }}>{error}</p>}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button type="button" onClick={() => { setShowManualEntry(false); setError(''); }} className="ath-btn ath-btn--ghost ath-btn--md" style={{ flex: 1, justifyContent: 'center' }}>Back</button>
                                <button type="submit" className="ath-btn ath-btn--primary ath-btn--md" style={{ flex: 1, justifyContent: 'center' }}>Add Book</button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddPhysicalBook;
