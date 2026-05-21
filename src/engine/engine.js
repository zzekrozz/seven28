// ============================================================
// 7:28 — Motor narrativo genérico
// Ningún capítulo lee del motor. El motor lee del JSON.
// ============================================================

export const ORIGIN_KEY = "seven28_origin_v2";

export const NEUTRAL_ORIGIN = {
  version: 2,
  chapter: null,
  ending: null,
  originTitle: null,
  canonSummary: null,
  route: "none",
  helpedNeighbor: false,
  ignoredNeighbor: false,
  calledFamily: false,
  sentLocation: false,
  foundMap: false,
  hasRadio: false,
  hasWater: false,
  hasFlashlight: false,
  hasMedicine: false,
  hasFamilyPhoto: false,
  hasDocuments: false,
  injured: false,
  humanity: 0,
  preparation: 0,
  information: 0,
  panic: 0,
  preparationLevel: "low",
  informationLevel: "low",
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

function cloneInitialState(chapter) {
  return {
    ...chapter.initialState,
    flags: [...(chapter.initialState?.flags || [])]
  };
}

function pickEventFlag(flags) {
  if (!Array.isArray(flags) || flags.length === 0) return null;
  const index = Math.floor(Math.random() * flags.length);
  return flags[index];
}

export function initializeChapterState(chapter) {
  const init = cloneInitialState(chapter);
  if (chapter.pressure?.key && chapter.pressure?.initial !== undefined) {
    init[chapter.pressure.key] = chapter.pressure.initial;
  }

  const buildingEvent = pickEventFlag(chapter.controlledEvents?.building);
  const streetEvent = pickEventFlag(chapter.controlledEvents?.street);
  if (buildingEvent && !init.flags.includes(buildingEvent)) init.flags.push(buildingEvent);
  if (streetEvent && !init.flags.includes(streetEvent)) init.flags.push(streetEvent);
  return init;
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
  if (typeof rule.if === "string") {
    return evalCondition(rule.if, { state, origin: null });
  }
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
    state.flags.includes("routeAlternate") ? "alternate" :
    state.flags.includes("routeMetro") ? "metro" :
    state.flags.includes("routeImprovised") ? "improvised" :
    state.flags.includes("routeOfficial") ? "official" : "none";

  const ending = chapter.endings[endingId] || {};
  const originTitle = ending.originTitle || ending.title || "—";

  // Resumen humano del canon
  const summaryParts = [];
  if (state.flags.includes("helpedNeighbor")) summaryParts.push("se detuvo a ayudar");
  if (state.flags.includes("ignoredNeighbor")) summaryParts.push("dejó una deuda moral en el rellano");
  if (state.flags.includes("calledFamily")) summaryParts.push("llamó a su familia");
  if (state.flags.includes("sentLocation")) summaryParts.push("envió su ubicación antes de perder cobertura");
  if (state.flags.includes("foundMap")) summaryParts.push("salió con una ruta en la cabeza");
  if (state.flags.includes("injured")) summaryParts.push("llegó herido");
  if (state.flags.includes("familyPhoto")) summaryParts.push("llevó consigo una foto para no irse del todo solo");
  const canonSummary = summaryParts.length > 0
    ? summaryParts.join(", ").replace(/, ([^,]*)$/, " y $1")
    : "no dejó mucho rastro";

  return {
    version: 2,
    chapter: chapter.id,
    ending: endingId,
    originTitle,
    canonSummary,
    route,
    helpedNeighbor: state.flags.includes("helpedNeighbor"),
    ignoredNeighbor: state.flags.includes("ignoredNeighbor"),
    calledFamily: state.flags.includes("calledFamily"),
    sentLocation: state.flags.includes("sentLocation"),
    foundMap: state.flags.includes("foundMap"),
    hasRadio: state.flags.includes("radio"),
    hasWater: state.flags.includes("water"),
    hasFlashlight: state.flags.includes("flashlight"),
    hasMedicine: state.flags.includes("medicine"),
    hasFamilyPhoto: state.flags.includes("familyPhoto"),
    hasDocuments: state.flags.includes("documents"),
    injured: state.flags.includes("injured"),
    humanity: state.humanity,
    preparation: state.preparation,
    information: state.information,
    panic: state.panic,
    humanityLevel: state.humanity >= 6 ? "high" : state.humanity >= 3 ? "medium" : "low",
    panicLevel: state.panic >= 7 ? "high" : state.panic >= 4 ? "medium" : "low",
    preparationLevel: state.preparation >= 6 ? "high" : state.preparation >= 3 ? "medium" : "low",
    informationLevel: state.information >= 6 ? "high" : state.information >= 3 ? "medium" : "low",
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
  batteries: "Pilas",
  medicine: "Medicinas",
  documents: "Documentos",
  cash: "Dinero en efectivo",
  familyPhoto: "Foto familiar",
  keys: "Llaves",
  phone: "Móvil",
  powerBank: "Batería externa",
  map: "Mapa guardado",
  warmClothes: "Ropa de abrigo",
  multiTool: "Multiherramienta",
  calledFamily: "Llamaste a tu familia",
  sentLocation: "Enviaste tu ubicación",
  foundMap: "Saliste con ruta",
  helpedNeighbor: "Ayudaste a un vecino",
  ignoredNeighbor: "Dejaste atrás a alguien",
  injured: "Llegaste herido",
  routeOfficial: "Ruta al refugio oficial",
  routeMetro: "Ruta al metro",
  routeAlternate: "Ruta alternativa",
  routeImprovised: "Refugio improvisado"
};

const HINT_LIBRARY = {
  metro_full_hint: "El metro puede estar saturado.",
  avoid_main_avenue_hint: "Tu madre insistió en evitar la avenida principal.",
  official_shelter_hint: "El sistema recomienda el refugio oficial.",
  system_saturated: "Las líneas de emergencia están saturadas.",
  whatsapp_sent: "El grupo de WhatsApp recibió tu aviso.",
  family_contact: "Has conseguido contactar con alguien de tu familia.",
  foundMap: "Conoces una ruta alternativa hacia el parking.",
  has_flashlight: "Tienes una fuente de luz.",
  flashlight: "Tienes una fuente de luz.",
  has_powerbank: "Puedes alargar la vida del móvil.",
  powerBank: "Puedes alargar la vida del móvil.",
  emotional_anchor: "Una voz conocida te ha dado algo a lo que agarrarte.",
  social_noise: "El ruido del grupo mezcla ayuda y pánico.",
  officialShelterSaturated: "El refugio oficial puede estar ya desbordado.",
  alternateRouteKnown: "Recuerdas una entrada lateral fuera del flujo principal.",
  parkingKnown: "Sabes que hay un parking subterráneo cerca.",
  sentLocation: "Has dejado una ubicación compartida antes de bajar."
};

const PLACE_LIBRARY = {
  home: "Casa",
  phone: "Teléfono",
  building_stairs: "Escalera del edificio",
  building_portal: "Portal",
  street_main: "Calle principal",
  street_side: "Calle lateral",
  official_queue: "Refugio oficial",
  metro_entrance: "Metro",
  parking_entrance: "Parking subterráneo",
  parking_lower: "Zona baja del parking",
  improvised_columns: "Columnas del parking",
  trasteros: "Zona de trasteros"
};

const INVENTORY_LIBRARY = [
  { flags: ["documents", "has_documents"], label: "Documentos" },
  { flags: ["familyPhoto", "has_photo"], label: "Foto" },
  { flags: ["powerBank", "has_powerbank"], label: "Batería externa" },
  { flags: ["has_charger"], label: "Cargador" },
  { flags: ["flashlight", "has_flashlight"], label: "Linterna" },
  { flags: ["medicine", "has_bandage"], label: "Venda / botiquín" },
  { flags: ["keys", "has_keys"], label: "Llaves" },
  { flags: ["map", "foundMap"], label: "Mapa" },
  { flags: ["water", "has_water"], label: "Agua" },
  { flags: ["radio", "has_radio"], label: "Radio" },
  { flags: ["batteries"], label: "Pilas" },
  { flags: ["warmClothes"], label: "Ropa de abrigo" },
  { flags: ["multiTool"], label: "Multiherramienta" }
];

export function formatZoneLabel(zone) {
  const labels = {
    home: "CASA",
    phone: "TELÉFONO",
    building: "EDIFICIO",
    stairs: "ESCALERA",
    portal: "PORTAL",
    street: "CALLE",
    official_shelter: "REFUGIO OFICIAL",
    metro: "METRO",
    parking: "PARKING",
    improvised_shelter: "REFUGIO IMPROVISADO",
    ending: "FINAL"
  };
  return labels[zone] || "UBICACIÓN DESCONOCIDA";
}

export function getVisitedLocations(state, chapter) {
  const nodeIds = Array.isArray(state?.visitedNodes) ? state.visitedNodes : [];
  const labels = [];

  for (const nodeId of nodeIds) {
    const node = chapter?.nodes?.[nodeId];
    const label = node?.location || node?.title;
    if (!label) continue;
    if (labels[labels.length - 1] !== label) labels.push(label);
  }

  return labels;
}

export function getKnownHints(state, currentNode) {
  const hints = new Set();
  const nodeHints = currentNode?.knownHints || [];

  for (const flag of state?.flags || []) {
    if (HINT_LIBRARY[flag]) hints.add(HINT_LIBRARY[flag]);
  }
  for (const hintKey of nodeHints) {
    if (HINT_LIBRARY[hintKey]) hints.add(HINT_LIBRARY[hintKey]);
  }

  return [...hints];
}

export function getKnownPlaces(state, currentNode, chapter) {
  const places = new Set();
  const visitedNodes = Array.isArray(state?.visitedNodes) ? state.visitedNodes : [];

  for (const nodeId of visitedNodes) {
    const node = chapter?.nodes?.[nodeId];
    if (node?.location) places.add(node.location);
    for (const place of node?.knownPlaces || []) {
      places.add(PLACE_LIBRARY[place] || place);
    }
  }

  for (const place of currentNode?.knownPlaces || []) {
    places.add(PLACE_LIBRARY[place] || place);
  }

  if (state?.flags?.includes("metro_full_hint") || state?.flags?.includes("routeMetro")) {
    places.add("Metro");
  }
  if (
    state?.flags?.includes("official_shelter_hint") ||
    state?.flags?.includes("routeOfficial") ||
    state?.flags?.includes("officialShelterKnown")
  ) {
    places.add("Refugio oficial");
  }
  if (
    state?.flags?.includes("foundMap") ||
    state?.flags?.includes("alternateRouteKnown") ||
    state?.flags?.includes("parkingKnown") ||
    state?.flags?.includes("routeAlternate")
  ) {
    places.add("Parking subterráneo");
  }
  if (state?.flags?.includes("routeImprovised")) {
    places.add("Refugio improvisado");
  }

  return [...places];
}

export function getInventory(state) {
  const inventory = [];
  const flags = state?.flags || [];

  for (const item of INVENTORY_LIBRARY) {
    if (item.flags.some(flag => flags.includes(flag))) {
      inventory.push(item.label);
    }
  }

  return inventory;
}
