# Manual Mode — Lean Arcade (Chapter 0)

Playable vertical slice of the educational factory arcade **Manual Mode** (acts 1–3): manual chaos → sensors → automation rules.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
npm test         # unit tests (formulas, FSM, rules)
```

## Stack

- **TypeScript + Vite**
- **HTML5 Canvas 2D** — isometric world, HUD, particles
- **React 19** — title / supply / rules / end overlays
- **Web Audio API** — procedural SFX (init on first gesture)
- **IndexedDB** — run results autosave

## Architecture

```
src/
  core/           FSM, Seed RNG, types, input
  domain/         Simulation (zones, economy, trucks, rules, director)
  render/         Isometric canvas renderer
  ui/             React overlays + hint pill
  audio/          Web Audio synth
  persistence/    IndexedDB
  content/        RU (default) + EN locale stubs
  game/           GameController (loop + wiring)
```

Domain logic is independent of React and Canvas.

## Prototype parity

Timings match `docs/act1-prototype.html`: Act1=130s, Supply=15s, Act2=55s, Rules=20s, Act3=60s.

Open the prototype for side-by-side checks: `docs/act1-prototype.html`

## Demo hook

```js
__RR.skipToSupply()
__RR.skipToRules()
__RR.skipToEnd()
__RR.state()
```

## Code reuse

VOLY reuse flagged **traviso.js** (MIT). Chapter 0 uses custom Canvas aligned with the HTML prototype for behavior parity and a smaller bundle.

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Docker, CI, and environment variables. Pre-release steps: [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md).

```bash
npm run docker:build && npm run docker:up   # nginx on http://localhost:8080
docker compose --profile dev up dev         # Vite dev server in Docker
```
