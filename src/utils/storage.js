import { openDB } from 'idb';
import { recordReadingDay } from './streaks';

const DB_NAME = 'book-reader-db';
const STORE_NAME = 'books';

export const initDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
};

export const saveBook = async (book) => {
  const db = await initDB();
  return db.put(STORE_NAME, book);
};

export const getBooks = async () => {
  const db = await initDB();
  return db.getAll(STORE_NAME);
};

export const getBook = async (id) => {
  const db = await initDB();
  return db.get(STORE_NAME, id);
};

export const updateProgress = async (id, cfi) => {
  const db = await initDB();
  const book = await db.get(STORE_NAME, id);
  if (book) {
    book.cfi = cfi;
    book.lastRead = Date.now();
    await db.put(STORE_NAME, book);
    recordReadingDay(); // <---- Record Streak
  }
};

export const updatePhysicalProgress = async (id, pagesRead, sessionDurationMs, newCurrentPage) => {
  const db = await initDB();
  const book = await db.get(STORE_NAME, id);
  if (book && book.type === 'physical') {
    book.currentPage = newCurrentPage;
    book.lastRead = Date.now();
    
    if (!book.sessions) book.sessions = [];
    book.sessions.push({
      date: Date.now(),
      pagesRead: pagesRead,
      durationMs: sessionDurationMs
    });
    
    await db.put(STORE_NAME, book);
    recordReadingDay(); 
  }
};

export const saveEbookSession = async (id, pagesRead, sessionDurationMs, lastPage) => {
  const db = await initDB();
  const book = await db.get(STORE_NAME, id);
  if (book && book.type !== 'physical') {
    if (!book.sessions) book.sessions = [];
    book.sessions.push({
      date: Date.now(),
      pagesRead: pagesRead,
      durationMs: sessionDurationMs
    });
    
    if (lastPage) {
       book.currentPage = Math.max(book.currentPage || 0, lastPage);
    }
    
    await db.put(STORE_NAME, book);
    recordReadingDay();
  }
};

export const deleteBook = async (id) => {
  const db = await initDB();
  return db.delete(STORE_NAME, id);
};
