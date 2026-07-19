# Deployment Guide — Manual Mode (Chapter 0)

Static Vite + React + Canvas app. No backend is required for chapter 0.

## Architecture

```text
Browser ──► nginx (Docker) ──► dist/ static assets
                │
                └── SPA fallback: index.html for client routes
```

IndexedDB, Web Audio, and Canvas run entirely in the browser.

## Environment variables

All `VITE_*` variables are **build-time** inputs. Change them, then rebuild the image or run `npm run build` again.

| Variable | Required | Default | Scope | Description |
|----------|----------|---------|-------|-------------|
| `VITE_BASE_URL` | No | `/` | Build | Public path prefix when not served from domain root. |
| `VITE_ENABLE_DEMO_HOOKS` | No | `true` | Build | When `false`, hides `window.__RR` in production builds. |
| `VITE_DEFAULT_LOCALE` | No | `ru` (code) | Build | Reserved for future locale switching. |
| `PORT` | No | `8080` | Compose | Host port for the `web` service. |
| `DEV_PORT` | No | `5173` | Compose | Host port for the `dev` profile. |
| `IMAGE_TAG` | No | `local` | Compose | Tag applied to locally built images. |

Copy `.env.example` to `.env` and adjust values for local compose:

```bash
cp .env.example .env
```

## Local development

```bash
npm install
npm run dev          # Vite at http://localhost:5173
npm run build        # output in dist/
npm test
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

## CI/CD

### Pull request / push (`/.github/workflows/ci.yml`)

1. `npm ci`
2. `npm run build` (with production-like env)
3. `npm test`
4. Build Docker image
5. Smoke test: container starts and `/healthz` responds

### Tagged release (`/.github/workflows/release.yml`)

Triggered on tags matching `v*.*.*`:

1. Build multi-arch-ready image with Buildx
2. Push to GitHub Container Registry (`ghcr.io/<owner>/<repo>`)
3. Tag with semver and commit SHA

Pull a release image:

```bash
docker pull ghcr.io/<owner>/<repo>:1.0.0
docker run --rm -p 8080:8080 ghcr.io/<owner>/<repo>:1.0.0
```

## Static hosting (without Docker)

Any static host works if it serves `dist/` and rewrites unknown paths to `index.html`:

```bash
npm ci
npm run build
# upload dist/ to S3, Netlify, Cloudflare Pages, etc.
```

Set `VITE_BASE_URL` before building when the site is not at `/`.

## Browser support

Target browsers from GDD §17: current Chrome, Edge, Firefox, Safari. Requires:

- Canvas 2D
- Web Audio API (user gesture for first sound)
- IndexedDB

## Security notes

- Disable demo hooks in public deployments: `VITE_ENABLE_DEMO_HOOKS=false`.
- nginx adds baseline security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).
- No secrets belong in this frontend; do not commit `.env`.
