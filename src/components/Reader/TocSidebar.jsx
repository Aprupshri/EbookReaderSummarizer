import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getHighlights } from '../../utils/storage';

const TocSidebar = ({ showToc, setShowToc, theme, toc, onNavigate, bookTitle, bookId, location, viewerRef }) => {
    const [activeTab, setActiveTab] = useState('Chapters');
    const [bookmarks, setBookmarks] = useState([]);

    useEffect(() => {
        if (showToc && bookId) {
            getHighlights(bookId).then(h => {
                setBookmarks(h.filter(x => !x.note).sort((a, b) => b.timestamp - a.timestamp));
            });
        }
    }, [showToc, bookId]);

    if (!showToc) return null;

    const isCurrentItem = (item) =>
        location?.start?.tocItem?.href === item.href || location?.start?.tocItem?.label === item.label;

    const TABS = ['Chapters', 'Bookmarks'];

    const renderTocItem = (item, depth = 0) => {
        const isCurrent = isCurrentItem(item);
        return (
            <React.Fragment key={item.href || item.label}>
                <li>
                    <button
                        onClick={() => {
                            if (item.href) { onNavigate(item.href); setShowToc(false); }
                        }}
                        className={`ath-toc-item${isCurrent ? ' is-current' : ''}`}
                        style={depth > 0 ? { paddingLeft: `${12 + depth * 16}px`, opacity: .8 } : undefined}
                    >
                        <span className="ath-toc-n">{isCurrent ? '▸' : ''}</span>
                        <span className="ath-toc-label">{item.label}</span>
                    </button>
                </li>
                {item.subitems?.length > 0 && item.subitems.map(sub => renderTocItem(sub, depth + 1))}
            </React.Fragment>
        );
    };

    return (
        <div className="ath-toc-overlay" onClick={() => setShowToc(false)}>
            <div className="ath-toc" onClick={e => e.stopPropagation()}>
                <div className="ath-toc-head">
                    <div>
                        <div className="label-cat">Contents</div>
                        <div className="ath-toc-book serif">{bookTitle}</div>
                    </div>
                    <button className="ath-iconbtn" onClick={() => setShowToc(false)} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
                    {TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={activeTab === tab ? 'ath-toc-tab is-on' : 'ath-toc-tab'}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <ul className="ath-toc-list scroll-area">
                    {activeTab === 'Chapters' && (
                        toc.length > 0 ? toc.map(item => renderTocItem(item, 0)) : (
                            <li style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-faint)', fontStyle: 'italic', fontSize: 14 }}>
                                No chapters found.
                            </li>
                        )
                    )}

                    {activeTab === 'Bookmarks' && (
                        bookmarks.length > 0 ? bookmarks.map((b, i) => (
                            <li key={i}>
                                <button
                                    className="ath-toc-item"
                                    onClick={() => {
                                        viewerRef?.current?.goTo(b.cfiRange);
                                        setShowToc(false);
                                    }}
                                >
                                    <span className="ath-toc-n" style={{ fontSize: 10 }}>§</span>
                                    <span className="ath-toc-label serif" style={{ fontStyle: 'italic', fontSize: 13 }}>
                                        "{b.text}"
                                    </span>
                                </button>
                            </li>
                        )) : (
                            <li style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-faint)', fontStyle: 'italic', fontSize: 14 }}>
                                No bookmarks yet.
                            </li>
                        )
                    )}
                </ul>
            </div>
        </div>
    );
};

export default TocSidebar;
