import React, { useState, useEffect, useRef } from 'react';
import {
  loadOrigin, saveOrigin, clearOrigin, NEUTRAL_ORIGIN,
  initializeChapterState,
  buildOriginFromChapterOne,
  applyOption, resolveEnding
} from './engine/engine.js';
import CHAPTERS from './data/chapters.js';
import ArchiveScreen from './components/ArchiveScreen.jsx';
import PlayScreen from './components/PlayScreen.jsx';
import ConsequenceScreen from './components/ConsequenceScreen.jsx';
import EndingScreen from './components/EndingScreen.jsx';
import './styles.css';

function appendVisitedNode(state, nextNodeId) {
  const visitedNodes = Array.isArray(state?.visitedNodes) ? [...state.visitedNodes] : [];
  if (visitedNodes[visitedNodes.length - 1] !== nextNodeId) {
    visitedNodes.push(nextNodeId);
  }
  return { ...state, visitedNodes };
}

export default function App() {
  const [phase, setPhase] = useState('archive');
  const [origin, setOrigin] = useState(() => loadOrigin());
  const [currentChapter, setCurrentChapter] = useState(null);
  const [state, setState] = useState(null);
  const [nodeId, setNodeId] = useState(null);
  const [endingId, setEndingId] = useState(null);
  const [pendingNext, setPendingNext] = useState(null);
  const [lastDiff, setLastDiff] = useState(null);

  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const p = currentChapter?.pressure;
    if (!p?.tickPerSecond) return;
    const id = setInterval(() => {
      if (phaseRef.current !== 'playing') return;
      setState(s => {
        if (!s) return s;
        return { ...s, [p.key]: Math.max(0, (s[p.key] || 0) - 1) };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, currentChapter]);

  useEffect(() => {
    if (phase !== 'playing' || !state || !currentChapter?.pressure?.endOnZero) return;
    const v = state[currentChapter.pressure.key];
    if (v !== undefined && v <= 0) {
      finishChapter(state);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, phase]);

  const startChapter = (chapterId) => {
    const ch = CHAPTERS.find(c => c.id === chapterId);
    if (!ch) return;
    const init = {
      ...initializeChapterState(ch),
      visitedNodes: [ch.startNode]
    };
    setCurrentChapter(ch);
    setState(init);
    setNodeId(ch.startNode);
    setEndingId(null);
    setLastDiff(null);
    setPendingNext(null);
    setPhase('playing');
  };

  const finishChapter = (finalState, explicitEndingId = null) => {
    const eid = explicitEndingId || resolveEnding(finalState, currentChapter);
    setState(finalState);
    setEndingId(eid);
    setPhase('ending');
    if (currentChapter.id === 'signal') {
      const newOrigin = buildOriginFromChapterOne(finalState, eid, currentChapter);
      setOrigin(newOrigin);
      saveOrigin(newOrigin);
    }
  };

  const onChoose = (option) => {
    if (phase !== 'playing') return;
    const { newState, diff } = applyOption(state, option, currentChapter);
    setState(newState);
    setLastDiff(diff);
    setPendingNext(option.next);
    setPhase('consequence');
  };

  const onContinue = () => {
    const next = pendingNext;
    setLastDiff(null);
    setPendingNext(null);

    const pkey = currentChapter.pressure?.key;
    const ranOut = currentChapter.pressure?.endOnZero && (state[pkey] ?? 1) <= 0;

    const isDirectEnding = Boolean(currentChapter?.endings?.[next]);

    if (next === 'ending' || isDirectEnding || ranOut) {
      finishChapter(state, isDirectEnding ? next : null);
    } else {
      setState(s => appendVisitedNode(s, next));
      setNodeId(next);
      setPhase('playing');
    }
  };

  const backToArchive = () => {
    setPhase('archive');
    setCurrentChapter(null);
    setState(null);
    setEndingId(null);
    setLastDiff(null);
    setPendingNext(null);
  };

  const handleClearOrigin = () => {
    clearOrigin();
    setOrigin({ ...NEUTRAL_ORIGIN });
  };

  return (
    <div className="app-root">
      <div className="grain" />

      {phase === 'archive' && (
        <ArchiveScreen
          origin={origin}
          onPlay={startChapter}
          onClearOrigin={handleClearOrigin}
        />
      )}

      {phase === 'playing' && currentChapter && state && (
        <PlayScreen
          chapter={currentChapter}
          state={state}
          nodeId={nodeId}
          origin={origin}
          onChoose={onChoose}
        />
      )}

      {phase === 'consequence' && lastDiff && currentChapter && (
        <ConsequenceScreen
          diff={lastDiff}
          chapter={currentChapter}
          onContinue={onContinue}
        />
      )}

      {phase === 'ending' && endingId && currentChapter && state && (
        <EndingScreen
          state={state}
          endingId={endingId}
          chapter={currentChapter}
          origin={origin}
          onBack={backToArchive}
        />
      )}
    </div>
  );
}
