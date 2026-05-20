// ============================================================
// 7:28 — Motor narrativo genérico
// Ningún capítulo lee del motor. El motor lee del JSON.
// ============================================================

export const ORIGIN_KEY = "seven28_origin_v1";

export const NEUTRAL_ORIGIN = {
  version: 1,
  chapter: null,
  ending: null,
  originTitle: null,
  canonSummary: null,
  route: "none",
  helpedNeighbor: false,
  ignoredNeighbor: false,
  calledFamily: false,
  foundMap: false,
  hasRadio: false,
  hasWater: false,
  hasFlashlight: false,
  hasMedicine: false,
  hasDocuments: false,
  injured: false,
  humanity: 0,
  preparation: 0,
  information: 0,
  panic: 0,
  panicLevel: "low",
  humanityLevel: "low",
  timestamp: null
};

// ============================================================
// Mini lenguaje de condiciones — sin eval()
// Acepta:
//   state.flags includes X
//   origin.x  /  origin.x >= n  /  origin.x == "s"
//   state.preparation >= 5
//   !origin.x
//   A && B
// ============================================================
export function evalCondition(expr, ctx) {
  if (!expr || typeof expr !== "string") return true;
  if (expr.includes("&&")) {
    return expr.split("&&").every(p => evalCondition(p.trim(), ctx));
  }
  if (expr.startsWith("!")) return !evalCondition(expr.slice(1).trim(), ctx);

  // Sintaxis especial: "state.flags includes foo"
  if (expr.includes(" includes ")) {
    const [left, flag] = expr.split(" includes ").map(s => s.trim());
    const arr = resolveRef(left, ctx);
    return Array.isArray(arr) && arr.includes(flag);
  }

  const ops = ["==", "!=", ">=", "<=", ">", "<"];
  for (const op of ops) {
    const i = expr.indexOf(op);
    if (i > 0) {
      const lv = resolveRef(expr.slice(0, i).trim(), ctx);
      const rv = parseLiteral(expr.slice(i + op.length).trim());
      switch (op) {
        case "==": return lv === rv;
        case "!=": return lv !== rv;
        case ">=": return Number(lv) >= Number(rv);
        case "<=": return Number(lv) <= Number(rv);
        case ">":  return Number(lv) >  Number(rv);
        case "<":  return Number(lv) <  Number(rv);
      }
    }
  }
  return Boolean(resolveRef(expr.trim(), ctx));
}

function resolveRef(ref, ctx) {
  if (!ref.includes(".")) return ref;
  const [root, key] = ref.split(".");
  if (root === "origin") return ctx.origin?.[key];
  if (root === "state") return ctx.state?.[key];
  return undefined;
}

function parseLiteral(v) {
  v = v.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  if (v === "true") return true;
  if (v === "false") return false;
  if (!isNaN(Number(v))) return Number(v);
  return v;
}

// Resuelve texto: primer variant que matchea gana, sino base
export function resolveText(node, ctx) {
  const baseText = node.text;
  if (!node.textVariants) return baseText;
  for (const v of node.textVariants) {
    if (evalCondition(v.if, ctx)) return v.text;
  }
  return baseText;
}

// ============================================================
// Requisitos de una opción
// ============================================================
export function checkRequirements(option, state, origin) {
  if (option.requiredFlags) {
    for (const f of option.requiredFlags) if (!state.flags.includes(f)) return false;
  }
  if (option.requiredState) {
    for (const [k, v] of Object.entries(option.requiredState)) {
      if ((state[k] || 0) < v) return false;
    }
  }
  if (option.requiredOrigin) {
    if (!evalCondition(option.requiredOrigin, { state, origin })) return false;
  }
  return true;
}

// ============================================================
// Aplicar una opción al estado. Devuelve { newState, diff }
// El diff es lo que la UI muestra en la pantalla de consecuencia.
// ============================================================
export function applyOption(state, option, chapter) {
  const next = { ...state, flags: [...state.flags] };
  const cost = option.timeCost ?? option.pressureCost ?? 0;
  const pkey = chapter.pressure?.key;

  if (pkey && cost > 0) {
    next[pkey] = Math.max(0, (next[pkey] || 0) - cost);
  }
  if (option.effects) {
    for (const [k, v] of Object.entries(option.effects)) {
      next[k] = (next[k] || 0) + v;
    }
  }
  const flagsAdded = [];
  if (option.addFlags) {
    for (const f of option.addFlags) {
      if (!next.flags.includes(f)) { next.flags.push(f); flagsAdded.push(f); }
    }
  }
  const flagsRemoved = [];
  if (option.removeFlags) {
    for (const f of option.removeFlags) {
      if (next.flags.includes(f)) flagsRemoved.push(f);
    }
    next.flags = next.flags.filter(f => !option.removeFlags.includes(f));
  }

  return {
    newState: next,
    diff: {
      pressureCost: cost,
      flagsAdded,
      flagsRemoved,
      afterChoiceText: option.afterChoiceText || null
    }
  };
}

// ============================================================
// Reglas de final
// ============================================================
function ruleMatches(rule, state) {
  const r = rule.if;
  if (r.flag && !state.flags.includes(r.flag)) return false;
  if (r.timeLeftMin !== undefined && state.timeLeft < r.timeLeftMin) return false;
  if (r.timeLeftMax !== undefined && state.timeLeft > r.timeLeftMax) return false;
  if (r.humanityMin !== undefined && state.humanity < r.humanityMin) return false;
  return true;
}

export function resolveEnding(state, chapter) {
  for (const rule of chapter.endingRules || []) {
    if (ruleMatches(rule, state)) return rule.ending;
  }
  return Object.keys(chapter.endings)[0];
}

// ============================================================
// Texto de final: base + fragmentos condicionales
// ============================================================
function fragmentApplies(frag, state, origin) {
  return evalCondition(frag.if, { state, origin });
}

export function buildEndingText(endingId, state, chapter, origin) {
  const e = chapter.endings[endingId];
  let text = e.baseText;
  for (const frag of e.fragments || []) {
    if (fragmentApplies(frag, state, origin)) text += frag.text;
  }
  return text;
}

// Rareza determinista del final (cosmético, no afecta gameplay)
export function computeRarity(state, endingId) {
  const key = endingId + state.flags.sort().join("|") + state.humanity + state.preparation + state.information;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = ((h << 5) - h + key.charCodeAt(i)) | 0;
  return Math.abs(h) % 38 + 3;
}

// ============================================================
// Origin state — canon personal del jugador
// ============================================================
export function loadOrigin() {
  try {
    const raw = localStorage.getItem(ORIGIN_KEY);
    if (!raw) return { ...NEUTRAL_ORIGIN };
    return { ...NEUTRAL_ORIGIN, ...JSON.parse(raw) };
  } catch { return { ...NEUTRAL_ORIGIN }; }
}

export function saveOrigin(origin) {
  try { localStorage.setItem(ORIGIN_KEY, JSON.stringify(origin)); } catch {}
}

export function clearOrigin() {
  try { localStorage.removeItem(ORIGIN_KEY); } catch {}
}

// Construye originState a partir del estado final del capítulo 1
export function buildOriginFromChapterOne(state, endingId, chapter) {
  const route =
    state.flags.includes("wentToBasement") ? "basement" :
    state.flags.includes("wentToMetro") ? "metro" :
    state.flags.includes("wentToOfficialShelter") ? "official" : "none";

  const ending = chapter.endings[endingId] || {};
  const originTitle = ending.originTitle || ending.title || "—";

  // Resumen humano del canon
  const summaryParts = [];
  if (state.flags.includes("helpedNeighbor")) summaryParts.push("ayudó a su vecina");
  if (state.flags.includes("ignoredNeighbor")) summaryParts.push("dejó atrás a su vecina");
  if (state.flags.includes("calledFamily")) summaryParts.push("llamó a su familia");
  if (state.flags.includes("mapChecked")) summaryParts.push("buscó el mapa");
  if (state.flags.includes("injuredLeg")) summaryParts.push("llegó herido");
  const canonSummary = summaryParts.length > 0
    ? summaryParts.join(", ").replace(/, ([^,]*)$/, " y $1")
    : "no dejó mucho rastro";

  return {
    version: 1,
    chapter: chapter.id,
    ending: endingId,
    originTitle,
    canonSummary,
    route,
    helpedNeighbor: state.flags.includes("helpedNeighbor"),
    ignoredNeighbor: state.flags.includes("ignoredNeighbor"),
    calledFamily: state.flags.includes("calledFamily"),
    foundMap: state.flags.includes("mapChecked"),
    hasRadio: state.flags.includes("radio"),
    hasWater: state.flags.includes("water"),
    hasFlashlight: state.flags.includes("flashlight"),
    hasMedicine: state.flags.includes("medicine"),
    hasDocuments: state.flags.includes("documents"),
    injured: state.flags.includes("injuredLeg"),
    humanity: state.humanity,
    preparation: state.preparation,
    information: state.information,
    panic: state.panic,
    panicLevel: state.panic >= 5 ? "high" : state.panic >= 3 ? "medium" : "low",
    humanityLevel: state.humanity >= 5 ? "high" : state.humanity >= 2 ? "medium" : "low",
    timestamp: Date.now()
  };
}

// ============================================================
// Helpers de presentación
// ============================================================
export function formatPressure(value, format) {
  if (format === "mmss") {
    const v = Math.max(0, value);
    const m = Math.floor(v / 60);
    const s = v % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  if (format === "percent") return `${Math.round(value)}%`;
  return String(value);
}

// Etiquetas legibles para los flags conocidos
export const FLAG_LABELS = {
  backpack: "Mochila",
  water: "Agua",
  radio: "Radio de pilas",
  flashlight: "Linterna",
  medicine: "Medicinas",
  documents: "Documentos",
  keys: "Llaves",
  phone: "Móvil",
  mapChecked: "Mapa memorizado",
  officialShelterKnown: "Conoces el refugio oficial",
  alternateShelterKnown: "Conoces el párking subterráneo",
  calledFamily: "Llamaste a tu madre",
  helpedNeighbor: "Bajaste con tu vecina",
  ignoredNeighbor: "Dejaste a tu vecina en el rellano",
  neighborWithYou: "Tu vecina va contigo",
  injuredLeg: "Te has hecho daño en la pierna",
  wentToBasement: "Vas al párking",
  wentToMetro: "Vas al metro",
  wentToOfficialShelter: "Vas al refugio oficial",
  heardSecondSignal: "Has oído la segunda señal"
};
