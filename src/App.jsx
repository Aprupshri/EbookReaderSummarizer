import React, { useState } from 'react';
import Library from './components/Library';
import Reader from './components/Reader';
import ReadingTimer from './components/ReadingTimer';
import Dashboard from './components/Dashboard';

function App() {
  const [currentBook, setCurrentBook] = useState(null);
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-900 transition-colors">
      {showDashboard ? (
        <Dashboard onBack={() => setShowDashboard(false)} />
      ) : currentBook ? (
        currentBook.type === 'physical' ? (
          <ReadingTimer
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
