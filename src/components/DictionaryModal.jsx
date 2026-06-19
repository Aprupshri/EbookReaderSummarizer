import React, { useState, useEffect } from 'react';
import { X, BookOpen, Volume2 } from 'lucide-react';

const DictionaryModal = ({ isOpen, onClose, word }) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isOpen || !word) return;
        setLoading(true);
        setError(null);
        setData(null);
        (async () => {
            try {
                const cleanWord = word.trim().replace(/[.,!?;:"'()]/g, '');
                if (!cleanWord) throw new Error('Please select a valid word.');
                const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`);
                if (!res.ok) throw new Error('Word not found in dictionary.');
                const json = await res.json();
                setData(json[0]);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        })();
    }, [isOpen, word]);

    const playAudio = (phonetics) => {
        const obj = phonetics.find(p => p.audio);
        if (obj?.audio) new Audio(obj.audio).play();
    };

    if (!isOpen) return null;

    return (
        <div className="ath-overlay" style={{ zIndex: 120 }} onClick={onClose}>
            <div
                className="ath-modal ath-modal--bottom"
                style={{ maxWidth: 480 }}
                onClick={e => e.stopPropagation()}
            >
                <div className="ath-grabber" />
                <div className="ath-modal-head">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BookOpen size={16} style={{ color: 'var(--accent)' }} />
                        <h2 className="serif">Dictionary</h2>
                    </div>
                    <button className="ath-iconbtn" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="ath-modal-body">
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[40, 25, 100, 85].map((w, i) => (
                                <div key={i} style={{ height: i < 2 ? 20 : 14, borderRadius: 7, background: 'var(--line)', width: `${w}%` }} />
                            ))}
                        </div>
                    ) : error ? (
                        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--ink-faint)', fontSize: 14 }}>{error}</div>
                    ) : data ? (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                <h1 className="serif" style={{ fontSize: '1.6rem', fontWeight: 500, color: 'var(--ink)', textTransform: 'capitalize' }}>
                                    {data.word}
                                </h1>
                                {data.phonetics?.some(p => p.audio) && (
                                    <button
                                        onClick={() => playAudio(data.phonetics)}
                                        className="ath-iconbtn"
                                        title="Listen to pronunciation"
                                    >
                                        <Volume2 size={16} />
                                    </button>
                                )}
                            </div>
                            {data.phonetic && (
                                <p className="mono" style={{ fontSize: 13, color: 'var(--ink-faint)', marginBottom: 16 }}>{data.phonetic}</p>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {data.meanings.slice(0, 3).map((meaning, idx) => (
                                    <div key={idx}>
                                        <span className="label-cat" style={{ display: 'inline-block', marginBottom: 8, background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 4, fontStyle: 'italic' }}>
                                            {meaning.partOfSpeech}
                                        </span>
                                        <ol style={{ paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {meaning.definitions.slice(0, 3).map((def, defIdx) => (
                                                <li key={defIdx} style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.55 }}>
                                                    {def.definition}
                                                    {def.example && (
                                                        <p className="serif" style={{ fontSize: 13, color: 'var(--ink-faint)', fontStyle: 'italic', marginTop: 4 }}>
                                                            "{def.example}"
                                                        </p>
                                                    )}
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default DictionaryModal;
