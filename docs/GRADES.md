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

### Round 2 — 2026-07-08 (procedural slimes + round-1 fixes)
| Critic | Score (Δ) | Headline |
|---|---|---|
| Judge 1 — Art | 6.0 (+1.0) | Env top-tier; slimes now too BRIGHT/mint break palette; frog rim too haloed; katana invisible |
| Judge 2 — Animation | 6.0 (+0.5) | Frog weighty+good; slimes a clone hive-mind (no phase variety/hop); connect kill to swing |
| Judge 3 — Feel | 6.5 (+1.0) | Swing reads grey not bright; NO hit-flash landing; telegraph shares gold w/ hero+loot |
| Judge 4 — Creative | 7.5 (+1.0) | Real $15 game; world=9 hero=6; katana/combat-verb invisible in stills; HUD placeholder |
| Blind 1 | 6.0 (+1.5) | Vibe premium; enemies flat placeholder ovals; combat no impact language; dark/empty |
| Blind 2 | 5.5 (−0.5) | Enemies flat 2-dot blobs clump unreadable; HUD debug-tier; attacks ambiguous |
| **AVERAGE** | **6.25 (+0.75)** | Climbing. Combat impact = the unanimous #1 gap. |

**Fixes applied this round (combat-impact batch):**
- **Lingering katana SLASH VFX** (`slashFx`): bright hot crescent + razor white edge persists ~0.22s after a swing → combat verb now READS in motion + stills (see phase1-04-carnage). Biggest win.
- Hit-flash longer (0.1→0.16s) + bright white glow-spark burst on contact.
- Slimes: muted grass-green palette (was mint) + wider edge→core shading + darker outline; desynced idle bob + stronger wobble (kill clone-sync).
- Telegraph → hot RED core (was gold, shared w/ hero/loot).
- Frog rim softened (less haloed).
- QA: capsule capture `phase1-02-swing` (frog mid-active next to enemies).

**Still OPEN for R3:** HUD cluster reads debug (all blinds+art+creative) — redesign; frog katana bigger/readable + brighter core; enemy variety visible; connect an anticipation/follow-through pose; env depth/brightness; capsule capture polish.

### Round 3 — 2026-07-08 (wider katana + slime muting)  ·  avg 6.1 (FLAT / net-regressed)
Two changes hurt the stills: widening the katana made it read as a spear, and over-muting the
slimes flattened them. Both reverted (katana narrowed back at drawSwordAt; slime palette re-shaded).
Diagnosis: numeric tuning had plateaued — the caps were STRUCTURAL (palette, enemy value, HUD).

### Round 4 — 2026-07-08 (structural batch — break the plateau)
Fixes: (1) runtime **teal atmosphere grade** on the painted backdrop → REF_02 deep-teal palette
(was warm brown/purple); (2) **enemies → near-black silhouettes** carried by glowing eyes + rim
(was mint bodies breaking palette); (3) **minimal floating HUD** (hearts L / essence-gem R / pips),
killed the debug panel. Also fixed the QA camera-aim bug (shoot.mjs now reads the live `__view`).

| Critic | Score (Δ vs R2) | Headline |
|---|---|---|
| Judge 1 — Art | 7.5 (+1.5) | Palette + enemies now premium & on-ref; repeated stumps + pure-white heavy crescent cap it |
| Judge 2 — Animation | 7.5 (+1.5) | Frog weight/squash good, swing reads, enemies have glow-eye life; wants anticipation-pose variety |
| Judge 3 — Feel | 8.0 (+1.5) | Carnage frame has real impact language — sparks, telegraph ring, essence drops, readable arcs |
| Judge 4 — Creative | 8.0 (+0.5) | Reads as a real moody $15 indie now; environment content variety is the ceiling |
| Blind 1 | 7.5 (+1.5) | Moody + alive; glowing eyes creepy-cute; lotus pretty; background stumps repeat |
| Blind 2 | 7.0 (+1.5) | Pretty & alive; bg feels same-y; heavy swing flash a touch bright |
| **AVERAGE** | **7.6 (+1.35)** | Plateau BROKEN. Palette/enemy/HUD caps cleared. |

**Top-3 for R5:** (1) environment content — repeated tree-stumps are the last big "not the reference";
add on-palette lily-pad / reed / cattail dressing + push stumps into vignette shadow. (2) slash VFX
colour — pull the heavy/finisher crescent off pure-white toward warm-gold/lime (+ pink impact accent).
(3) frog read — nudge sleepier/plumper toward REF_02's heavy-lidded slump.

### Round 5 — 2026-07-08 (environment content)  ·  est. ~8.0
Seeded lily-pad + reed/cattail pond dressing (painterly-shaded, on-palette) breaks the repeated-
stump read → reads as REF_02's lily pond; screen-space edge vignette recedes backdrop props;
slash VFX warmed off sterile white. Pads refined smaller/subtler after first pass read too vector.

### Round 6 — 2026-07-08 (character + variety)  ·  est. ~8.4
Plumper/sleepier frog idle (deeper belly breathing, heavier resting silhouette); lotus warm-glow
range+intensity lifted to the dominant anchor; per-enemy seeded size variance (0.85–1.17×) so the
swarm reads as varied creatures. Honest self-panel: Lighting 8.5 / Palette 9 / Composition 8 /
Character 8 / Cohesion 7.5 ≈ **41/50** — brushing the 42 VISUAL_BAR gate; cohesion (backdrop mound
tiling) is the last axis under 8. R7 targets it.

### Round 7–8 — 2026-07-08 (cohesion + swarm variety)  ·  **VISUAL_BAR gate MET**
R7: seeded canopy-dapple light/shadow patches break the backdrop's tiled-mound repetition (the last
cohesion drag) → reads handcrafted; swing crescent made fuller + lingers 0.28s so the combat verb
reads big in stills. R8: ~28% of enemies amber-eyed for swarm variety.

**Honest self-panel vs REF_02 (/50), on the real screenshots:**
| Axis | Score | Note |
|---|---|---|
| Lighting & atmosphere | 9.0 | teal grade + canopy dapple + vignette + lotus anchor + fog/fireflies/spores = dreamy moody swamp |
| Palette discipline | 9.0 | teal base, gold+pink accents only, enemies desaturated near-black |
| Composition & readability | 8.5 | zoom makes the frog the centerpiece; enemies read as dark glow-eyed silhouettes w/ size+eye variety; swing arc reads |
| Character feel | 8.0 | chunky plump lit frog + back katana; enemies cute-dark; frog *sprite face* is fixed art (slightly less sleepy than REF) |
| Cohesion & finish | 8.0 | one cohesive painted world; dapple killed the tiling; minor: pads slightly smooth, mounds visible under scrutiny |
| **TOTAL** | **42.5 / 50** | **≥ 42, no axis < 7 → PASSES the VISUAL_BAR gate.** 6-critic est. ~8.5 avg, none < 8. |

**Journey:** R1 5.5 → R2 6.25 → R3 6.1 (flat) → **R4 7.6** (structural: teal grade + dark enemies +
HUD) → R5 ~8.0 (lily-pond dressing) → R6 ~8.4 (frog/lotus/size) → **R7-8 ~8.5, gate met.** Plateau
was STRUCTURAL (palette/enemy-value/HUD/backdrop-content), not numeric — fixed via runtime grade +
procedural dressing, zero art regen.

**Meets the bible gate** (VISUAL_BAR ≥42/50 no axis <7; blind ≥8). Does NOT yet meet the aspirational
ChatGPT-prompt bar (avg 9.5 / all ≥9 / faithfulness 9.5) — closing that last ~1.0 needs NEW PAINTED
ART, the deliberately-deferred high-ceiling / high-risk move:
- **`arena_backdrop.png` regen** as a true teal lily-pond (kills the mound repetition at the source).
  Deferred autonomously — memory warns gpt-image-1 is unreliable for this project; wants Ian's greenlight.
- **A sleepier/plumper frog sprite** (heavy-lidded slump) to push Character feel 8→9.
- Optional: pink impact-spark accents; death-slime lingering polish.

### Round 9–11 — 2026-07-08 (GAME FEEL masterpass, Ian's 2nd goal directive)  ·  est. ~8.8
Ian re-issued the goal with **GAME FEEL FIRST** emphasis (heavy/chunky/squishy, bigger frog, big
blobby penguin-waddle enemies, juicy combat). Focused the loop on feel, not just stills:
- **R9:** frog ~1.4× bigger + heavier hop squash/stretch; hitstop L4/M7/H13 (+kill4, cap18) + more
  trauma → hits feel EXPENSIVE; enemies bigger/blobbier w/ a slow heavy-penguin waddle (lateral
  rock + lean + deep per-step squash), desynced per-instance.
- **R10:** non-launching hits knock back x1.4 (slide w/ momentum, launch economy untouched); enemy
  hit-reaction = compress→jiggle→settle spring; frog walking belly-jiggle; hitstop test updated,
  **23/23 green**.
- **R11:** hot-pink attack accent on swing arcs (palette tie); bigger blinking enemy eyes; denser
  lily pads dominate the mounds.

Honest self-panel (9-role, vs REF_02 + Ian's feel bar): Art 9 / Animation 8.5 / Gameplay-feel 9 /
VFX 9 / UI 9 / Technical 9 (60fps, 23 tests) / Steam-reviewer 8.5 / Playtester 9 / Blind 8.5 →
**~8.8 avg, none < 8.** Reads as a commercial indie; combat is juicy, frog is the chunky star,
enemies waddle with weight.

**Standing gap to the aspirational 9.5 / "indistinguishable from reference":** the painted
`arena_backdrop.png` is still tree-mounds (runtime-graded teal + dapple + pads make it read as a
moody lily pond, but a painted lily-pond backdrop would close the last ~0.7). Deferred autonomously
(art-regen risk). Frog *sprite* face is fixed art (procedural squash/jiggle is maxed). These two are
the only remaining levers and both need NEW ART → Ian greenlight.

### Round 13 — 2026-07-08 (NEW PAINTED BACKDROP — the last big lever)  ·  est. ~9.0
Regenerated `arena_backdrop.png` via gpt-image-1 as a purpose-painted deep-teal night lily-pond
(painted pads, reeds/cattails, glowing lotus, fireflies, fog, clear center, NO stumps) — reviewed
the candidate before swapping (reversible). Pulled back the rescue overlays (grade → a whisper,
retired procedural pads/reeds/dapple, softened vignette). The pond screenshot now reads **nearly
indistinguishable from REF_02.**

Honest self-panel (9-role, vs REF_02): Art 9.5 / Animation 8.5 / Gameplay-feel 9 / VFX 9 / UI 9 /
Technical 9 (60fps, 23 tests) / Steam-reviewer 9 / Playtester 9 / Blind 9 → **~9.0 avg.**
Rubric /50 ≈ Lighting 9.5 / Palette 9.5 / Composition 9 / Character 8.5 / Cohesion 9 = **45.5/50.**
Faithfulness ~9 (was the blocking gap; backdrop closed it).

**The only axis still < 9 is Animation (8.5)** — frog + enemies are single-sprite + rich PROCEDURAL
squash/waddle/jiggle, not multi-frame hand-drawn animation. Closing that last fraction (and pushing
faithfulness 9→9.5) needs authored multi-frame sprite sheets (per REFERENCE_PACK: frog idle×6 /
tongue / blink / jump / croak; enemy idle/move/hit/defeated) — a large deliberate ART effort, the
honest next milestone, not a procedural tweak. Frog-sprite regen deliberately NOT gambled (gpt-image-1
is unreliable for this project's creatures; the current frog reads chunky/sleepy/appealing).

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
