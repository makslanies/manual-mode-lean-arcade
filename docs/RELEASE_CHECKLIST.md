# Release Checklist — Manual Mode Chapter 0

Use this list before tagging `vX.Y.Z` or publishing a production build.

## 1. Pre-release verification

- [ ] Branch is up to date with `main` / `master`
- [ ] `npm ci && npm run build && npm test` pass locally
- [ ] CI workflow green on the release commit
- [ ] Version bumped in `package.json` if publishing npm artifacts (optional for static-only deploys)
- [ ] `CHANGELOG` or release notes drafted (what changed since last tag)

## 2. Gameplay acceptance (AC-01 … AC-13)

- [ ] Full run: title → act 1 → supply → act 2 → rules → act 3 → results → PLAY AGAIN
- [ ] No overlay click-through; keyboard + mouse both work
- [ ] Layout OK at 1366×768 and 1920×1080 (§5.3)
- [ ] Timings match prototype: 130 / 15 / 55 / 20 / 60 s
- [ ] Sensor budget = 3, rule budget = 3; auto-mount / auto-start on pause timeout
- [ ] Same seed reproduces same outcome (determinism spot check)
- [ ] `window.__RR.state()` accurate when demo hooks enabled

## 3. Build configuration

- [ ] `VITE_BASE_URL` matches hosting path (`/` or subpath)
- [ ] `VITE_ENABLE_DEMO_HOOKS=false` for public / kiosk releases
- [ ] No `.env` or secrets in the build context
- [ ] `dist/` loads without console errors in target browsers

## 4. Container / hosting smoke test

- [ ] `docker compose build web && docker compose up -d web`
- [ ] `curl -f http://localhost:8080/healthz` returns `ok`
- [ ] Game loads at `/`; assets load from `/assets/`
- [ ] Hard refresh and deep links fall back to `index.html` (SPA routing)

## 5. Tag and publish

```bash
git tag -a v0.1.0 -m "Manual Mode chapter 0 — initial release"
git push origin v0.1.0
```

- [ ] GitHub **Release** workflow completes (`.github/workflows/release.yml`)
- [ ] Image available at `ghcr.io/<owner>/<repo>:<version>`
- [ ] Release notes attached to the GitHub Release

## 6. Post-release

- [ ] Deploy updated image / static bundle to staging, then production
- [ ] Verify audio init on first click/tap in production URL
- [ ] Verify IndexedDB autosave on results screen
- [ ] Monitor error logs / uptime for 24 h
- [ ] Rollback plan documented (previous image tag or prior `dist/` artifact)

## Rollback

```bash
# Docker
docker pull ghcr.io/<owner>/<repo>:<previous-version>
docker run --rm -p 8080:8080 ghcr.io/<owner>/<repo>:<previous-version>

# Static host: redeploy previous dist/ artifact from CI artifacts or backup
```

## Contacts / ownership

| Area | Owner |
|------|-------|
| Gameplay / AC | QA / reviewer |
| Frontend build | Developer |
| Docker / CI | DevOps |
| Production hosting | Platform team |
