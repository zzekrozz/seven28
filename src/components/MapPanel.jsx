import React from 'react';
import {
  formatZoneLabel,
  getVisitedLocations,
  getKnownHints,
  getKnownPlaces,
  getInventory
} from '../engine/engine.js';

function MapTrack({ chapter, currentNode, state }) {
  const legend = chapter.mapLegend || [];
  const visitedPositions = new Set(
    (state?.visitedNodes || [])
      .map((nodeId) => chapter.nodes?.[nodeId]?.mapPosition)
      .filter(Boolean)
  );
  const knownPlaces = new Set(getKnownPlaces(state, currentNode, chapter));

  return (
    <div className="map-track" aria-label="Mapa narrativo">
      {legend.map((point) => {
        const active = currentNode?.mapPosition === point.key;
        const visited = visitedPositions.has(point.key);
        const discovered = point.always || visited || active || knownPlaces.has(point.label);

        return (
          <div
            key={point.key}
            className={`map-point ${active ? 'map-point-active' : ''} ${visited ? 'map-point-visited' : ''} ${!discovered ? 'map-point-hidden' : ''}`}
          >
            <span className="map-dot" />
            <div className="map-point-copy">
              <span className="map-point-label">{point.label}</span>
              {active && <span className="map-point-state">TU ESTAS AQUI</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InfoList({ title, items, emptyLabel }) {
  return (
    <section className="map-section">
      <h3>{title}</h3>
      {items.length > 0 ? (
        <ul className="map-list">
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : (
        <p className="map-empty">{emptyLabel}</p>
      )}
    </section>
  );
}

export default function MapPanel({ chapter, currentNode, state, onClose, mobile = false }) {
  const route = getVisitedLocations(state, chapter);
  const hints = getKnownHints(state, currentNode);
  const places = getKnownPlaces(state, currentNode, chapter);
  const inventory = getInventory(state);
  const zoneLabel = formatZoneLabel(currentNode?.zone);
  const locationLabel = currentNode?.location || 'UBICACION DESCONOCIDA';

  return (
    <aside className={`map-panel ${mobile ? 'map-panel-mobile' : ''}`}>
      <div className="map-panel-header">
        <div>
          <p className="map-kicker">PLANO INCOMPLETO</p>
          <h2 className="map-title">RUTA</h2>
        </div>
        {mobile && (
          <button className="map-close" onClick={onClose} type="button">
            CERRAR
          </button>
        )}
      </div>

      <section className="map-current">
        <p className="map-kicker">UBICACION</p>
        <p className="map-current-zone">{zoneLabel}</p>
        <p className="map-current-location">{locationLabel}</p>
        <p className="map-summary">{currentNode?.spatialSummary || 'La senal espacial llega fragmentada.'}</p>
      </section>

      <MapTrack chapter={chapter} currentNode={currentNode} state={state} />

      <InfoList
        title="RECORRIDO"
        items={route}
        emptyLabel="La ruta todavia no deja una traza clara."
      />

      <InfoList
        title="LUGARES CONOCIDOS"
        items={places}
        emptyLabel="Aun no tienes suficientes referencias."
      />

      <InfoList
        title="PISTAS"
        items={hints}
        emptyLabel="Sin senales utiles por ahora."
      />

      <InfoList
        title="OBJETOS CLAVE"
        items={inventory}
        emptyLabel="Sin objetos clave."
      />
    </aside>
  );
}
