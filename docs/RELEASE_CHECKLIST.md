# Release Checklist — Manual Mode v0.2 (Chapter 0 + Growth Layer)

Use this list before tagging `vX.Y.Z` or publishing a production build.

## 1. Pre-release verification

- [ ] Branch is up to date with `main` / `master`
- [ ] `npm ci && npm run typecheck && npm run build && npm test` pass locally (143 tests)
- [ ] CI workflow green on the release commit (build, test, Docker smoke)
- [ ] Version bumped in `package.json` (target: `0.2.0` for growth-layer release)
- [ ] Release notes drafted (chapter-0 regression + shop/org features)

## 2. Chapter 0 regression (AC-01 … AC-13)

- [ ] Full run: title → act 1 → supply → act 2 → rules → act 3 → results → PLAY AGAIN
- [ ] No overlay click-through; keyboard + mouse both work
- [ ] Layout OK at 1366×768 and 1920×1080
- [ ] Timings match prototype: 130 / 15 / 55 / 20 / 60 s
- [ ] Sensor budget = 3, rule budget = 3; auto-mount / auto-start on pause timeout
- [ ] Same seed reproduces same outcome (determinism spot check)
- [ ] `window.__RR.state()` accurate when demo hooks enabled

## 3. Growth layer acceptance (AC-01 … AC-12)

- [ ] **AC-01** Shop shows ≥6 categories; blocked items show prerequisite reason
- [ ] **AC-02** Hire worker/specialist; assign to zone/brigade
- [ ] **AC-03** Oversized unmanaged brigade applies measurable chaos penalty
- [ ] **AC-04** Manager auto-assigns routine tasks within authority
- [ ] **AC-05** Hero receives escalations only when structure is working
- [ ] **AC-09** Purchases raise bonus income AND recurring upkeep (forecast visible in shop)
- [ ] **AC-10** IndexedDB v2: refresh page mid-session → org/shop state restored
- [ ] **AC-11** Event journal records hire / buy / assign / escalate actions
- [ ] **AC-12** Same seed + command sequence → identical org state after reload
- [ ] Shop unlocks after Act 1 (+1200₽ tutorial bonus)
- [ ] First-run tutorial steps 1–5 complete without blocking gameplay
- [ ] Shop overlay opens/closes without canvas remount or audio glitch

Optional (SHOULD — verify if delivered):

- [ ] **AC-06** Sector unlock purchasable and buildable
- [ ] **AC-07** Structure activation gated on staff/road/energy
- [ ] **AC-08** Road upgrade changes trip time

## 4. Build configuration

- [ ] `VITE_BASE_URL` matches hosting path (`/` or subpath)
- [ ] `VITE_ENABLE_DEMO_HOOKS=false` for public / kiosk releases
- [ ] No `.env` or secrets in the build context (`.dockerignore` excludes them)
- [ ] `dist/` loads without console errors in target browsers
- [ ] Production bundle serves from `/assets/` with hashed filenames

## 5. Container / hosting smoke test

```bash
docker compose build web && docker compose up -d web
curl -f http://localhost:8080/healthz    # → ok
curl -f http://localhost:8080/ | head      # → HTML with root div
```

- [ ] Game loads at `/`; JS/CSS assets return 200
- [ ] Hard refresh and deep links fall back to `index.html` (SPA routing)
- [ ] Finish Act 1 in container build → shop button appears
- [ ] IndexedDB migration: load v0.2 over existing v0.1 profile without crash

## 6. Tag and publish

```bash
git tag -a v0.2.0 -m "Manual Mode v0.2 — shop, org, growth persistence"
git push origin v0.2.0
```

- [ ] GitHub **Release** workflow completes (`.github/workflows/release.yml`)
- [ ] Image available at `ghcr.io/<owner>/<repo>:0.2.0`
- [ ] Release notes attached to the GitHub Release

## 7. Post-release

- [ ] Deploy updated image / static bundle to staging, then production
- [ ] Verify audio init on first click/tap in production URL
- [ ] Verify IndexedDB autosave: org state survives refresh after shop purchases
- [ ] Verify demo hooks absent when `VITE_ENABLE_DEMO_HOOKS=false`
- [ ] Monitor error logs / uptime for 24 h
- [ ] Rollback plan documented (previous image tag or prior `dist/` artifact)

## Rollback

```bash
# Docker — revert to chapter-0-only build
docker pull ghcr.io/<owner>/<repo>:0.1.0
docker run --rm -p 8080:8080 ghcr.io/<owner>/<repo>:0.1.0

# Static host: redeploy previous dist/ artifact from CI artifacts or backup
```

IndexedDB v2 `growth` store is ignored by v0.1 builds; chapter-0 saves remain intact.

## Contacts / ownership

| Area | Owner |
|------|-------|
| Gameplay / AC | QA / reviewer |
| Frontend build | Developer |
| Docker / CI | DevOps |
| Production hosting | Platform team |
