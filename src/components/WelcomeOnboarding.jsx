import React from 'react';
import { BookOpen, Sparkles, BookMarked, ArrowRight } from 'lucide-react';

const SPINE_COLORS = [
  { base: '#6b1a2b', deep: '#4a0f1d', foil: '#f5e6c8' },
  { base: '#2f3a6b', deep: '#212a52', foil: '#cdb88a' },
  { base: '#1e3d2f', deep: '#0f2218', foil: '#e5d4a8' },
  { base: '#7a5c1e', deep: '#4d3a11', foil: '#f0e4c6' },
  { base: '#1a4a4a', deep: '#0d2929', foil: '#e0d5b0' },
];

const FEATURES = [
  { icon: BookOpen,   text: 'Distraction-free reader' },
  { icon: Sparkles,  text: 'Spoiler-safe AI summaries' },
  { icon: BookMarked, text: 'A commonplace book' },
];

const WelcomeOnboarding = ({ onComplete }) => (
  <div className="ath-welcome">
    <div className="ath-welcome-card anim-scale-in">
      <div className="ath-welcome-spines">
        {SPINE_COLORS.map((c, i) => (
          <span
            key={i}
            className="ath-welcome-spine"
            style={{ background: `linear-gradient(160deg, ${c.base}, ${c.deep})`, color: c.foil }}
          >
            <i className="serif">A</i>
          </span>
        ))}
      </div>

      <div className="ath-logo" style={{ justifyContent: 'center', marginBottom: 18 }}>
        <span className="ath-logo-word" style={{ fontSize: 15, letterSpacing: '0.18em' }}>ATHENEUM</span>
      </div>

      <h1 className="ath-welcome-title serif">Your private athenaeum.</h1>
      <p className="ath-welcome-sub">
        Read, recall, and reflect — with a librarian that knows every page you've turned.
        Beautiful covers, distraction-free reading, and AI that respects where you are in the story.
      </p>

      <div className="ath-welcome-feats">
        {FEATURES.map(({ icon: Icon, text }) => (
          <div key={text} className="ath-welcome-feat">
            <span><Icon size={16} strokeWidth={2} /></span>
            {text}
          </div>
        ))}
      </div>

      <button
        className="ath-btn ath-btn--primary ath-btn--lg"
        onClick={onComplete}
        style={{ width: '100%', justifyContent: 'center' }}
      >
        <span>Enter the library</span>
        <ArrowRight size={17} strokeWidth={2} />
      </button>
    </div>
  </div>
);

export default WelcomeOnboarding;
