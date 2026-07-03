import React from 'react';

/**
 * Shared react-joyride theming for ProductTour and ReaderTour.
 *
 * Joyride portals its tooltip into document.body, and App.jsx sets
 * `data-theme` on <html>, so the CSS variables resolve correctly in all
 * three themes (light / sepia / dark).
 */
export const tourStyles = {
    options: {
        zIndex: 10000,
        primaryColor: 'var(--accent)',
        arrowColor: 'var(--surface)',
        backgroundColor: 'var(--surface)',
        overlayColor: 'color-mix(in oklab, var(--ink) 45%, transparent)',
        textColor: 'var(--ink)',
        // The joyride default (380px) overflows small phones
        width: 'min(340px, calc(100vw - 32px))',
    },
    tooltip: {
        borderRadius: 'var(--r-lg)',
        border: '1px solid var(--line)',
        boxShadow: 'var(--shadow-lg)',
        padding: '18px 18px 10px',
        fontFamily: 'var(--font-sans)',
    },
    tooltipContainer: {
        textAlign: 'left',
    },
    tooltipContent: {
        padding: '0 0 10px',
    },
    tooltipFooter: {
        marginTop: 4,
    },
    buttonNext: {
        background: 'var(--accent)',
        color: 'var(--on-accent)',
        borderRadius: 8,
        padding: '8px 16px',
        fontWeight: 600,
        fontSize: 13,
        outline: 'none',
    },
    buttonBack: {
        color: 'var(--ink-soft)',
        marginRight: 10,
        fontSize: 13,
    },
    buttonSkip: {
        color: 'var(--ink-faint)',
        fontSize: 13,
    },
    buttonClose: {
        color: 'var(--ink-soft)',
    },
    spotlight: {
        borderRadius: 12,
    },
};

export const tourLocale = {
    back: 'Back',
    close: 'Close',
    last: 'Done',
    next: 'Next',
    skip: 'Skip tour',
};

/** Consistent step content: serif title + muted body, like the app's modals. */
export const TourCard = ({ title, children }) => (
    <div style={{ textAlign: 'left' }}>
        <h3 className="serif" style={{ fontWeight: 700, fontSize: 16, margin: '0 0 6px', color: 'var(--ink)' }}>
            {title}
        </h3>
        <p style={{ fontSize: 13, lineHeight: 1.55, margin: 0, color: 'var(--ink-soft)' }}>
            {children}
        </p>
    </div>
);
