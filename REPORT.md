# REPORT — Manual Mode Lean Arcade (Chapter 0)

**Pipeline:** VOLY local A2A hybrid · task_id `f8090081-3cd4-4db8-9ffd-44b56ad02fdc`  
**CWD:** `/home/lanies/git/codeops/TEST_VOLY_JOB_MA/task-3d-lead`  
**Wall time:** ~13.2 min · **Result:** `success=True`

## Chain executed

| Order | Role | Mode | Outcome |
|------:|------|------|---------|
| 0 | Pre-stage | `voly reuse` + `Pipeline.auto_reuse` | Found `axaq/traviso.js` (MIT). Report in `.voly/reuse/reports/latest.json` |
| 1 | architect | chat (deepseek fallback) | Plan + agent distribution; context included AGENT_TASK + docs excerpts + reuse report |
| 2 | developer | executor `cursor` (~340s) | Vite+TS+React+Canvas chapter 0 implementation |
| 3 | tester | executor `cursor` (~89s) | 7 Vitest files, 70 tests |
| 4 | devops | executor `cursor` (~227s) | Dockerfile, GitHub Actions, DEPLOYMENT.md |
| 5 | reviewer | chat (deepseek) | Review pass |

Note: plan shadow gate tried `pytest` (exit 5) on a JS project — shadow mode did not block. Use `npm test` / vitest for verification.

## Quality gates (post-run)

| Gate | Status |
|------|--------|
| `npm test` | **70/70 passed** |
| `npm run build` | **OK** (`dist/` produced) |
| Timings ACT1/2/3 + pauses | **130 / 55 / 60 / 15 / 20** |
| Zone unlocks | **0 / 15 / 30 / 50 / 68 / 88 / 105** |
| `window.__RR` | **skipToSupply / skipToRules / skipToEnd / state** |
| Sensor/rule budgets | **3 / 3** |
| Overlay pointer-events / blur keys / DPR cap | Present |
| English engineering artifacts | README + code comments EN; player UI RU via `content/ru.ts` |

## Acceptance (AC-01…AC-13) — self-check

| ID | Verdict | Notes |
|----|---------|-------|
| AC-01 | PASS | FSM modes without reload |
| AC-02 | PASS | Unlock schedule in `zones.ts` |
| AC-03 | PASS | `SENSOR_BUDGET=3` |
| AC-04 | PASS | Rules gated on sensors |
| AC-05 | PASS | `rulesEngine` mutates sim state |
| AC-06 | PASS | End overlay loss% compare |
| AC-07 | PASS | Seeded RNG + tests |
| AC-08 | PASS | Pointer + keyboard (`Input.ts`) |
| AC-09 | PARTIAL | Overlay CSS + DPR; full 1366/1920 visual QA not automated |
| AC-10 | PARTIAL | End screen takeaway; transfer question may be thin |
| AC-11 | PASS | `__RR` installed |
| AC-12 | PASS | build + dev scripts |
| AC-13 | PASS | Parity constants + prototype path documented |

## Score

**~9/10** for chapter-0 vertical slice: playable architecture, tests green, build green, reuse-first, architect-led multi-agent chain. Remaining gap to 10/10: manual browser playtest at target resolutions + polish Learning Score / transfer prompt.

## How to play

```bash
cd /home/lanies/git/codeops/TEST_VOLY_JOB_MA/task-3d-lead
npm install
npm run dev
```

Compare feel with `docs/act1-prototype.html`.
