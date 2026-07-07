# BRIEF.md — CROAKDOWN autonomous build brief
_Compiled 2026-07-07 by /gyat (research-fed, skeptic-gated). Goal-lock confirmed by Ian._

## 1. GOAL / NON-GOALS / DONE-BAR

**GOAL** — a co-op game with *real* production value (art + music that don't feel AI-slop)
fusing Brotato's feel with tower-defense brains in a swampy-mystic frog world — a game Ian
would genuinely play with a friend and be proud to show.

**NON-GOALS** — 3D Genshin/GTA scope · Rift Warden salvage · text-heavy game · self-graded
scores · online netcode in v1 (design online-ready, build shared-screen).

**DONE-BAR** — 2P shared-screen co-op run end-to-end (keyboard + DualSense/USB) · 20+ waves ·
3+ bosses · gpt-image-1 art pass · real soundtrack · 3 blind adversarial critics **≥ 8.5/10**
against the MUST-BEAT bar in `GYAT.md`. Under the bar = doesn't ship.

**If any instruction below conflicts with the GOAL, the GOAL wins. Re-read the GOAL before
every major decision.**

## 2. House identity (non-negotiable)
UI chrome (menus, shop, cards): chunky Outfit-style type, but the chrome lives IN the painted
night-swamp per docs/VISUAL_BAR.md (the newer, harder gate): dark swamp-glass panels
(deep green-black translucent), cream text on dark, warm gold accents, hot pink reserved for
danger. The old white-frosted/ink-on-light chrome scored 2-3/10 on the VISUAL_BAR cohesion
axis (2026-07-07 verdicts) and was retired. **BANNED (rejected 3×):** neon cyan holo HUD, scanlines,
mono microtype, cursive gold slop, generic AI-template feel. In-game world palette is its own:
swamp-mystic — deep greens, bog purples, black water, glowing spore teal/amber. Spider-punk
collage/halftone energy lives in EXACTLY ONE place: boss intro cards.

## 3. Ian's taste
Visual-first: bosses, animation, spectacle, juice. He hates games you have to read.
Title + one short tag max per surface; animated art carries meaning. Damage numbers OFF by
default (toggle exists). Information lives in the world: position, silhouette, color, motion,
music. Text only in opt-in hover or hard-pause surfaces (research cross-cutting law).

## 4. Autonomy contract
Work continuously; never idle. If blocked: mock, scaffold, QA, polish, continue. Decide
everything — no questions mid-run. Commit at every working state. Log real decisions to
`DECISIONS.md`, bugs to `BUGS.md` (seatbelt folder) as they happen, not after. Delegate
repetitive precise edits → `cheap-worker`; long logs → `log-triage`.

## 5. Self-QA loop
Screenshot/record your own work repeatedly and actually look at it. Real clicks only — never
`dispatchEvent`. Canvas/WebGL freezes in hidden preview tabs: capture with a **visible
Playwright page** (Rift Warden pattern: `scripts/shoot.mjs` reusing the running :5126 server).
Headless logic tests for systems (wave math, economy, co-op state). Quality-critical → 3 blind
adversarial critic passes → `docs/GRADES.md`, honest verdict vs the 8.5/10 gate. No deploy
under the gate. Gamepad path: code to MDN "standard" mapping (Chrome-first, `mapping ===
"standard"` check, in-game remap fallback); physical DualSense verify is Ian's — flag it in
the final report, don't fake it.

## 6. Session durability
Maintain `SESSION_START.md` + `GYAT.md` at repo root. Seatbelt warns → `/project-safe-reset`,
then continue. Update `PROJECTS.md` status + vault entity page at milestones. Bare `git` in
PowerShell is broken — use Bash tool or `"C:\Program Files\Git\cmd\git.exe"`.

## 7. THE BUILD SPEC

### 7.0 Stack (locked)
- **Raw Canvas 2D + TypeScript + Vite. No game engine.** Rationale: Ian's two best-feeling
  games (LUMEN, NOX) are house-pattern canvas games; full control of the juice pipeline; no
  Phaser text-object/perf traps; research confirms engine benchmarks only matter above our
  scale. Port **5126** strict. Chrome-first.
- Perf laws (research-verified): pool everything, zero per-frame allocation in the hot loop,
  spatial-hash targeting, live-enemy cap ~120 with INVISIBLE overflow despawn (Brotato's
  trick), pre-rendered sprite atlases, static arena on its own layer/canvas, particle budget
  pooled + capped, no DOM text in the loop (canvas-drawn or bitmap text only).

### 7.1 Fantasy & core loop
You are a **frog warden** defending the **Heartbloom** (great glowing lotus at arena center)
in a mystic swamp. Embodied TD:
- **Fight** (Brotato feel): auto-attack tongue/spit at nearest enemy, WASD/stick move,
  dash-hop with i-frames on a short cooldown. Player damage is the scalpel.
- **Build** (BTD6 brain): living towers grow ONLY at fixed **root nodes** baked into the
  arena (stumps/lily pads). Walk to a node, HOLD the build button: spores fly from your
  essence wallet into the plant one pip at a time; release early → spores fly back
  (Thronefall diegetic purchase, feat #1). No placement menus, ever. Tower CHOICE is
  pre-committed in the shop (loadout of plantable species); at the node you only pick from
  your loadout via a 1-step radial (≤1s decision).
- **Attune** (PJM dance homage): stand in a tower's circle and channel to upgrade it — the
  frog croaks a chorus, the plant blooms a tier. The body pays for the economy: essence
  never auto-collects beyond a small magnet radius.
- **Master dial** (research): most enemies path to the Heartbloom; hunter types aggro frogs;
  leech types eat towers. Both halves stay essential — towers = throughput (~60-70% late),
  frog = exceptions (leaks, armor, emergencies).
- **Symbiosis glue**: kills combining tower + frog damage within a beat pay bonus essence
  (OMD combo pattern) — shown as a golden spore burst, not text.
- Lose = Heartbloom destroyed OR all frogs down. Survive the wave's spawns = wave cleared.

### 7.2 Waves, economy, pacing (numbers locked from research)
- **20 waves.** Spawn-budget duration ≈ 25s + 5s/wave, capped 70s (waves 10–19), wave 20
  finale ≈ 100s. Wave ends when its spawns are dead.
- **Build phase between EVERY wave, untimed.** Next wave starts when all living frogs sit on
  the Heartbloom pad (diegetic ready-check, zero UI). During build phase: glowing eyes +
  omen glyphs at the spawn mouths show next wave's composition (feat #2, world-space
  forecast); light/music shift dusk→night as the wave starts (feat #3, no banners).
- **One currency: essence** = XP and gold (Brotato materials trick). Drop rate decays
  ~1.5%/wave to a 50% floor. Level-ups grant a 3-card stat pick (hard-paused).
- **Shop** (hard-paused, after every wave): Brotato one-glance grammar — 4 cards, icon +
  tier color (white/blue/purple/amber) + price + green/red deltas; lock toggle; reroll
  `⌊W×0.75⌋` then `+⌊0.4×W⌋`. Tier gates at shops 2/4/8; shops 1–2 are training wheels.
  Co-op: split into per-player panels, ONE shared wallet, alternating first-pick on rares.
  Shop sells: tower species (loadout), frog weapons/mutations, items.
- **Weirdness schedule** (the law: stronger ≠ weirder): new rule-breaker at waves 3/6/9/13/16 —
  spitter (ranged) → shellback (armored, flank/tongue-grab) → broodmother (spawner) →
  dragonfly swarm (fast) → rot-leech (tower-eater). Linear stat ramp per wave; **speed never
  scales**.
- **Bosses:** mini-boss wave 8; elite waves 11/14/17; **BOG BOSSES at 10, 15, 20**:
  1. **DROWNED STAG** (w10) — antlered sunken elk, charges + summons drowned fawns
  2. **MOTHER OF MOTHS** (w15) — dust clouds that occlude vision, moth swarms, light-lure
  3. **THE ROTTING KING** (w20, finale) — the swamp itself rises; multi-phase, arena
     world-state changes per phase (water level, fog, root nodes corrupted)
  Boss ritual (locked): freeze-frame **spider-punk collage intro card** (name + one tag),
  skull-notched phase-telegraph HP bar (feat #8), phase mutation at HP% OR elapsed time
  (Brotato Rhino pattern), soft DPS floor so no boss dies in <45s, spawn telegraphs (ground
  glyph ≈1s — measure what feels right) for all adds, world reacts per phase.
- **Reward ceremony** (feat #4): boss kill → **the Great Lotus opens** — full pause, petals
  unfurl one by one, slot-machine item reveal, essence counter ticks, music surge. Make this
  the single most-polished moment in the game.
- **Difficulty dial:** DANGER 0–3 pips at run start (+12/26/40% HP/dmg steps + extra elite
  waves + twin-finale at max — Brotato danger pattern).

### 7.3 Co-op (2P shared-screen, the research spec)
- **Camera:** single fixed arena sized to viewport (TowerFall pattern) + juice-only
  shake/zoom. Never leash, never split mid-combat.
- **Input:** P1 = WASD + Space(dash) + E/hold(build/attune); P2 = DualSense over USB
  (standard mapping) with Arrows+Enter keyboard fallback. Gamepad poll per rAF; gesture
  gate handled on the join screen ("press any button").
- **Join:** drop-in at menu (hold button). Two distinct frog silhouettes + team-color rim
  outlines (P1 amber / P2 spore-teal).
- **Economy:** one shared essence wallet. Scarcity roles: solo frog can attune all towers;
  in co-op each tower binds to the frog that grew it (only its grower attunes it) — roles
  emerge by choice, never assignment.
- **Death:** downed frog = bleed-out ghost; partner revives via 2.5s stand-near channel
  (vulnerable); un-revived frogs return at next wave start at 50% HP; run ends on double-KO
  or Heartbloom death. Enemy scaling drops toward solo values while one frog is down.
- **Scaling:** tune for 2P baseline; solo gets −25–30% enemy HP/count (Robot Entertainment
  law).

### 7.4 Juice stack (locked numbers)
1. HIT: white hit-flash 0.1s + hitstop `floor(dmg-scaled)` 3–4 frames normal / 8–12 heavy,
   victim-SPRITE shakes during freeze (hurtbox static, Sakurai), small knockback.
2. KILL: up to 0.2s hitstop + shake on kills/explosions only; **permanence** — bones, torn
   lilies, scorched water decals persist (cap ~200, oldest fade); essence magnet pull;
   invisible despawn at the 120 cap.
3. ATTACK FEEL: chunky projectiles, muzzle/tongue flash, slight recoil hop, bass-layered
   round-robin SFX (3+ variants, ±5–8% pitch), mix DUCKS for a beat on explosions/boss hits.
4. CAMERA: fixed arena + trauma-based shake (slider) + micro zoom-pulse on boss phases.
5. All spectacle must stay READABLE (feat #5): silhouette-first enemy design, palette
   discipline (enemies cool/dark, players+essence warm/glowing), VFX layer cap by design.

### 7.5 Art (gpt-image-1 pass — proven GEEKED pipeline) — PIVOTED 2026-07-07 (Ian's correction)
**Art is a MAIN COMPONENT of this game.** Direction: high-quality **pixel art**, dungeon-swamp,
smoky/hazy atmosphere, NOT kid-friendly. Enemies are grotesque (extra eyes bursting from heads,
dripping flesh, wrong anatomy — cool-disgusting, not cartoon-cute). Weapons look COOL and heavy.
Frogs = charismatic but gritty warriors, not mascots.
- `tools/gen_art.py` (needs `OPENAI_API_KEY`, budget ~$2–4). Style-lock prefix for EVERY asset:
  "detailed high-quality 2D pixel art game sprite, dark dungeon-swamp fantasy, smoky haze,
  grimy texture, deep green + bog purple + acid teal + amber ember palette, readable chunky
  silhouette, subtle rim light, transparent background" — plus per-class grotesque/gritty modifiers.
- Asset list: 2 frog heroes (multi-pose), ~10 enemies + 3 bosses (+ boss collage intro
  cards in spider-punk style), 6 tower species × 3 growth tiers, Heartbloom (states),
  arena backdrop + props, ~30 item icons, title art.
- Build with PIL placeholders FIRST so the game is never blocked on art; swap via manifest.
  Sprite atlas + trim. Verify every generated sprite visually (grid contact sheet).

### 7.6 Audio (real soundtrack, not procedural-only)
- BGM: generate swamp-mystic tracks via the hyperframes-media audio engine (local
  MusicGen/Lyria path — keyless) — menu theme, build-phase (calm, froggy, mystic), wave
  combat (driving), boss themes (3), Great Lotus ceremony stinger. Event stingers, not
  vertical stems (genre convention). Drop-in folder `public/audio/bgm/` so Ian can replace
  with FL Studio exports later.
- SFX: layered (transient + body + bass boom), round-robin variants; Web Audio graph with a
  duck bus. **Never measure media via bash pipes (RTK gotcha) — python scripts only.**

### 7.7 Presentation shell
- Title screen: painted swamp vista, Heartbloom glowing, title + "hop in" — menu→run <30s
  (feat #7): frog pick (picture grid) → danger pips → go. House-identity chrome.
- In-run HUD ≤5 elements: frog HP pips, essence count, wave pip-track, Heartbloom heart,
  (co-op: partner pips). No text labels.
- Shop/level-up = the ONLY text-dense surfaces, always hard-paused (Brotato law).
- Contextual panels slide in on the side OPPOSITE the selected object (feat #9).

### 7.5b Greatsword + gore (Ian's correction, 2026-07-07)
- Third frog hero: **RIBBIT THE RED** — drags a greatsword bigger than his body; slow heavy
  arc slashes hit everything in the crescent; kills GUSH blood (particle burst + red stain
  permanence decals). Screen should feel visceral on every swing connect.
- Blood system: melee kills spray directional blood; blood stains join the permanence decal
  set (the arena becomes a battlefield record). All kills bleed a little; heavy kills bleed a lot.

### 7.5c Secrets + gimmicks (Ian's correction)
- The game hides things. v1 secrets (small, real): (1) a golden fly that rarely crosses the
  arena — tongue it for a burst of essence + a secret stat; (2) attune-dancing on an empty
  root node for 6s grows a free wild mushroom (PJM dance homage as a discoverable); (3) a
  hidden 4th danger pip that only appears after hovering the 3rd for 5s (skull cracks open).
  More from the praise-mining research as they fit.

### 7.5d Praise-mining law
A researcher mined 2023-2026 Reddit/Steam/forums for beloved small details in this genre
(~50 receipts). Incorporate every one that fits; this thinking style applies to all future
decisions on this project — steal what real players demonstrably love.

### 7.8 Build order (commit each stage green)
1. Core sim: loop, pools, spatial hash, input (kbd+pad), fixed arena render
2. Frog feel: move/dash/auto-attack vs dummy swarm — juice stack items 1–4 IN from day one
3. Towers: root nodes, diegetic grow/attune, 3 species, targeting
4. Waves/economy: director, weirdness schedule, essence, level-ups, shop
5. Co-op: P2 input, shared wallet, revive, scaling
6. Bosses ×3 + elite waves + Great Lotus ceremony
7. Art pass (gen + wire + contact-sheet verify) → Audio pass → polish
8. QA loops: headless sim tests + visible-Playwright screenshots + 3 blind critics →
   `docs/GRADES.md`

### 7.9 Headless-first testing
Wave math, economy formulas, co-op state machine, boss phase logic = pure TS modules with a
`npm test` runner (no canvas). The Sprout lesson: wiring tests catch boot-crash bugs.
