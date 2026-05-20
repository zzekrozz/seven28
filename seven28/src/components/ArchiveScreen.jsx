import React from 'react';
import CHAPTERS from '../data/chapters.js';

export default function ArchiveScreen({ origin, onPlay, onClearOrigin }) {
  const hasCanon = origin.chapter !== null;

  return (
    <div className="archive-screen">
      <div className="scanlines" />
      <div className="archive-content">
        <div className="emergency-bar">
          <span className="blink-dot" />
          <span>ARCHIVO · ANTOLOGÍA</span>
          <span className="blink-dot" />
        </div>

        <h1 className="big-title">7:28</h1>
        <p className="subtitle-small">UNA ANTOLOGÍA</p>

        {hasCanon ? (
          <div className="canon-card">
            <div className="canon-label">TU CANON</div>
            <div className="canon-title">{origin.originTitle}</div>
            <div className="canon-meta">
              <span className="canon-summary">{origin.canonSummary}.</span>
            </div>
            <button className="canon-clear" onClick={onClearOrigin}>
              Borrar canon y empezar limpio
            </button>
          </div>
        ) : (
          <p className="archive-intro">
            Siete minutos y veintiocho segundos antes del impacto.
            Lo que decidas, lo decides ahora.
          </p>
        )}

        <div className="chapters-list">
          {CHAPTERS.map((ch, i) => (
            <button
              key={ch.id}
              className="chapter-card"
              onClick={() => onPlay(ch.id)}
            >
              <div className="chapter-num">CAP · {String(i + 1).padStart(2, '0')}</div>
              <div className="chapter-title">{ch.subtitle}</div>
              <div className="chapter-meta">
                <span>{ch.durationLabel}</span>
                <span>·</span>
                <span>{ch.endingCount} FINALES</span>
              </div>
            </button>
          ))}

          <div className="chapter-card chapter-coming">
            <div className="chapter-num">CAP · 02</div>
            <div className="chapter-title">PRÓXIMAMENTE</div>
            <div className="chapter-meta"><span>EN DESARROLLO</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
