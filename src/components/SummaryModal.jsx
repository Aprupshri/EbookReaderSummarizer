import React from 'react';
import { X, Sparkles, ShieldCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const SummaryModal = ({ isOpen, onClose, summary, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="ath-overlay" onClick={onClose}>
      <div className="ath-modal ath-modal--bottom ath-aimodal" onClick={e => e.stopPropagation()}>
        <div className="ath-grabber ath-grabber--mobile" />
        <div className="ath-aisheet">
          <header className="ath-aisheet-head">
            <span className="ath-aisheet-icon ath-aisheet-icon--summary">
              <Sparkles size={18} strokeWidth={2} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="ath-aisheet-title serif">The story so far</div>
              <div className="label-cat">Spoiler-free summary</div>
            </div>
            <button className="ath-iconbtn" onClick={onClose} aria-label="Close"><X size={18} /></button>
          </header>
          <div className="rule" />
          <div className="ath-aisheet-body scroll-area">
            {isLoading ? (
              <div className="ath-ai-loading">
                <div className="ath-ai-spark"><Sparkles size={15} strokeWidth={2} /></div>
                <span className="label-cat">Reading your place…</span>
                <div className="skeleton ath-skel" style={{ width: '92%' }} />
                <div className="skeleton ath-skel" style={{ width: '100%' }} />
                <div className="skeleton ath-skel" style={{ width: '84%' }} />
                <div className="skeleton ath-skel" style={{ width: '96%' }} />
              </div>
            ) : (
              <div className="anim-fade-up">
                <div className="serif" style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--ink)' }}>
                  <ReactMarkdown>{summary}</ReactMarkdown>
                </div>
                <div className="ath-ai-note label-cat">
                  <ShieldCheck size={13} strokeWidth={2} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 5 }} />
                  No spoilers beyond your current page
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryModal;
