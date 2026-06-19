import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Settings } from 'lucide-react';
import { updateProgress } from '../utils/storage';
import SettingsModal from './SettingsModal';
import { StatusBar, Style } from '@capacitor/status-bar';

const PdfViewer = ({ book, onBack }) => {
    const [objectUrl, setObjectUrl] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [error, setError] = useState(null);
    const startTimeRef = useRef(Date.now());

    useEffect(() => {
        if (!book?.file) {
            setError('No file data found for this PDF.');
            return;
        }
        try {
            const blob = new Blob([book.file], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setObjectUrl(url);
            return () => URL.revokeObjectURL(url);
        } catch (err) {
            setError('Could not load PDF: ' + err.message);
        }
    }, [book?.id]);

    useEffect(() => {
        StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
        return () => { StatusBar.show().catch(() => {}); };
    }, []);

    const handleBack = async () => {
        try {
            const currentProgress = book.progress ?? 0;
            const bumped = Math.min(1, currentProgress + 0.01);
            await updateProgress(book.id, null, bumped, book.title ?? 'this book');
        } catch (_) {}
        onBack();
    };

    return (
        <div
            className="fixed inset-0 flex flex-col z-50"
            style={{ background: 'var(--surface)' }}
        >
            {/* Header */}
            <header
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 16px',
                    paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
                    paddingBottom: 12,
                    background: 'var(--surface)', borderBottom: '1px solid var(--line)',
                    flexShrink: 0,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={handleBack} className="ath-iconbtn">
                        <ArrowLeft size={20} />
                    </button>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                        {book.title}
                    </span>
                </div>
                <button onClick={() => setShowSettings(true)} className="ath-iconbtn">
                    <Settings size={20} />
                </button>
            </header>

            {/* PDF iframe */}
            {error ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
                    <p style={{ color: 'var(--ink-soft)', fontSize: 14, textAlign: 'center' }}>{error}</p>
                    <button onClick={onBack} className="ath-btn ath-btn--secondary ath-btn--md">Go Back</button>
                </div>
            ) : objectUrl ? (
                <iframe
                    src={objectUrl}
                    style={{ flex: 1, width: '100%', border: 0, background: '#525659' }}
                    title={book.title || 'PDF'}
                />
            ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-faint)', fontSize: 14 }}>
                    Loading PDF…
                </div>
            )}

            <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
        </div>
    );
};

export default PdfViewer;
