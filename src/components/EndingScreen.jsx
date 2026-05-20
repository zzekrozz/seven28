import React from 'react';
import { buildEndingText, computeRarity, FLAG_LABELS } from '../engine/engine.js';

const SURVIVAL_SCORES = {
  lost: 0,
  late_official: 30,
  sacrificed: 15,
  improvised: 65,
  metro_survivor: 75,
  alternate_route: 90,
  safe_official: 85
};

const ITEM_FLAGS = ['backpack', 'water', 'radio', 'flashlight', 'medicine', 'documents', 'keys', 'phone'];

export default function EndingScreen({ state, endingId, chapter, origin, onBack }) {
  const ending = chapter.endings[endingId];
  const text = buildEndingText(endingId, state, chapter, origin);
  const rarity = computeRarity(state, endingId);
  const survivalScore = SURVIVAL_SCORES[endingId] ?? 50;

  const keyDecisions = [];
  if (state.flags.includes('helpedNeighbor')) keyDecisions.push('Ayudaste a tu vecina');
  if (state.flags.includes('ignoredNeighbor')) keyDecisions.push('La dejaste en el rellano');
  if (state.flags.includes('calledFamily')) keyDecisions.push('Llamaste a tu familia');
  if (state.flags.includes('mapChecked')) keyDecisions.push('Buscaste el mapa');
  if (state.flags.includes('injuredLeg')) keyDecisions.push('Llegaste herido');
  if (state.flags.includes('wentToOfficialShelter')) keyDecisions.push('Refugio oficial');
  if (state.flags.includes('wentToMetro')) keyDecisions.push('Bajaste al metro');
  if (state.flags.includes('wentToBasement')) keyDecisions.push('Párking subterráneo');

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
              <div className="stat-fill" style={{ width: `${Math.min(100, state.information * 15)}%` }} />
            </div>
          </div>
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
