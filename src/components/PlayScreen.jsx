import React from 'react';
import { resolveText, checkRequirements, formatPressure } from '../engine/engine.js';

function PressureDisplay({ chapter, state }) {
  const p = chapter.pressure;
  if (!p) return null;
  const value = state[p.key] ?? 0;
  const display = formatPressure(value, p.format);
  const critical = p.format === 'mmss' && value < 60 && value > 0;
  return (
    <div className={`pressure ${critical ? 'pressure-critical' : ''}`}>
      <span className="pressure-label">{p.label}</span>
      <span className="pressure-digits">{display}</span>
    </div>
  );
}

function SceneCard({ node, state, origin }) {
  const text = resolveText(node, { state, origin });
  return (
    <div className="scene-card" key={node.id}>
      <div className="scene-header">
        {node.icon && <span className="scene-icon">{node.icon}</span>}
        <span className="scene-tag">SEÑAL · {node.atmosphere?.toUpperCase()}</span>
      </div>
      <h2 className="scene-title">{node.title}</h2>
      <div className="scene-text">
        {text.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
      </div>
    </div>
  );
}

function ChoiceCard({ option, state, origin, onChoose, index }) {
  const available = checkRequirements(option, state, origin);
  return (
    <button
      className={`choice-card ${!available ? 'choice-blocked' : ''}`}
      onClick={() => available && onChoose(option)}
      disabled={!available}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="choice-icon">{option.icon || '›'}</div>
      <div className="choice-main">
        <span className="choice-label">{option.label}</span>
        <span className="choice-description">
          {available ? option.description : (option.blockedText || 'No disponible.')}
        </span>
      </div>
      {available && option.visibleHint && (
        <div className="choice-hint">{option.visibleHint}</div>
      )}
    </button>
  );
}

export default function PlayScreen({ chapter, state, nodeId, origin, onChoose }) {
  const node = chapter.nodes[nodeId];
  if (!node) return null;

  return (
    <div className="play-screen">
      <div className="play-header">
        <div className="signal-strip">
          <span className="blink-dot small" />
          <span>{chapter.subtitle} · ALERTA NACIONAL</span>
        </div>
        {chapter.pressure && <PressureDisplay chapter={chapter} state={state} />}
      </div>

      <SceneCard node={node} state={state} origin={origin} />

      <div className="choices">
        {node.options.map((opt, i) => (
          <ChoiceCard
            key={i}
            index={i}
            option={opt}
            state={state}
            origin={origin}
            onChoose={onChoose}
          />
        ))}
      </div>
    </div>
  );
}
