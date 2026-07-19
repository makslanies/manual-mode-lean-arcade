# Deployment Guide — Manual Mode (Chapter 0 + Growth Layer)

Static Vite + React + Canvas app. **No backend server** — shop, org, economy, and persistence run entirely in the browser (IndexedDB v2).

## Architecture

```text
Browser ──► nginx (Docker) ──► dist/ static assets
                │
                └── SPA fallback: index.html for client routes
```

Runtime dependencies in the browser:

| Subsystem | Technology | Notes |
|-----------|------------|-------|
| Game loop / acts 1–3 | Canvas 2D + domain FSM | Unchanged from chapter 0 |
| Shop / HR / org chart | React overlays (`src/ui/shop/`) | Opens over canvas; no remount |
| Growth save | IndexedDB v2 (`growth` store) | Auto-migrates from v1 on first load |
| Demo / QA hooks | `window.__RR` | Build-time gated via `VITE_ENABLE_DEMO_HOOKS` |

## Environment variables

All `VITE_*` variables are **build-time** inputs. Change them, then rebuild the image or run `npm run build` again.

| Variable | Required | Default | Scope | Description |
|----------|----------|---------|-------|-------------|
| `VITE_BASE_URL` | No | `/` | Build | Public path prefix when not served from domain root. |
| `VITE_ENABLE_DEMO_HOOKS` | No | `true` | Build | When `false`, hides `window.__RR` in production builds. **Set `false` for public/kiosk releases.** |
| `VITE_DEFAULT_LOCALE` | No | `ru` (code) | Build | Reserved for future locale switching. Shop labels use `content/shopRu.ts` / `shopEn.ts`. |
| `PORT` | No | `8080` | Compose | Host port for the `web` service. |
| `DEV_PORT` | No | `5173` | Compose | Host port for the `dev` profile. |
| `IMAGE_TAG` | No | `local` | Compose | Tag applied to locally built images. |

Copy `.env.example` to `.env` and adjust values for local compose:

```bash
cp .env.example .env
```

No secrets belong in this frontend. Do not commit `.env`.

## Local development

```bash
npm install
npm run dev          # Vite at http://localhost:5173
npm run build        # output in dist/
npm test             # 143 unit tests (domain, persistence, FSM)
```

Hot-reload dev server in Docker:

```bash
docker compose --profile dev up dev
```

## Production container

Build and run nginx serving the compiled bundle:

```bash
docker compose build web
docker compose up -d web
# open http://localhost:8080
```

Build with a subpath (example: GitHub Pages project site):

```bash
docker build \
  --build-arg VITE_BASE_URL=/manual-mode-lean-arcade/ \
  --build-arg VITE_ENABLE_DEMO_HOOKS=false \
  -t manual-mode-lean-arcade:pages .
docker run --rm -p 8080:8080 manual-mode-lean-arcade:pages
```

Health check endpoint: `GET /healthz` → `ok`.

Expected production bundle (approx.): `index.html` + `assets/*.js` (~275 KB gzip ~88 KB) + `assets/*.css` (~7 KB).

## IndexedDB upgrade path (v0.1 → v0.2)

| Store | Schema | Contents |
|-------|--------|----------|
| `profile` | v1+ | Player profile |
| `runs` | v1+ | Act results history |
| `growth` | **v2 new** | Org, shop progress, event journal, command journal |

On first load after upgrade, `onupgradeneeded` creates the `growth` store automatically. Existing `profile` / `runs` data is preserved.

**Downgrade:** deploying an older image (v0.1) after v0.2 leaves the `growth` store unused; no data loss for chapter-0 saves. Re-upgrading restores growth data if still present.

To reset all local state during QA:

```js
indexedDB.deleteDatabase('manual-mode-arcade')
```

## Demo hooks (`window.__RR`)

Enabled when `VITE_ENABLE_DEMO_HOOKS !== 'false'`.

| Hook | Purpose |
|------|---------|
| `__RR.skipToSupply()` / `skipToRules()` / `skipToEnd()` | Jump act phases |
| `__RR.state()` | Core sim snapshot |
| `__RR.org()` | Growth/org summary (unlocked, upkeep, employees, escalations) |
| `__RR.unlockShop()` | Force shop unlock |
| `__RR.openShop()` | Open shop overlay |
| `__RR.buy(itemId)` | Purchase catalog item |
| `__RR.assign(employeeId, zoneId)` | Assign employee |
| `__RR.penalty()` | Current org chaos penalty aggregate |

## CI/CD

### Pull request / push (`.github/workflows/ci.yml`)

1. `npm ci`
2. `npm run typecheck`
3. `npm run build` (production-like env: `VITE_ENABLE_DEMO_HOOKS=false`)
4. Verify `dist/index.html` and hashed assets exist
5. `npm test` (143 tests)
6. Build Docker image
7. Smoke test: container starts, `/healthz` responds, `/` serves HTML

### Tagged release (`.github/workflows/release.yml`)

Triggered on tags matching `v*.*.*`:

1. Build multi-arch-ready image with Buildx
2. Push to GitHub Container Registry (`ghcr.io/<owner>/<repo>`)
3. Tag with semver and commit SHA
4. Production build args: `VITE_BASE_URL=/`, `VITE_ENABLE_DEMO_HOOKS=false`

Pull a release image:

```bash
docker pull ghcr.io/<owner>/<repo>:0.2.0
docker run --rm -p 8080:8080 ghcr.io/<owner>/<repo>:0.2.0
```

## Static hosting (without Docker)

Any static host works if it serves `dist/` and rewrites unknown paths to `index.html`:

```bash
npm ci
VITE_ENABLE_DEMO_HOOKS=false npm run build
# upload dist/ to S3, Netlify, Cloudflare Pages, etc.
```

Set `VITE_BASE_URL` before building when the site is not at `/`.

Cache strategy: nginx serves `/assets/*` with `Cache-Control: public, immutable` (content-hashed filenames). `index.html` is not long-cached — safe for rolling deploys.

## Browser support

Target browsers: current Chrome, Edge, Firefox, Safari. Requires:

- Canvas 2D
- Web Audio API (user gesture for first sound)
- IndexedDB (v2 schema)
- `structuredClone` (modern evergreen browsers)

## Security notes

- Disable demo hooks in public deployments: `VITE_ENABLE_DEMO_HOOKS=false`.
- nginx adds baseline security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).
- No API keys, tokens, or PII leave the browser — all state is local.
