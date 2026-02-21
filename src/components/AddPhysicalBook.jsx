import React, { useState } from 'react';
import { Book, Search, X, Camera } from 'lucide-react';
import { saveBook } from '../utils/storage';

const AddPhysicalBook = ({ onClose, onBookAdded }) => {
    const [isbn, setIsbn] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const searchBook = async (e) => {
        e.preventDefault();
        if (!isbn) return;

        setLoading(true);
        setError('');

        try {
            // Fetch book details from Google Books API for primary metadata
            const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
            const data = await response.json();

            if (data.items && data.items.length > 0) {
                const bookInfo = data.items[0].volumeInfo;

                // Fetch cover image as a blob to save locally
                let coverBlob = null;
                if (bookInfo.imageLinks?.thumbnail) {
                    try {
                        const imgRes = await fetch(bookInfo.imageLinks.thumbnail.replace('http:', 'https:'));
                        coverBlob = await imgRes.blob();
                    } catch (e) {
                        console.warn("Could not fetch cover blob");
                    }
                }

                const newBook = {
                    id: Date.now().toString(),
                    type: 'physical',
                    title: bookInfo.title || 'Unknown Title',
                    author: bookInfo.authors ? bookInfo.authors.join(', ') : 'Unknown Author',
                    totalPages: bookInfo.pageCount || 300, // Default to 300 if unknown
                    currentPage: 0,
                    cover: coverBlob,
                    sessions: [],
                    lastRead: Date.now(),
                };

                await saveBook(newBook);
                onBookAdded();
                onClose();
            } else {
                setError('Book not found. Please try another ISBN.');
            }
        } catch (err) {
            console.error(err);
            setError('Error fetching book details.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl flex flex-col m-2 sm:m-4 shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 sm:p-6 overflow-y-auto w-full">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Book size={24} className="text-blue-500" />
                            Add Physical Book
                        </h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={searchBook} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Scan or Enter ISBN
                            </label>
                            <div className="relative">
                                <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={isbn}
                                    onChange={(e) => setIsbn(e.target.value)}
                                    placeholder="e.g. 9780544003415"
                                    className="w-full pl-10 pr-12 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white outline-none transition-all"
                                />
                                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-600 transition-colors" title="Scan Barcode (Coming Soon)">
                                    <Camera size={20} />
                                </button>
                            </div>
                            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !isbn}
                            className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                "Search & Add Book"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddPhysicalBook;
