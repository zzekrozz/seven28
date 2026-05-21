import React from 'react';
import {
  buildEndingText,
  buildOriginFromChapterOne,
  computeRarity,
  FLAG_LABELS
} from '../engine/engine.js';

const SURVIVAL_SCORES = {
  lost: 0,
  late_official: 35,
  sacrificed: 18,
  improvised_shelter: 62,
  metro_survivor: 76,
  alternate_route: 90,
  safe_official: 88,
  injured_survivor: 58,
  alone_prepared: 80,
  human_but_unprepared: 52
};

const ITEM_FLAGS = [
  'backpack',
  'water',
  'radio',
  'flashlight',
  'batteries',
  'medicine',
  'map',
  'powerBank',
  'keys',
  'warmClothes',
  'documents',
  'cash',
  'familyPhoto',
  'multiTool'
];

export default function EndingScreen({ state, endingId, chapter, origin, onBack }) {
  const ending = chapter.endings[endingId];
  const text = buildEndingText(endingId, state, chapter, origin);
  const rarity = computeRarity(state, endingId);
  const survivalScore = SURVIVAL_SCORES[endingId] ?? 50;
  const originPreview = buildOriginFromChapterOne(state, endingId, chapter);

  const keyDecisions = [];
  if (state.flags.includes('calledFamily')) keyDecisions.push('Llamaste a tu familia');
  if (state.flags.includes('sentLocation')) keyDecisions.push('Enviaste tu ubicación');
  if (state.flags.includes('foundMap')) keyDecisions.push('Buscaste una ruta antes de salir');
  if (state.flags.includes('helpedNeighbor')) keyDecisions.push('Te detuviste para ayudar');
  if (state.flags.includes('ignoredNeighbor')) keyDecisions.push('Seguiste adelante dejando a alguien atrás');
  if (state.flags.includes('injured')) keyDecisions.push('Llegaste herido');
  if (state.flags.includes('routeOfficial')) keyDecisions.push('Apostaste por el refugio oficial');
  if (state.flags.includes('routeMetro')) keyDecisions.push('Te hundiste hacia el metro');
  if (state.flags.includes('routeAlternate')) keyDecisions.push('Leíste una ruta alternativa');
  if (state.flags.includes('routeImprovised')) keyDecisions.push('Improvisaste refugio cercano');

  const items = state.flags.filter(f => ITEM_FLAGS.includes(f));

  return (
    <div className="ending-screen">
      <div className="scanlines" />
      <div className="ending-content">
        <div className="ending-meta">
          <span className="ending-label">{chapter.subtitle} · FINAL</span>
          <span className="ending-rarity">RAREZA {rarity}%</span>
        </div>

        <h1 className="ending-title">{ending.title}</h1>

        <div className="ending-text">
          {text.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
        </div>

        <div className="canon-saved">
          <span className="canon-saved-icon">●</span>
          <span>Tu canon ha quedado guardado.</span>
        </div>

        <div className="ending-stats">
          <div className="stat-row">
            <span>SUPERVIVENCIA</span>
            <div className="stat-bar">
              <div className="stat-fill" style={{ width: `${survivalScore}%` }} />
            </div>
          </div>
          <div className="stat-row">
            <span>HUMANIDAD</span>
            <div className="stat-bar">
              <div className="stat-fill" style={{ width: `${Math.min(100, Math.max(0, state.humanity * 10 + 30))}%` }} />
            </div>
          </div>
          <div className="stat-row">
            <span>PREPARACIÓN</span>
            <div className="stat-bar">
              <div className="stat-fill" style={{ width: `${Math.min(100, Math.max(0, state.preparation * 12 + 20))}%` }} />
            </div>
          </div>
          <div className="stat-row">
            <span>INFORMACIÓN</span>
            <div className="stat-bar">
              <div className="stat-fill" style={{ width: `${Math.min(100, Math.max(0, state.information * 15))}%` }} />
            </div>
          </div>
        </div>

        <div className="ending-section">
          <h3>CANON</h3>
          <ul>
            <li>{originPreview.originTitle}</li>
            <li>{originPreview.canonSummary}</li>
          </ul>
        </div>

        {keyDecisions.length > 0 && (
          <div className="ending-section">
            <h3>DECISIONES CLAVE</h3>
            <ul>
              {keyDecisions.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </div>
        )}

        {items.length > 0 && (
          <div className="ending-section">
            <h3>LLEVABAS</h3>
            <div className="items-list">
              {items.map(i => (
                <span key={i} className="item-chip">{FLAG_LABELS[i] || i}</span>
              ))}
            </div>
          </div>
        )}

        <button className="btn-primary" onClick={onBack}>JUGAR OTRA VEZ</button>
      </div>
    </div>
  );
}
