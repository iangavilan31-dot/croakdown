# GRADES — quality-gate tracking

Honest, externally-verifiable gate status. No self-graded passes. See `design/11 Production/Quality Gates.md`.

---

## JUDGED QUALITY LOOP (Ian directive: don't stop till avg ≥9.0, no judge <8)

### Round 1 — 2026-07-08 (after art overhaul + combo/font pass)
6-critic panel (4 judges w/ goal+bible, 2 blind). Screenshots: pond/heavy/carnage/motion.

| Critic | Score | Headline |
|---|---|---|
| Judge 1 — Art director | 5.0 | Env premium; enemies off-model spiky neon; hero muddy+small; VFX placeholder |
| Judge 2 — Animation | 5.5 | Frog too small to read anim; enemies stiff; hop touchdown ripple good |
| Judge 3 — Game feel | 5.5 | Enemies camouflage; swing faintest thing on screen; too empty |
| Judge 4 — Creative dir | 6.5 | Env $15-game; hero too small/dark; no combat verb in stills |
| Blind 1 | 4.5 | Frog near-invisible; enemies clip-art; too dark; HUD placeholder |
| Blind 2 | 6.0 | Pretty; frog camouflages into stumps; zero enemy variety; sparse |
| **AVERAGE** | **5.5** | Backgrounds carry it; hero+enemies+combat VFX drag it down |

**Fixes applied this round:** frog 3.0→4.8 + warm hero rim; enemies muted colorize + softer regen + biolum rim + grounding + bigger + stronger waddle/hit-recoil; swing crescent bright + white cut-line; attack telegraph → authored filling danger-zone (was debug ring); density 8→14 start/cap 52/cadence 12→7.
**Still OPEN:** enemy silhouette still spiky (gpt-image-1 refuses round → go PROCEDURAL slime next); re-verify blink/croak/walk at new size; brightness/contrast for thumbnail; HUD pip clarity; enemy variety; capsule frame w/ active slash.

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
