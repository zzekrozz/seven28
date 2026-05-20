import React from 'react';
import { FLAG_LABELS } from '../engine/engine.js';

export default function ConsequenceScreen({ diff, chapter, onContinue }) {
  const showCost = diff.pressureCost > 0 && chapter.pressure;
  const costText = chapter.pressure?.format === 'mmss'
    ? `${diff.pressureCost} ${diff.pressureCost === 1 ? 'segundo' : 'segundos'}`
    : `${diff.pressureCost}`;

  const gainedLabels = diff.flagsAdded.map(f => FLAG_LABELS[f]).filter(Boolean);
  const lostLabels = diff.flagsRemoved.map(f => FLAG_LABELS[f]).filter(Boolean);

  return (
    <div className="consequence-screen">
      <div className="consequence-card">
        <div className="consequence-tag">CONSECUENCIA</div>

        {showCost && (
          <div className="consequence-cost">
            <span className="cost-label">HAS PERDIDO</span>
            <span className="cost-value">{costText}</span>
          </div>
        )}

        {diff.afterChoiceText && (
          <p className="consequence-text">{diff.afterChoiceText}</p>
        )}

        {(gainedLabels.length > 0 || lostLabels.length > 0) && (
          <div className="consequence-changes">
            {gainedLabels.map((l, i) => (
              <div key={`g${i}`} className="change-row change-gain">＋ {l}</div>
            ))}
            {lostLabels.map((l, i) => (
              <div key={`l${i}`} className="change-row change-loss">－ {l}</div>
            ))}
          </div>
        )}

        <button className="consequence-continue" onClick={onContinue}>
          CONTINUAR
        </button>
      </div>
    </div>
  );
}
