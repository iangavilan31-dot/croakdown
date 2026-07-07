# GRADES — quality-gate tracking

Honest, externally-verifiable gate status. No self-graded passes. See `design/11 Production/Quality Gates.md`.

---

## Phase 1 — The Swing Test  ·  STATUS: CORE PROVEN, GATE NOT PASSED

*One frog, one stick, the sludge trio, a graybox pond, zero rewards.*

### What is objectively verified ✅
| Criterion | Evidence |
|---|---|
| Architecture clean/modular/data-driven | `src/engine` · `src/sim` (DOM-free, deterministic) · `src/feel` · `src/render` · `src/data` |
| One-event feedback pipeline | `src/sim/events.ts` + `src/feel/feel.ts`; every hit fans out audio+flash+hitstop+knockback+particles+decals in one frame |
| Physics: launch / tumble / bowling / wall-splat / crowd separation | `test/combat.test.mjs` — 5 dedicated physics tests green |
| Frame data: buffer / chain / dash-cancel / tap-light / hold-heavy | 4 state-machine tests green |
| Determinism (netcode-ready) | same seed + inputs → identical worlds (600-tick test) |
| Enemy cap 70 held; no pool leaks | 7200-tick soak test |
| **Perf** | sim **0.01 ms** / render **0.18 ms** (budget 6/8 ms); heap 4.4 MB stable, no GC churn |
| Runs on a visible page, real inputs | `scripts/shoot.mjs`: 28 s run, 31 kills, HP 100→32; `docs/qa/phase1-*.png` |
| Permanence works | blood + bone + gel decals accumulate into a battlefield record (visible in carnage capture) |
| Full headless suite | **23/23 green**, typecheck clean |

### What is NOT yet verified — the actual gate ⏳
1. **Feel is genuinely satisfying.** All numbers in `data/` are first-draft `TUNE`. Needs a hands-on tuning pass: make the stick feel HEAVY, launches delicious, 5 min of reward-free swinging genuinely fun.
2. **3 blind adversarial critics** on captured gameplay clips — median ≥ 7.5 on melee feel vs Hades/Dead Cells at prototype fidelity. NOT run.
3. **Ian plays it** and his first unprompted comment is about feel; he says "again." NOT done.
4. **Melee praise-mining research pass** folded in. NOT done.

**Verdict: the foundation is real and fast; the gate is subjective and owed to Ian + critics. Phase 2 does not start until items 1–4 clear.**

### Known tracked non-blockers
- CDN font (Outfit) → bundle locally by Phase 10. BGM 404s → Phase 8 audio. (Both in seatbelt `BUGS.md`.)

---

## Phase 2 — Slice Gate · not started
## Phase 3 — Content Gate · not started
## Phase 4 — Ship Bar · not started
