# Second Skin

## Getting Started

```bash
npm install    # install dependencies (first time only)
npm run dev    # start the dev server
```

Then open `http://localhost:5173` in your browser.

Other useful commands:
- `npm run build` — production build
- `npm run preview` — preview the production build locally

---

# SECOND SKIN — Discovery, Methodology & Implementation Roadmap

## PHASE 0: DISCOVERY (Before the Residency)

### 0.1 — Conceptual Grounding

The core premise of Second Skin is that a digital interface should not merely *display* ecological data — it should *behave* differently based on the state of the ecosystem. The lake is not a data source to be visualized. It is a stakeholder whose condition reshapes the entire interface.

This is a departure from two existing paradigms:
- **Environmental dashboards** (passive display: charts, maps, numbers)
- **User-centered design** (the human's attention and comfort drive all design decisions)

Second Skin proposes a third mode: **ecosystem-centered interface design**, where the interface's visual, auditory, and behavioral properties are governed by non-human ecological inputs.

### 0.2 — Data Source Audit

The prototype depends on real environmental data. Here is what exists and is accessible:

**Primary: Alplakes (formerly Meteolakes)**
- URL: https://www.alplakes.eawag.ch
- Operated by: Eawag (Swiss Federal Institute of Aquatic Science)
- Open-source: github.com/eawag-surface-waters-research
- Backend: FastAPI (alplakes-fastapi)
- Data available:
  - Surface water temperature (modeled + satellite)
  - Current speed and direction
  - Water temperature at depth
  - Algae/chlorophyll concentrations
  - 4.5-day forecasts in 30-minute intervals
  - Covers Lake Geneva (key: "geneva")

**Secondary: Datalakes**
- URL: https://www.datalakes-eawag.ch
- Historical datasets for Swiss lakes
- Downloadable CSV/JSON
- Good for establishing baseline patterns and seasonal norms

**Tertiary: Open-Meteo (Weather)**
- URL: https://open-meteo.com
- Free, no API key required
- Air temperature, humidity, wind speed/direction, UV index, precipitation
- Coordinates for La Becque: 46.455°N, 6.856°E

**Tertiary: Swiss FOEN (Federal Office for the Environment)**
- Hydrological data: river flows feeding the lake
- Air quality monitoring stations in the Vaud region

### 0.3 — Design Rules Formalization

The interface responds to ecological conditions through a mapping system. Each environmental metric drives specific visual, auditory, and interactive behaviors:

| Ecological Input | Metric Source | UI Layer Affected | Response Logic |
|---|---|---|---|
| Water temperature | Alplakes API | Color palette | Warm→cool spectrum shift; extreme heat triggers red stress overlay |
| Temperature anomaly (deviation from seasonal norm) | Alplakes + historical baseline | Typography | Increasing anomaly → text distortion, letter-spacing expands, opacity drops |
| Current speed | Alplakes API | Animation speed | Fast currents → faster UI motion; calm water → slow, fluid animations |
| Algae concentration | Alplakes API | Visual texture | High algae → green noise/grain overlay; bloom → interface "overgrowth" |
| Wind speed | Open-Meteo | Sound layer | Wind drives generative ambient tone; gusts create audio spikes |
| Air quality / UV | Open-Meteo | Background opacity | Poor air → hazy, low-contrast; clear → sharp, high-contrast |

This mapping is the heart of the design methodology. It should be treated as a living document — refined through observation during the residency.

---

## PHASE 1: METHODOLOGY

### 1.1 — Research Framework

The project uses a **Research-through-Design (RtD)** methodology: knowledge is generated through the act of making. The prototype is not the end product — it is a research instrument.

The research questions:
1. How does an interface's *behavioral* response to ecological data differ from its *informational* display of the same data?
2. What happens to the human's relationship with the ecosystem when the interface treats the ecosystem as its primary stakeholder?
3. Can multi-sensory (visual + auditory + haptic) ecological translation create a more embodied awareness than dashboards?

### 1.2 — System Architecture

```
┌─────────────────────────────────────────────┐
│              DATA LAYER                      │
│  Alplakes API → water temp, currents, algae  │
│  Open-Meteo  → wind, air temp, UV, humidity  │
│  (Polled every 5–30 minutes)                 │
└─────────────┬───────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│           PROCESSING LAYER                   │
│  Normalize all inputs to 0–1 range           │
│  Compare to seasonal baselines               │
│  Calculate stress index (composite metric)   │
│  Detect anomalies and rate of change         │
└─────────────┬───────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│          TRANSLATION LAYER                   │
│  Map normalized values to design parameters: │
│  → CSS custom properties (colors, opacity,   │
│    blur, animation-duration, letter-spacing)  │
│  → Web Audio API parameters (frequency,      │
│    gain, filter cutoff, reverb)              │
│  → Vibration API (mobile haptic patterns)    │
└─────────────┬───────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│          INTERFACE LAYER                     │
│  The "Second Skin" — a browser-based         │
│  reactive surface that breathes, shifts,     │
│  and transforms with the lake's state        │
└─────────────────────────────────────────────┘
```

### 1.3 — Technical Stack

| Component | Technology | Rationale |
|---|---|---|
| Frontend | HTML/CSS/JS (vanilla, no framework) | Maximum control over CSS custom properties and animation; portability; no build step needed |
| Visual effects | CSS custom properties + WebGL (via Three.js or raw shaders) | Real-time responsive visuals; GPU-accelerated |
| Sound synthesis | Web Audio API | No external dependencies; precise control over generative sound |
| Data fetching | Fetch API with polling | Simple, browser-native; Alplakes returns JSON |
| Deployment | Static HTML on GitHub Pages or Netlify | Free; shareable URL for portfolio and application |

### 1.4 — Design Principles

1. **The lake speaks first.** Every visual and sonic decision is driven by ecological data, not aesthetic preference.
2. **Stress is legible.** When the ecosystem is under stress, the interface should feel uncomfortable — not because we add decorative "alarm" elements, but because the fundamental properties of the UI (legibility, stability, rhythm) degrade.
3. **Calm is earned.** A harmonious interface state is not the default — it is the result of a healthy ecosystem. Beauty becomes conditional on ecological health.
4. **No dashboards.** The interface does not display numbers, charts, or maps. The data is felt, not read.
5. **Transitions matter.** The rate of change — how quickly the interface shifts — is as meaningful as the state itself. A rapid temperature drop should feel abrupt; a slow seasonal shift should feel gradual.

---

## PHASE 2: IMPLEMENTATION

### 2.1 — Prototype Architecture (v1 — Pre-Residency)

The first prototype is a browser-based, single-page application. It should be buildable now, before the residency, as a proof-of-concept. Here's the implementation plan:

**Step 1: Data Connector**
Build a module that fetches from Alplakes and Open-Meteo, normalizes all values, and exposes them as a reactive state object.

```javascript
// Pseudocode for the data layer
const ecoState = {
  waterTemp: 0.0,        // normalized 0-1 (cold to warm)
  tempAnomaly: 0.0,      // deviation from seasonal mean
  currentSpeed: 0.0,     // normalized 0-1
  algaeLevel: 0.0,       // normalized 0-1
  windSpeed: 0.0,        // normalized 0-1
  airQuality: 0.0,       // normalized 0-1 (good to bad)
  stressIndex: 0.0,      // composite weighted metric
  rateOfChange: 0.0      // how fast things are shifting
};
```

**Step 2: CSS Translation Engine**
Map ecoState values to CSS custom properties on the document root. The entire visual system responds via CSS variables.

```css
:root {
  --skin-hue: 200;           /* driven by water temp */
  --skin-saturation: 60%;    /* driven by algae */
  --skin-opacity: 1.0;       /* driven by air quality */
  --skin-blur: 0px;          /* driven by turbidity/anomaly */
  --skin-speed: 4s;          /* driven by current speed */
  --skin-spacing: 0em;       /* driven by temp anomaly */
  --skin-grain: 0;           /* driven by stress index */
}
```

**Step 3: Visual Surface**
The main interface is not a "page" — it is a membrane. It consists of:
- A full-viewport background that shifts color, grain, and opacity
- Floating text elements (poetic ecological observations, not data readouts) whose typography morphs
- A subtle particle/flow animation whose speed and direction follow lake currents
- An optional WebGL layer for more complex visual effects (water-like distortion)

**Step 4: Sound Layer**
Using Web Audio API, create a generative ambient soundscape:
- Base drone: frequency mapped to water temperature
- Oscillation: speed mapped to current patterns
- Filter cutoff: mapped to air quality (clear air → bright sound; hazy → muffled)
- Granular noise: intensity mapped to wind speed
- Dissonance: added when stress index is high

**Step 5: Interaction Model**
The human does not "use" this interface in the conventional sense. They can:
- Hover/touch to feel the lake's current state described in text
- Scroll to move through time (past → present → forecast)
- Toggle between "skin" mode (pure ecological response) and "x-ray" mode (reveals the data driving each visual parameter)

### 2.2 — Development Timeline

**Pre-Residency (Now → September 2027)**
- [x] Define design rules and data mapping
- [ ] Build data connector module (Alplakes + Open-Meteo)
- [ ] Build CSS translation engine
- [ ] Build v1 visual surface (HTML/CSS/JS)
- [ ] Add basic Web Audio sound layer
- [ ] Deploy to GitHub Pages as a shareable link
- [ ] Include link in La Becque application materials

**At La Becque — Month 1 (Weeks 1–4)**
- On-site calibration: compare data to lived observation of the lake
- Refine design rules based on real seasonal conditions
- Expand sound layer using the on-site recording studio (field recordings of the lake, ambient environment)
- Begin documentation: system diagrams, screenshots, recordings

**At La Becque — Month 2 (Weeks 5–8)**
- Build v2 with WebGL layer (water surface distortion, depth effects)
- Add temporal dimension: scroll through 4.5-day forecast
- Cross-disciplinary experiments with fellow residents
- Test non-visual modes: haptic feedback on mobile, spatial audio

**At La Becque — Month 3 (Weeks 9–12)**
- Synthesize design framework into written methodology
- Record video documentation of the prototype across different ecological states
- Prepare open studio presentation
- Draft research publication

### 2.3 — File Structure

```
second-skin/
├── index.html              # Main entry point
├── css/
│   ├── skin.css            # Core responsive visual system
│   └── typography.css      # Morphing type system
├── js/
│   ├── data-connector.js   # Alplakes + Open-Meteo fetcher
│   ├── normalizer.js       # Raw data → 0-1 normalized state
│   ├── translator.js       # Normalized state → CSS variables
│   ├── sound-engine.js     # Web Audio generative soundscape
│   └── app.js              # Orchestrator
├── assets/
│   └── (field recordings, textures added during residency)
└── README.md
```

### 2.4 — Evaluation Criteria

How do we know if this works? The prototype succeeds if:

1. **Ecological legibility:** A person experiencing the interface can sense whether the lake is stressed, calm, or in transition — without reading any numbers.
2. **Behavioral responsiveness:** The interface demonstrably changes when ecological conditions change. Side-by-side comparison of the interface in different states should feel viscerally different.
3. **Non-dashboard quality:** The experience feels embodied and atmospheric, not informational.
4. **Transferability:** The design rules and system architecture could be applied to a different ecosystem (a forest, an ocean, a river) with different data inputs.

---

## APPENDIX: Key References

- Benjamin Bratton, *The Stack: On Software and Planetary Computation* (2016) — planetary-scale computation as infrastructure
- Ian Cheng, *Emissaries* series — autonomous systems that respond to environmental logic
- Tega Brain & Surya Mattu, *Unfit Bits* — questioning who/what sensor data serves
- Natalie Jeremijenko — environmental art + interface design
- Derek Jarman, *Prospect Cottage Garden* — the direct reference for La Becque's garden
- Eawag Alplakes project — the scientific infrastructure underlying the data layer

---

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
