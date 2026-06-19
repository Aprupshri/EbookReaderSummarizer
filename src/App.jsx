import React, { useState, useEffect, useId } from 'react';
import { Library, Compass, BarChart2, BookMarked, Sparkles, Flame } from 'lucide-react';
import LibraryScreen from './components/Library';
import Reader from './components/Reader';
import PdfViewer from './components/PdfViewer';
import ReadingTimer from './components/ReadingTimer';
import { getBook } from './utils/storage';
import { getStreakData } from './utils/streaks';
import Dashboard from './components/Dashboard';
import CommonplaceBook from './components/CommonplaceBook';
import KnowledgeBase from './components/KnowledgeBase';
import BookCover from './components/BookCover';
import WelcomeOnboarding from './components/WelcomeOnboarding';

const NAV = [
  { id: 'library',     label: 'Library',      Icon: Library    },
  { id: 'discover',    label: 'Discover',     Icon: Compass    },
  { id: 'insights',    label: 'Insights',     Icon: BarChart2  },
  { id: 'commonplace', label: 'Commonplace',  Icon: BookMarked },
  { id: 'ask',         label: 'Ask',          Icon: Sparkles   },
];
const MOBILE_NAV = ['library', 'discover', 'insights', 'ask'];

function LogoMark({ size = 34 }) {
  const uid = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none"
      xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, display: 'block', borderRadius: '24%', boxShadow: 'var(--shadow-sm)' }}>
      <defs>
        <linearGradient id={'atg' + uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#22200f" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity=".28" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="24" fill="#1a1610" />
      <rect width="100" height="100" rx="24" fill={`url(#atg${uid})`} />
      <path d="M43 27 L48.5 27 L34 75 L17 75 Z" fill="#efe7d4" />
      <path d="M51.5 27 L57 27 L83 75 L67 75 Z" fill="#efe7d4" opacity=".62" />
      <rect x="39.5" y="53" width="21" height="7" rx="2" fill="#efe7d4" />
    </svg>
  );
}

function Logo({ size = 34 }) {
  return (
    <div className="ath-logo">
      <span className="ath-logo-mark"><LogoMark size={size} /></span>
      <span className="ath-logo-word">ATHENEUM</span>
    </div>
  );
}

function App() {
  const [view, setView]               = useState('library');
  const [currentBook, setCurrentBook] = useState(null);
  const [isLoading, setIsLoading]     = useState(false);
  const [streak, setStreak]           = useState(0);
  const [theme, setTheme]             = useState(() => {
    try { return JSON.parse(localStorage.getItem('reader_appearance') || '{}').theme || 'light'; }
    catch { return 'light'; }
  });
  const [lastBook, setLastBook] = useState(null);
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('ath_seen_v1'));

  // propagate theme to document root for CSS variable cascade
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    setStreak(getStreakData().currentStreak);
  }, []);

  const handleOpenBook = async (book) => {
    setIsLoading(true);
    try {
      const freshBook = await getBook(book.id);
      const bookToOpen = freshBook || book;
      if (bookToOpen.fileData?.buffer) {
        bookToOpen.file = new File(
          [bookToOpen.fileData.buffer],
          bookToOpen.fileData.name || (bookToOpen.title + (bookToOpen.format === 'pdf' ? '.pdf' : '.epub')),
          { type: bookToOpen.fileData.type },
        );
      }
      setCurrentBook(bookToOpen);
      setLastBook(bookToOpen);
    } catch (err) {
      console.error('Failed to refresh book data:', err);
      setCurrentBook(book);
      setLastBook(book);
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeChange = (t) => {
    setTheme(t);
    try {
      const prev = JSON.parse(localStorage.getItem('reader_appearance') || '{}');
      localStorage.setItem('reader_appearance', JSON.stringify({ ...prev, theme: t }));
    } catch {}
  };

  const renderScreen = () => {
    switch (view) {
      case 'insights':    return <Dashboard onBack={() => setView('library')} />;
      case 'commonplace': return <CommonplaceBook onBack={() => setView('library')} />;
      case 'ask':         return <KnowledgeBase onBack={() => setView('library')} />;
      default: return (
        <LibraryScreen
          onOpenBook={handleOpenBook}
          onOpenDashboard={() => setView('insights')}
          onOpenCommonplace={() => setView('commonplace')}
          onOpenKnowledgeBase={() => setView('ask')}
          showDiscoverOnMount={view === 'discover'}
          onDiscoverClose={() => setView('library')}
        />
      );
    }
  };

  const inReader = !!currentBook;

  return (
    <div className="ath-app" data-theme={theme}>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="ath-sidebar">
        <div className="ath-sidebar-top"><Logo /></div>
        <nav className="ath-nav">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={'ath-navitem ' + (view === id && !inReader ? 'is-on' : '')}
              onClick={() => { setView(id === 'discover' ? 'library' : id); if (id === 'discover') setView('discover'); }}
            >
              <Icon size={19} strokeWidth={view === id && !inReader ? 2.1 : 1.75} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        {lastBook && (
          <div className="ath-sidebar-foot">
            <button className="ath-mini" onClick={() => handleOpenBook(lastBook)}>
              <div className="ath-mini-cover"><BookCover book={lastBook} /></div>
              <div className="ath-mini-body">
                <div className="label-cat" style={{ color: 'var(--accent-ink)' }}>Continue</div>
                <div className="ath-mini-title serif">{lastBook.title}</div>
              </div>
            </button>
          </div>
        )}
      </aside>

      {/* ── MOBILE TOP BAR ── */}
      <header className="ath-topbar">
        <Logo size={26} />
        <button className="ath-topbar-streak" onClick={() => setView('insights')}>
          <Flame size={15} strokeWidth={2} style={{ color: 'var(--accent)' }} />
          <span className="mono">{streak}</span>
        </button>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="ath-main">
        {isLoading ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--line)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : renderScreen()}
      </main>

      {/* ── MOBILE TAB BAR ── */}
      <nav className="ath-tabbar">
        {MOBILE_NAV.map((id) => {
          const n = NAV.find((x) => x.id === id);
          const active = view === id && !inReader;
          return (
            <button key={id} className={'ath-tab ' + (active ? 'is-on' : '')} onClick={() => setView(id)}>
              <n.Icon size={21} strokeWidth={active ? 2.1 : 1.75} />
              <span>{n.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── READER OVERLAY ── */}
      {currentBook && (
        currentBook.type === 'physical' ? (
          <ReadingTimer book={currentBook} onBack={() => setCurrentBook(null)} />
        ) : currentBook.format === 'pdf' ? (
          <PdfViewer book={currentBook} onBack={() => setCurrentBook(null)} />
        ) : (
          <Reader
            book={currentBook}
            onBack={() => setCurrentBook(null)}
            appTheme={theme}
            onThemeChange={handleThemeChange}
          />
        )
      )}

      {showWelcome && (
        <WelcomeOnboarding onComplete={() => { localStorage.setItem('ath_seen_v1', '1'); setShowWelcome(false); }} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default App;
