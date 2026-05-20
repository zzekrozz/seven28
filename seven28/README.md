# 7:28

Antología narrativa interactiva. Capítulo 1: **La Señal**. Siete minutos y veintiocho segundos antes del impacto. Lo que decidas, lo decides ahora.

Mobile-first. Sin backend. Sin login. La historia vive en un JSON.

---

## Stack

- **Vite** + **React 18**
- Sin librerías de UI ni routing
- `localStorage` para guardar el canon del jugador entre capítulos
- Despliegue estático (Vercel, Netlify, Cloudflare Pages, GitHub Pages)

---

## Estructura

```
seven28/
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
├── .gitignore
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx                   ← entry point
    ├── App.jsx                    ← orquesta fases (archive/play/consequence/ending)
    ├── index.css                  ← reset + variables + animaciones
    ├── styles.css                 ← estilos de componentes
    ├── data/
    │   ├── chapters.js            ← lista de capítulos disponibles
    │   └── story.signal.json      ← historia del cap. 1 (editable sin tocar JS)
    ├── engine/
    │   └── engine.js              ← motor genérico (parser, máquina de estado, origin)
    └── components/
        ├── ArchiveScreen.jsx
        ├── PlayScreen.jsx
        ├── ConsequenceScreen.jsx
        └── EndingScreen.jsx
```

---

## Desarrollo local

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`.

```bash
npm run build      # genera /dist
npm run preview    # sirve /dist en local para verificar
```

---

## Desplegar en Vercel

### Opción A — desde la web (recomendada)

1. Sube este repo a GitHub.
2. Entra en [vercel.com/new](https://vercel.com/new) y "Import Git Repository".
3. Vercel detecta automáticamente Vite. No tienes que tocar nada:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Click en **Deploy**. Listo.

El `vercel.json` ya incluye el rewrite para SPA (todas las rutas sirven `index.html`).

### Opción B — CLI

```bash
npm install -g vercel
vercel              # primera vez: pregunta y configura
vercel --prod       # despliegue de producción
```

---

## Editar la historia

Toda la historia del capítulo 1 vive en `src/data/story.signal.json`. Cambios sin tocar código:

**Añadir una opción a un nodo:**
```json
{
  "icon": "🔑",
  "label": "Coger las llaves del coche",
  "description": "Si hay carretera abierta, ganas mucho.",
  "visibleHint": "Tiempo incierto",
  "timeCost": 18,
  "effects": { "preparation": 1 },
  "addFlags": ["carKeys"],
  "next": "hallway",
  "afterChoiceText": "Llaves al bolsillo."
}
```

**Bloquear una opción según objetos:**
```json
"requiredFlags": ["radio"],
"blockedText": "No tienes radio."
```

**Variantes contextuales (texto que cambia según lo que llevas):**
```json
"textVariants": [
  { "if": "state.flags includes neighborWithYou", "text": "Cargas con ella..." }
]
```

**Añadir un final:**
1. Entrada en `endings` con `title`, `originTitle`, `baseText`, `fragments`.
2. Regla en `endingRules` que lo dispare por flag/tiempo/humanidad.

---

## Añadir un capítulo nuevo

1. Copia `story.signal.json` y renómbralo: `story.bunker.json`.
2. Cambia `id`, `subtitle`, nodos, opciones, finales. Si el capítulo no tiene cuenta atrás, deja `"pressure": null`.
3. Importa el JSON en `src/data/chapters.js`:

```js
import storySignal from './story.signal.json';
import storyBunker from './story.bunker.json';

const CHAPTERS = [storySignal, storyBunker];
export default CHAPTERS;
```

El motor lee del JSON, no del capítulo: no hace falta tocar nada más.

---

## Datos del jugador

El canon se guarda en `localStorage` bajo la clave `seven28_origin_v1`. Estructura:

```js
{
  version: 1,
  chapter: "señal",
  ending: "alternate_route",
  originTitle: "El que leyó el mapa",
  canonSummary: "ayudó a su vecina y buscó el mapa",
  route: "basement",
  helpedNeighbor: true,
  calledFamily: false,
  hasRadio: true,
  humanity: 5,
  preparation: 3,
  panicLevel: "low",
  humanityLevel: "high",
  timestamp: 1716210000000
}
```

Capítulos futuros leerán este objeto para personalizar el texto.

---

## Licencia

Privado por ahora.
