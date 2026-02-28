import React, { useState, useEffect } from 'react';
import ePub from 'epubjs';
import { saveBook, getBooks, deleteBook } from '../utils/storage';
import { getStreakData } from '../utils/streaks';
import { Book, Plus, Trash2, Camera, Flame, BarChart2 } from 'lucide-react';
import AddPhysicalBook from './AddPhysicalBook';

const Library = ({ onOpenBook, onOpenDashboard }) => {
    const [books, setBooks] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [showAddPhysical, setShowAddPhysical] = useState(false);
    const [streakData, setStreakData] = useState({ currentStreak: 0, maxStreak: 0, readToday: false });

    useEffect(() => {
        loadBooks();
        setStreakData(getStreakData());
    }, []);

    const loadBooks = async () => {
        const storedBooks = await getBooks();
        setBooks(storedBooks.sort((a, b) => b.lastRead - a.lastRead));
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            let title = file.name.replace(/\.(epub|pdf)$/i, '');
            let author = 'Unknown Author';
            let coverBlob = null;
            let type = file.name.endsWith('.pdf') ? 'pdf' : 'epub';

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
                            const response = await fetch(coverUrl);
                            coverBlob = await response.blob();
                        }
                    } catch (err) {
                        console.warn('Could not extract cover', err);
                    }
                } catch (err) {
                    console.warn('Failed to parse EPUB metadata:', err);
                }
            }

            const newBook = {
                id: Date.now().toString(),
                title: title,
                author: author,
                file: file,
                cover: coverBlob,
                cfi: null,
                lastRead: Date.now(),
                format: type,
            };

            await saveBook(newBook);
            await loadBooks();
        } catch (error) {
            console.error('Error adding book:', error);
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
        await loadBooks();
    };

    return (
        <>
            {/* Header — sits outside the scroll container so it can never be scrolled past */}
            <header className="flex-shrink-0 flex flex-col sm:flex-row sm:justify-between sm:items-center px-4 md:px-10 pt-4 pb-4 gap-4 flex-wrap bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 z-20">
                <div className="flex items-center gap-3 sm:gap-4">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">My Library</h1>
                    <button
                        onClick={onOpenDashboard}
                        className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-950/30 rounded-full border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors cursor-pointer group"
                        title={`Max Streak: ${streakData.maxStreak} days. Click to view full Dashboard.`}
                    >
                        <Flame
                            size={20}
                            className={`${streakData.readToday ? 'text-orange-500 fill-orange-500' : 'text-gray-400'} group-hover:scale-110 transition-transform`}
                        />
                        <span className="font-bold text-sm text-gray-700 dark:text-gray-300">
                            {streakData.currentStreak} Day Streak
                        </span>
                        <BarChart2 size={16} className="text-gray-400 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                </div>

                <div className="flex items-center gap-3 sm:ml-auto">
                    <button
                        onClick={() => setShowAddPhysical(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                        <Camera size={20} />
                        <span className="hidden sm:inline">Add Physical</span>
                    </button>
                    <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors shadow-sm">
                        <Plus size={20} />
                        <span className="hidden sm:inline">Upload Book</span>
                        <input
                            type="file"
                            accept=".epub,.pdf"
                            onChange={handleFileUpload}
                            className="hidden"
                            disabled={isUploading}
                        />
                    </label>
                </div>
            </header>

            {/* Scrollable content — completely below the header, books can never escape upward */}
            <div className="flex-1 overflow-y-auto px-4 md:px-10 py-6">
                {isUploading && (
                    <div className="text-center py-4 flex items-center justify-center gap-3 text-sm text-gray-500 mb-4">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span>Processing book, please wait...</span>
                    </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {books.map((book) => (
                        <div
                            key={book.id}
                            className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden border border-gray-100 dark:border-gray-700"
                            onClick={() => onOpenBook(book)}
                        >
                            <div className="aspect-[2/3] bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                                {book.cover ? (
                                    <img
                                        src={URL.createObjectURL(book.cover)}
                                        alt={book.title}
                                        className="w-full h-full object-cover"
                                        onLoad={(e) => URL.revokeObjectURL(e.target.src)}
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                                        <Book size={48} className="mb-2" />
                                        <span className="text-xs">{book.title}</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                <button
                                    onClick={(e) => handleDelete(e, book.id)}
                                    className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 shadow-md"
                                    title="Remove book"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            <div className="p-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white truncate" title={book.title}>
                                    {book.title}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                    {book.author}
                                </p>
                                {book.cfi && (
                                    <div className="mt-2 text-xs text-blue-600 font-medium">
                                        In Progress
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {books.length === 0 && !isUploading && (
                        <div className="col-span-full text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                            <Book size={48} className="mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-500">No books yet. Add a physical book or upload an EPUB to get started!</p>
                        </div>
                    )}
                </div>

                {showAddPhysical && (
                    <AddPhysicalBook
                        onClose={() => setShowAddPhysical(false)}
                        onBookAdded={() => {
                            setShowAddPhysical(false);
                            loadBooks();
                        }}
                    />
                )}
            </div>
        </>
    );
};

export default Library;
