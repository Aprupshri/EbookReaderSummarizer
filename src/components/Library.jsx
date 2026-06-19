import React, { useState, useEffect, useRef } from 'react';
import ePub from 'epubjs';
import { saveBook, getBooks, deleteBook } from '../utils/storage';
import { Search, Plus, Trash2, BookPlus, Compass, Settings, Key, X, BookOpen, BookMarked, Upload } from 'lucide-react';
import BookCover from './BookCover';
import AddPhysicalBook from './AddPhysicalBook';
import SettingsModal from './SettingsModal';
import DiscoverModal from './DiscoverModal';

const FILTERS = [
  { value: 'all',      label: 'All'      },
  { value: 'reading',  label: 'Reading'  },
  { value: 'ebook',    label: 'E-books'  },
  { value: 'physical', label: 'Physical' },
  { value: 'finished', label: 'Finished' },
];

function progressOf(book) {
  if (book.type === 'physical' && book.totalPages) return book.currentPage / book.totalPages;
  if (book.progress !== undefined) return book.progress;
  return book.cfi ? 0.05 : 0;
}

function metaLine(book) {
  const pct = Math.round(progressOf(book) * 100);
  const type = book.type === 'physical' ? 'Physical' : book.format === 'pdf' ? 'PDF' : 'E-book';
  if (pct > 0 && pct < 100) return `${type}  ·  ${pct}%`;
  if (pct >= 100) return `${type}  ·  Finished`;
  return type;
}

function statusOf(book) {
  const p = progressOf(book);
  if (p >= 1) return 'finished';
  if (p > 0 || book.cfi) return 'reading';
  return 'unread';
}

function GridCard({ book, index, onOpen, onDelete, isEditMode, revealedDeleteId, setRevealedDeleteId, longPressStart, longPressEnd }) {
  const status = statusOf(book);
  const pct = Math.round(progressOf(book) * 100);
  const isRevealed = revealedDeleteId === book.id;

  const handleClick = () => {
    if (isEditMode) return;
    if (isRevealed) { setRevealedDeleteId(null); return; }
    onOpen(book);
  };

  return (
    <button
      className={'ath-gridcard anim-fade-up' + (isEditMode ? ' animate-wiggle' : '')}
      style={{ animationDelay: Math.min(index * 35, 320) + 'ms' }}
      onClick={handleClick}
      onPointerDown={() => !isEditMode && longPressStart(book.id)}
      onPointerUp={longPressEnd}
      onPointerLeave={longPressEnd}
      onPointerCancel={longPressEnd}
    >
      <div className="ath-gridcard-cover">
        <BookCover book={book} />
        {!isEditMode && !isRevealed && (
          <div className="ath-gridcard-hover">
            <span className="ath-gridcard-cta">
              <BookOpen size={13} strokeWidth={2} />
              {status === 'reading' ? 'Resume' : status === 'finished' ? 'Reread' : 'Read'}
            </span>
          </div>
        )}
        {(isEditMode || isRevealed) && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4, borderRadius: '3px 5px 5px 3px' }}>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(e, book.id); }}
              style={{ padding: 12, background: '#dc2626', borderRadius: '50%', color: '#fff', border: 0, cursor: 'pointer' }}
            >
              <Trash2 size={20} />
            </button>
          </div>
        )}
        {book.type === 'physical' && (
          <span className="ath-gridcard-badge"><BookMarked size={12} strokeWidth={2} /></span>
        )}
      </div>
      <div className="ath-gridcard-body">
        <div className="ath-gridcard-title serif">{book.title}</div>
        <div className="ath-gridcard-author">{book.author}</div>
        <div className="label-cat ath-gridcard-meta">{metaLine(book)}</div>
        {status === 'reading' && pct > 0 && (
          <div className="ath-progress-wrap" style={{ marginTop: 8 }}>
            <div className="ath-progress" style={{ height: 3 }}>
              <div className="ath-progress-fill" style={{ width: pct + '%' }} />
            </div>
          </div>
        )}
      </div>
    </button>
  );
}

function ContinueHero({ book, onOpen }) {
  const pct = Math.round(progressOf(book) * 100);
  const lastReadStr = book.lastRead
    ? new Date(book.lastRead).toLocaleDateString([], { month: 'short', day: 'numeric' })
    : '';
  return (
    <div className="ath-hero anim-fade-up">
      <div className="ath-hero-cover" onClick={() => onOpen(book)}>
        <BookCover book={book} />
      </div>
      <div className="ath-hero-body">
        <div className="label-cat" style={{ color: 'var(--accent-ink)' }}>
          Continue reading{lastReadStr ? ` · ${lastReadStr}` : ''}
        </div>
        <h2 className="ath-hero-title serif">{book.title}</h2>
        <div className="ath-hero-author">{book.author}</div>
        <div className="ath-hero-progress">
          <div className="ath-progress-wrap">
            <div className="ath-progress" style={{ height: 5 }}>
              <div className="ath-progress-fill" style={{ width: pct + '%' }} />
            </div>
          </div>
          <div className="ath-hero-progress-meta">
            <span className="mono">{pct}% complete</span>
          </div>
        </div>
        <div className="ath-hero-actions">
          <button className="ath-btn ath-btn--primary ath-btn--md" onClick={() => onOpen(book)}>
            <BookOpen size={16} strokeWidth={2} /><span>Resume reading</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const Library = ({ onOpenBook, showDiscoverOnMount, onDiscoverClose }) => {
  const [books, setBooks]                     = useState([]);
  const [isUploading, setIsUploading]         = useState(false);
  const [showAddPhysical, setShowAddPhysical] = useState(false);
  const [showSettings, setShowSettings]       = useState(false);
  const [showDiscover, setShowDiscover]       = useState(false);
  const [isEditMode, setIsEditMode]           = useState(false);
  const [searchQuery, setSearchQuery]         = useState('');
  const [filter, setFilter]                   = useState('all');
  const [hasApiKey, setHasApiKey]             = useState(() => !!localStorage.getItem('gemini_api_key'));
  const [dismissedBanner, setDismissedBanner] = useState(() => !!localStorage.getItem('api_banner_dismissed'));
  const [showAddMenu, setShowAddMenu]           = useState(false);
  const [revealedDeleteId, setRevealedDeleteId] = useState(null);
  const longPressTimer = useRef(null);
  const addMenuRef = useRef(null);

  useEffect(() => { loadBooks(); }, []);

  useEffect(() => {
    if (showDiscoverOnMount) setShowDiscover(true);
  }, [showDiscoverOnMount]);

  useEffect(() => {
    const close = (e) => { if (addMenuRef.current && !addMenuRef.current.contains(e.target)) setShowAddMenu(false); };
    if (showAddMenu) document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showAddMenu]);

  const loadBooks = async () => {
    const stored = await getBooks();
    setBooks(stored.sort((a, b) => (b.lastRead || 0) - (a.lastRead || 0)));
  };

  const heroBook = books.find(b => { const p = progressOf(b); return p > 0 && p < 1; }) || null;

  const filteredBooks = books.filter(b => {
    if (searchQuery && !(b.title + b.author).toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filter === 'all') return true;
    if (filter === 'reading') return statusOf(b) === 'reading';
    if (filter === 'finished') return statusOf(b) === 'finished';
    if (filter === 'ebook') return b.type !== 'physical';
    if (filter === 'physical') return b.type === 'physical';
    return true;
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      let title = file.name.replace(/\.(epub|pdf)$/i, '');
      let author = 'Unknown Author';
      let coverBlob = null;
      const type = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'epub';
      if (type === 'epub') {
        try {
          const book = ePub(file);
          await book.ready;
          const metadata = await book.loaded.metadata;
          if (metadata.title) title = metadata.title;
          if (metadata.creator) author = metadata.creator;
          try {
            const coverUrl = await book.coverUrl();
            if (coverUrl) {
              const res = await fetch(coverUrl);
              const blob = await res.blob();
              coverBlob = { buffer: await blob.arrayBuffer(), type: blob.type };
            }
          } catch {}
        } catch {}
      }
      const fileBuffer = await file.arrayBuffer();
      await saveBook({
        id: Date.now().toString(), title, author,
        fileData: { buffer: fileBuffer, type: file.type || (type === 'pdf' ? 'application/pdf' : 'application/epub+zip'), name: file.name },
        cover: coverBlob, cfi: null, lastRead: Date.now(), format: type,
      });
      await loadBooks();
    } catch (err) {
      console.error('Error adding book:', err);
      alert('Failed to add book. Please try another file.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (e, bookId) => {
    e.stopPropagation();
    if (!window.confirm('Remove this book from your library?')) return;
    await deleteBook(bookId);
    setRevealedDeleteId(null);
    await loadBooks();
  };

  const longPressStart = (bookId) => {
    longPressTimer.current = setTimeout(() => setRevealedDeleteId(prev => prev === bookId ? null : bookId), 400);
  };
  const longPressEnd = () => clearTimeout(longPressTimer.current);

  return (
    <>
      <div className="ath-screen scroll-area">
        <div className="ath-screen-inner">

          {/* Page header */}
          <header className="ath-pagehead">
            <div>
              <div className="label-cat">Your collection · {books.length} volume{books.length !== 1 ? 's' : ''}</div>
              <h1 className="ath-pagetitle serif">The Library</h1>
            </div>
            <div className="ath-search ath-pagehead-search">
              <Search size={16} style={{ color: 'var(--ink-faint)', flexShrink: 0 }} />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search title or author…" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="ath-iconbtn"
                onClick={() => setShowSettings(true)}
                title="Settings"
                style={!hasApiKey ? { color: 'var(--accent-ink)', background: 'var(--accent-soft)' } : {}}
              >
                <Settings size={18} />
              </button>

              {/* Add Book — integrated dropdown, no floating overlay */}
              <div style={{ position: 'relative' }} ref={addMenuRef}>
                <button
                  className="ath-btn ath-btn--primary ath-btn--sm"
                  onClick={() => setShowAddMenu(v => !v)}
                  aria-expanded={showAddMenu}
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>Add Book</span>
                </button>

                {showAddMenu && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 60,
                    background: 'var(--surface)', border: '1px solid var(--line)',
                    borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-lg)',
                    padding: 6, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 216,
                  }}>
                    <button
                      onClick={() => { setShowAddMenu(false); setShowDiscover(true); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--r-md)', border: 0, background: 'none', cursor: 'pointer', color: 'var(--ink)', fontSize: 14, fontWeight: 500, width: '100%', textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Compass size={16} />
                      </div>
                      Discover Classics
                    </button>
                    <label
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--r-md)', cursor: 'pointer', color: 'var(--ink)', fontSize: 14, fontWeight: 500 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'color-mix(in oklab, var(--accent) 10%, var(--surface-2))', color: 'var(--accent-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Upload size={16} />
                      </div>
                      Upload .epub / .pdf
                      <input type="file" accept=".epub,.pdf" onChange={e => { setShowAddMenu(false); handleFileUpload(e); }} style={{ display: 'none' }} disabled={isUploading} />
                    </label>
                    <button
                      onClick={() => { setShowAddMenu(false); setShowAddPhysical(true); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--r-md)', border: 0, background: 'none', cursor: 'pointer', color: 'var(--ink)', fontSize: 14, fontWeight: 500, width: '100%', textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'color-mix(in oklab, #2f9e44 10%, var(--surface-2))', color: '#2f9e44', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <BookPlus size={16} />
                      </div>
                      Add Physical Book
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* API key banner */}
          {!hasApiKey && !dismissedBanner && (
            <div className="ath-banner">
              <Key size={16} style={{ color: 'oklch(0.72 0.14 60)', flexShrink: 0, marginTop: 1 }} />
              <div className="ath-banner-body">
                <div className="ath-banner-title">Add your Gemini API key to unlock AI features</div>
                <div className="ath-banner-sub">Summaries, Recall and Explain won't work without it.</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <button className="ath-btn ath-btn--sm ath-btn--accentsoft" onClick={() => setShowSettings(true)}>Add Key</button>
                <button className="ath-iconbtn" style={{ width: 28, height: 28 }} onClick={() => { setDismissedBanner(true); localStorage.setItem('api_banner_dismissed', '1'); }}>
                  <X size={13} />
                </button>
              </div>
            </div>
          )}

          {isUploading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', color: 'var(--ink-soft)', fontSize: 14 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--line)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
              Processing book…
            </div>
          )}

          {/* Empty library onboarding */}
          {books.length === 0 && !isUploading ? (
            <div className="ath-empty">
              <BookOpen size={36} style={{ color: 'var(--ink-faint)' }} />
              <p className="serif">Your library is empty</p>
              <span className="label-cat">Add a book to get started</span>
              <div className="ath-onboard-grid" style={{ width: '100%' }}>
                <button className="ath-onboard-card" onClick={() => setShowDiscover(true)}>
                  <div className="ath-onboard-icon"><Compass size={24} /></div>
                  <div className="ath-onboard-title">Discover Classics</div>
                  <div className="ath-onboard-desc">Browse free public-domain books</div>
                </button>
                <label className="ath-onboard-card">
                  <div className="ath-onboard-icon"><Plus size={24} /></div>
                  <div className="ath-onboard-title">Upload File</div>
                  <div className="ath-onboard-desc">Import your own .epub or .pdf</div>
                  <input type="file" accept=".epub,.pdf" onChange={handleFileUpload} style={{ display: 'none' }} disabled={isUploading} />
                </label>
                <button className="ath-onboard-card" onClick={() => setShowAddPhysical(true)}>
                  <div className="ath-onboard-icon"><BookPlus size={24} /></div>
                  <div className="ath-onboard-title">Add Physical Book</div>
                  <div className="ath-onboard-desc">Track progress for a paper book</div>
                </button>
              </div>
            </div>
          ) : (
            <>
              {heroBook && filter === 'all' && !searchQuery && (
                <ContinueHero book={heroBook} onOpen={onOpenBook} />
              )}

              <div className="ath-filterbar">
                <div className="ath-chips">
                  {FILTERS.map(f => (
                    <button key={f.value} className={'ath-chip ' + (filter === f.value ? 'is-on' : '')} onClick={() => setFilter(f.value)}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="label-cat">{filteredBooks.length} shown</span>
                  <button className={'ath-btn ath-btn--sm ' + (isEditMode ? 'ath-btn--accentsoft' : 'ath-btn--ghost')} onClick={() => setIsEditMode(!isEditMode)}>
                    {isEditMode ? <><X size={13} /><span>Done</span></> : <><Trash2 size={13} /><span>Edit</span></>}
                  </button>
                </div>
              </div>

              {filteredBooks.length > 0 ? (
                <div className="ath-grid">
                  {filteredBooks.map((book, i) => (
                    <GridCard
                      key={book.id} book={book} index={i}
                      onOpen={onOpenBook} onDelete={handleDelete}
                      isEditMode={isEditMode} revealedDeleteId={revealedDeleteId}
                      setRevealedDeleteId={setRevealedDeleteId}
                      longPressStart={longPressStart} longPressEnd={longPressEnd}
                    />
                  ))}
                </div>
              ) : (
                <div className="ath-empty">
                  <BookOpen size={30} style={{ color: 'var(--ink-faint)' }} />
                  <p className="serif">Nothing matches.</p>
                  <span className="label-cat">Try another filter</span>
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {showAddPhysical && (
        <AddPhysicalBook onClose={() => setShowAddPhysical(false)} onBookAdded={() => { setShowAddPhysical(false); loadBooks(); }} />
      )}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => { setShowSettings(false); const k = localStorage.getItem('gemini_api_key'); setHasApiKey(!!k); if (k) setDismissedBanner(true); }}
      />
      <DiscoverModal
        isOpen={showDiscover}
        onClose={() => { setShowDiscover(false); onDiscoverClose?.(); }}
        onBookAdded={() => loadBooks()}
      />
    </>
  );
};

export default Library;
