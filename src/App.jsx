import React, { useState } from 'react';
import Library from './components/Library';
import Reader from './components/Reader';
import PdfViewer from './components/PdfViewer';
import ReadingTimer from './components/ReadingTimer';
import Dashboard from './components/Dashboard';

function App() {
  const [currentBook, setCurrentBook] = useState(null);
  const [showDashboard, setShowDashboard] = useState(false);

  const isFullScreen = (currentBook !== null) && !showDashboard;

  return (
    <div
      className="h-[100dvh] overflow-hidden flex flex-col w-full bg-gray-50 dark:bg-gray-900 transition-colors"
      style={isFullScreen ? {} : {
        paddingTop: 'var(--safe-pt)',
        paddingBottom: 'var(--safe-pb)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {showDashboard ? (
        <Dashboard onBack={() => setShowDashboard(false)} />
      ) : currentBook ? (
        currentBook.type === 'physical' ? (
          <ReadingTimer
            book={currentBook}
            onBack={() => setCurrentBook(null)}
          />
        ) : currentBook.format === 'pdf' ? (
          <PdfViewer
            book={currentBook}
            onBack={() => setCurrentBook(null)}
          />
        ) : (
          <Reader
            book={currentBook}
            onBack={() => setCurrentBook(null)}
          />
        )
      ) : (
        <Library
          onOpenBook={(book) => setCurrentBook(book)}
          onOpenDashboard={() => setShowDashboard(true)}
        />
      )}
    </div>
  );
}

export default App;
