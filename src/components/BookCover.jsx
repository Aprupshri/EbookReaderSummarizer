import React, { useMemo } from 'react';

// Deterministic cloth colour from a seed string (book id / title)
const CLOTH_PALETTES = [
  { base: '#2d3561', deep: '#1a1f3d', foil: '#e8d5b7' }, // indigo
  { base: '#6b1a2b', deep: '#4a0f1d', foil: '#f5e6c8' }, // oxblood
  { base: '#1e3d2f', deep: '#0f2218', foil: '#e5d4a8' }, // forest
  { base: '#7a5c1e', deep: '#4d3a11', foil: '#f0e4c6' }, // ochre
  { base: '#1a4a4a', deep: '#0d2929', foil: '#e0d5b0' }, // teal
  { base: '#3a2d56', deep: '#221a3d', foil: '#ead8c4' }, // plum
  { base: '#3d2a1e', deep: '#251810', foil: '#e8d9c0' }, // umber
  { base: '#2a3d3a', deep: '#1a2826', foil: '#e0d8c0' }, // sage
];

function seedHash(str) {
  let h = 5381;
  for (let i = 0; i < (str || '').length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  return h;
}

function BookCover({ book, className, style }) {
  const coverUrl = useMemo(() => {
    if (!book?.cover) return null;
    try {
      const cover = book.cover;
      if (cover instanceof Blob) return URL.createObjectURL(cover);
      if (cover?.buffer) return URL.createObjectURL(new Blob([cover.buffer], { type: cover.type || 'image/jpeg' }));
    } catch {
      return null;
    }
    return null;
  }, [book?.cover]);

  // Revoke the object URL when the component unmounts or url changes
  React.useEffect(() => {
    return () => { if (coverUrl) URL.revokeObjectURL(coverUrl); };
  }, [coverUrl]);

  const palette = CLOTH_PALETTES[seedHash(book?.id || book?.title || '') % CLOTH_PALETTES.length];
  const { base, deep, foil } = palette;
  const initials = (book?.title || '?')[0].toUpperCase();

  if (coverUrl) {
    return (
      <div className={'ath-cover ' + (className || '')} style={style}>
        <img src={coverUrl} alt={book?.title} className="w-full h-full object-cover" />
      </div>
    );
  }

  // Cloth fallback
  return (
    <div
      className={'ath-cover ath-cover--cloth ' + (className || '')}
      style={{ background: `linear-gradient(155deg, ${base}, ${deep})`, ...style }}
    >
      <div className="ath-cover-spine" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,.32), rgba(0,0,0,0) 14%, rgba(255,255,255,.06) 50%, rgba(0,0,0,.12))' }} />
      <div className="ath-cover-frame" style={{ borderColor: foil + '55' }}>
        <div className="ath-cover-cloth-top">
          <div className="ath-cover-mark serif" style={{ color: foil }}>{initials}</div>
        </div>
        <div className="ath-cover-title serif" style={{ color: foil }}>{book?.title}</div>
        <div className="ath-cover-rule" style={{ background: foil + '99' }} />
        <div className="ath-cover-author" style={{ color: foil + 'cc' }}>{book?.author}</div>
      </div>
    </div>
  );
}

export default BookCover;
