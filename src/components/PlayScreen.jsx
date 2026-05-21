import React, { useState } from 'react';
import {
  resolveText,
  checkRequirements,
  formatPressure,
  formatZoneLabel
} from '../engine/engine.js';
import MapPanel from './MapPanel.jsx';

function PressureDisplay({ chapter, state }) {
  const pressure = chapter.pressure;
  if (!pressure) return null;

  const value = state[pressure.key] ?? 0;
  const display = formatPressure(value, pressure.format);
  const critical = pressure.format === 'mmss' && value < 60 && value > 0;

  return (
    <div className={`pressure ${critical ? 'pressure-critical' : ''}`}>
      <span className="pressure-label">{pressure.label}</span>
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
        <span className="scene-tag">SENAL · {node.atmosphere?.toUpperCase()}</span>
      </div>

      <div className="scene-location">
        <span className="scene-zone">{formatZoneLabel(node.zone)}</span>
        <span className="scene-location-divider">/</span>
        <span className="scene-location-label">{node.location || 'UBICACION DESCONOCIDA'}</span>
      </div>

      <h2 className="scene-title">{node.title}</h2>
      {node.sceneContext && <p className="scene-context">{node.sceneContext}</p>}

      <div className="scene-text">
        {text.split('\n\n').map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
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
      <div className="choice-icon">{option.icon || '>'}</div>
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
  const [mapOpen, setMapOpen] = useState(false);
  const node = chapter.nodes[nodeId];
  if (!node) return null;

  return (
    <div className="play-screen">
      <div className="play-layout">
        <div className="play-main">
          <div className="play-header">
            <div className="signal-strip">
              <span className="blink-dot small" />
              <span>{chapter.subtitle} · ALERTA NACIONAL</span>
            </div>

            <div className="play-header-row">
              <div className="play-location-bar">
                <span className="play-location-zone">{formatZoneLabel(node.zone)}</span>
                <span className="play-location-divider">/</span>
                <span className="play-location-current">{node.location || 'UBICACION DESCONOCIDA'}</span>
              </div>

              <button className="map-toggle" type="button" onClick={() => setMapOpen(true)}>
                MAPA
              </button>
            </div>

            {chapter.pressure && <PressureDisplay chapter={chapter} state={state} />}
          </div>

          <SceneCard node={node} state={state} origin={origin} />

          <div className="choices">
            {node.options.map((option, index) => (
              <ChoiceCard
                key={index}
                index={index}
                option={option}
                state={state}
                origin={origin}
                onChoose={onChoose}
              />
            ))}
          </div>
        </div>

        <div className="play-sidebar">
          <MapPanel chapter={chapter} currentNode={node} state={state} origin={origin} />
        </div>
      </div>

      {mapOpen && (
        <div className="map-overlay" onClick={() => setMapOpen(false)}>
          <div className="map-overlay-panel" onClick={(event) => event.stopPropagation()}>
            <MapPanel
              chapter={chapter}
              currentNode={node}
              state={state}
              origin={origin}
              mobile
              onClose={() => setMapOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
