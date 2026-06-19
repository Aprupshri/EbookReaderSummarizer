import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Menu, ChevronLeft, ChevronRight } from 'lucide-react';

const ReaderFooter = ({
    showControls,
    isFocusMode,
    theme,
    location,
    toc,
    onMenuClick,
    onNavigate,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragPercent, setDragPercent] = useState(0);
    const lastHref = useRef(null);
    const trackRef = useRef(null);

    const actualPercent = location ? Math.round((location.start.percentage || 0) * 100) : 0;
    const displayPercent = isDragging ? Math.round(dragPercent) : actualPercent;

    useEffect(() => {
        if (!isDragging) setDragPercent(actualPercent);
    }, [actualPercent, isDragging]);

    const navigateToPercent = useCallback((pct) => {
        if (!onNavigate) return;
        const fraction = Math.max(0, Math.min(1, pct / 100));
        const rounded = Math.round(fraction * 1000) / 1000;
        if (lastHref.current !== rounded) {
            lastHref.current = rounded;
            onNavigate({ fraction: rounded });
        }
    }, [onNavigate]);

    const percentFromPointer = (e) => {
        const track = trackRef.current;
        if (!track) return dragPercent;
        const rect = track.getBoundingClientRect();
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        return Math.max(0, Math.min(100, (x / rect.width) * 100));
    };

    const handlePointerDown = (e) => {
        e.preventDefault();
        setIsDragging(true);
        setDragPercent(percentFromPointer(e));
    };

    const handlePointerMove = (e) => {
        if (!isDragging) return;
        setDragPercent(percentFromPointer(e));
    };

    const handlePointerUp = (e) => {
        if (!isDragging) return;
        const pct = percentFromPointer(e);
        setDragPercent(pct);
        setIsDragging(false);
        navigateToPercent(pct);
    };

    return (
        <div className={`ath-rfooter${showControls && !isFocusMode ? '' : ' is-hidden'}`}>
            {location ? (
                <>
                    <div className="ath-rfooter-chap">
                        {location.start.tocItem?.label || ''}
                    </div>

                    <div className="ath-rfooter-row">
                        <button
                            onClick={onMenuClick}
                            className="ath-iconbtn"
                            style={{ flexShrink: 0 }}
                            aria-label="Table of Contents"
                        >
                            <Menu size={20} />
                        </button>

                        <button
                            onClick={() => onNavigate?.('prev')}
                            className="ath-iconbtn"
                            style={{ flexShrink: 0 }}
                            title="Previous Chapter"
                        >
                            <ChevronLeft size={20} />
                        </button>

                        <div
                            ref={trackRef}
                            className="ath-rslider"
                            onPointerDown={handlePointerDown}
                            onPointerMove={isDragging ? handlePointerMove : undefined}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={isDragging ? handlePointerUp : undefined}
                            style={{ touchAction: 'none' }}
                        >
                            <div
                                className="ath-rslider-fill"
                                style={{ width: `${displayPercent}%` }}
                            />
                            <div
                                className="ath-rslider-knob"
                                style={{ left: `${displayPercent}%` }}
                            />
                        </div>

                        <button
                            onClick={() => onNavigate?.('next')}
                            className="ath-iconbtn"
                            style={{ flexShrink: 0 }}
                            title="Next Chapter"
                        >
                            <ChevronRight size={20} />
                        </button>

                        <div className="ath-rfooter-pg mono">{displayPercent}%</div>
                    </div>
                </>
            ) : (
                <div className="ath-rfooter-chap">Loading…</div>
            )}
        </div>
    );
};

export default ReaderFooter;
