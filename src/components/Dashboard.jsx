import React, { useState, useEffect } from 'react';
import { getBooks } from '../utils/storage';
import { getStreakData } from '../utils/streaks';
import { Flame, Clock, Library } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function Ring({ value, size = 96, stroke = 9, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(1, Math.max(0, value)));
  return (
    <div className="ath-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.7,.2,1)' }}
        />
      </svg>
      <div className="ath-ring-center">{children}</div>
    </div>
  );
}

function buildWeekData(books) {
  const now = Date.now();
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * 86400000);
    return { label: DAYS[d.getDay()], min: 0, date: d.toDateString() };
  });
  books.forEach(book => {
    (book.sessions || []).forEach(s => {
      const ds = new Date(s.date || s.timestamp || 0).toDateString();
      const slot = week.find(w => w.date === ds);
      if (slot) slot.min += Math.round((s.durationMs || 0) / 60000);
    });
  });
  return week;
}

const Dashboard = ({ onBack }) => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      const books = await getBooks();
      const streakData = getStreakData();
      let totalDurationMs = 0;
      books.forEach(b => {
        (b.sessions || []).forEach(s => { totalDurationMs += (s.durationMs || 0); });
      });
      const totalHours = Math.floor(totalDurationMs / 3600000);
      const totalMins  = Math.floor((totalDurationMs % 3600000) / 60000);
      const reading    = books.filter(b => b.progress > 0 && b.progress < 1).length;
      const finished   = books.filter(b => b.progress >= 1).length;
      const weekData   = buildWeekData(books);
      const todayMin   = weekData[6].min;
      const goal       = 30;
      const weekTotal  = weekData.reduce((a, w) => a + w.min, 0);
      setStats({ streakData, totalHours, totalMins, totalBooks: books.length, reading, finished, weekData, todayMin, goal, weekTotal });
    })();
  }, []);

  if (!stats) {
    return (
      <div className="ath-screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--line)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const { streakData, totalHours, totalMins, totalBooks, reading, finished, weekData, todayMin, goal, weekTotal } = stats;
  const maxMin = Math.max(...weekData.map(d => d.min), goal, 1);

  return (
    <div className="ath-screen scroll-area">
      <div className="ath-screen-inner">
        <header className="ath-pagehead">
          <div>
            <div className="label-cat">Your reading life</div>
            <h1 className="ath-pagetitle serif">Insights</h1>
          </div>
        </header>

        <div className="ath-stat-grid">
          {/* Streak hero */}
          <div className="ath-stat ath-stat--hero anim-fade-up">
            <div className="ath-stat-hero-glow" />
            <div className="ath-stat-icon ath-stat-icon--flame"><Flame size={20} strokeWidth={2} /></div>
            <div className="ath-stat-num serif">{streakData.currentStreak}<span className="ath-stat-num-unit">days</span></div>
            <div className="ath-stat-label">Current reading streak</div>
            <div className="label-cat" style={{ marginTop: 12 }}>Best · {streakData.maxStreak} days</div>
          </div>

          {/* Today vs goal ring */}
          <div className="ath-stat anim-fade-up" style={{ animationDelay: '60ms' }}>
            <div className="ath-stat-ringwrap">
              <Ring value={todayMin / goal} size={88}>
                <div className="ath-ring-num serif">{todayMin}</div>
                <div className="label-cat">min</div>
              </Ring>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="ath-stat-label" style={{ marginBottom: 6 }}>Today's reading</div>
                <div className="label-cat" style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--ink-soft)' }}>
                  {Math.min(100, Math.round((todayMin / goal) * 100))}% of your {goal}-min goal
                </div>
              </div>
            </div>
          </div>

          {/* Total time */}
          <div className="ath-stat anim-fade-up" style={{ animationDelay: '120ms' }}>
            <div className="ath-stat-icon ath-stat-icon--accent"><Clock size={20} strokeWidth={2} /></div>
            <div className="ath-stat-num serif">
              {totalHours > 0
                ? <>{totalHours}<span className="ath-stat-num-unit">h</span></>
                : <>{totalMins}<span className="ath-stat-num-unit">m</span></>}
            </div>
            <div className="ath-stat-label">Total time read</div>
            {totalHours > 0 && <div className="label-cat" style={{ marginTop: 10 }}>{totalMins} min extra</div>}
          </div>

          {/* Library stats */}
          <div className="ath-stat anim-fade-up" style={{ animationDelay: '180ms' }}>
            <div className="ath-stat-icon ath-stat-icon--accent"><Library size={20} strokeWidth={2} /></div>
            <div className="ath-stat-num serif">{totalBooks}</div>
            <div className="ath-stat-label">Books in library</div>
            <div className="label-cat" style={{ marginTop: 10 }}>{reading} reading · {finished} finished</div>
          </div>
        </div>

        {/* Weekly chart */}
        <div className="ath-panel">
          <div className="ath-panel-head">
            <div>
              <div className="label-cat">Last 7 days</div>
              <h3 className="ath-panel-title serif">Reading time</h3>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="serif" style={{ fontSize: '1.5rem', fontWeight: 500, lineHeight: 1 }}>{weekTotal}</div>
              <div className="label-cat">min this week</div>
            </div>
          </div>
          <div className="ath-chart">
            <div className="ath-chart-goal" style={{ bottom: `${(goal / maxMin) * 100}%` }}>
              <span className="label-cat">goal</span>
            </div>
            {weekData.map((d, i) => (
              <div key={i} className="ath-chart-col">
                <div className="ath-chart-bar-wrap">
                  <div
                    className={'ath-chart-bar' + (d.min === 0 ? ' is-empty' : '')}
                    style={{ height: `${d.min === 0 ? 0 : Math.max(4, (d.min / maxMin) * 100)}%` }}
                    title={`${d.min} min`}
                  />
                </div>
                <span className="label-cat ath-chart-day">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
