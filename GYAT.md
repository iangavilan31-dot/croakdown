# GYAT.md — CROAKDOWN front door

One place for everything. Never repeat any of this elsewhere — link to it.

> ## ⚠ PIVOT (2026-07-07 eve, re-confirmed with the master directive): TOWERS ARE DEAD.
> CROAKDOWN is a **premium 2P co-op MELEE horde survivor**. Authority chain now:
> Ian live > `docs/VISION.md` (verbatim pivot intent) > **`design/` — the design bible**
> (41-page Obsidian vault, junctioned at `ObsidianPKM\Croakdown`, start at
> `design/00 START HERE.md`) > this file. The TD goal-lock below is RETIRED and kept
> only as history; the research/MUST-BEAT sections below still bind where they aren't
> tower-specific. Current phase + next steps: `design/11 Production/Roadmap.md`
> (Phase 0 bible DONE → Phase 1 combat prototype next, gated by the Swing Test).

## RETIRED goal-lock (TD era — superseded by the pivot above)
- **GOAL** — a co-op game with *real* production value (art + music that don't feel AI-slop)
  fusing Brotato's feel with tower-defense brains in a swampy-mystic frog world. The outcome:
  a game Ian would genuinely play with a friend and be proud to show.
- **NON-GOALS** — 3D Genshin/GTA scope · Rift Warden salvage · text-heavy game · self-graded 90/100.
- **DONE-BAR** — 2P shared-screen co-op run end-to-end (keyboard + DualSense/USB), 20+ waves,
  3+ bosses, gpt-image-1 art pass + real soundtrack, 3 blind adversarial critics **≥ 8.5/10**
  against the MUST-BEAT bar below. Under the bar = doesn't ship.
- **Locked forks** — embodied-TD core (frog fights in arena + plants living towers) ·
  shared-screen 2P first, online-ready design, netcode after v1 clears the bar · mystic, not weed
  (no weed jokes/mechanics — smoky ATMOSPHERE is in).

### Goal-lock addendum (Ian live-corrected, 2026-07-07 mid-build — overrides the art fork above)
- **ART IS A MAIN COMPONENT.** Ian supplied a reference mockup (smug toad on a lily pad,
  pink tongue-whip splattering a blob-critter, glowing golden lotus, dark glossy water, lurking
  glowing-eyed blobs, cattails, smoky haze, hearts+wave-skull+essence HUD). He then supplied a
  **PIXEL version of the same mockup and approved it as final** ("this is okay if it's easier" —
  and pixel is genuinely better at game scale: crisp 50px sprites, seam-free compositing, crowd
  readability). **Style locked: high-quality PIXEL art in the mockup's mood** — smoky,
  cute-but-eerie, NOT kid-friendly; grotesque enemy designs welcome ("eye coming out of his
  head"). Plan: pixel arena backdrop + dark glowing-eyed critter sprites + ripple rings/fog to
  sell integration; nearest-neighbor scaling in the renderer. gpt-image-1 generator. Old
  cute-style art killed + deleted (~$0.30).
- **Greatsword fantasy:** a frog hero with a sword BIGGER than the frog, hanging low, heavy
  slashes, blood gushing. Ian: "that's kinda fun, especially if I'm a frog."
- **Blood/gore feedback:** blood splatter on kills, blood-stain permanence decals.
- **Secrets + gimmicks:** the game must hide things worth discovering.
- **Praise-mining law:** researcher scouring 2023-2026 Reddit/Steam/forums for ~50 beloved small
  details in this genre; incorporate what fits. "That's how I want you to think of a lot of stuff."

## Infrastructure
- Path `creative\croakdown` · port **5126** strict · git repo (main) · vault page `entities/croakdown.md`
- Seatbelt memory: `ObsidianPKM\claude-refs\projects\croakdown\` (DECISIONS / BUGS / SESSION_LOG live there)

## Research (Phase 1 — DONE, skeptic-gated)
- **Report:** `ObsidianPKM\research\embodied-tower-defense-2026-07-07.md` (6 researchers + independent
  skeptic pass; all load-bearing claims verified live, corrections + demotions applied)
- Headlines: budget ATTENTION not damage · enemy targeting = the master dial · the body pays for
  the economy · no menus mid-combat · separate "stronger" (stat curve) from "WEIRDER" (enemy-type
  schedule) · Brotato's own local co-op = the precedent (pooled wallet, next-wave respawn) ·
  tune for 2P baseline, scale down solo (Robot Entertainment) · cap ~100-150 live enemies, pool
  everything · Thronefall has NO co-op (false premise killed)

## MUST-BEAT bar (Phase 2 — researched teardown, GUARDED mode)

Competitor grades (1–10 per axis):

| Axis | Brotato | BTD6 | Thronefall | Vampire Survivors |
|---|---|---|---|---|
| Layout | 8 | 7 | **9** | 6 |
| Motion | 6 | 7 | 8 | 8 |
| Polish | 7 | **9** | 8 | 5 |
| Clarity | **9** | 7 | 8 | 5 |
| Spectacle | 5 | 7 | 6 | **9** |
| **Total** | 35 | 37 | **39** | 33 |

**The 9 presentation feats CROAKDOWN must match or exceed:**
1. **Diegetic purchasing** (Thronefall) — cost/spend/refund as one physical verb (coins fly on hold, fly back on release), zero purchase text
2. **World-space threat forecast** (Thronefall) — next wave shown AT the spawn points, no briefing panel
3. **Wave transition as world-state change** (Thronefall) — light + music + environment announce phases, never a banner
4. **One authored reward ceremony** (VS chest) — a full-pause jackpot moment players name as their favorite
5. **Spectacle that stays readable** (VS) — hundreds of entities, power readable from screen density; illegible chaos banned
6. **Deadline as a boss** (VS Reaper) — the timer physically arrives
7. **One-glance item grammar** (Brotato) — icon + tier color + price + green/red deltas, decision <2s/item; menu→run <30s
8. **Phase-telegraphing boss bar** (BTD6 skulls) — spatial dread, zero warning text
9. **UI that dodges the action** (BTD6) — contextual panels slide in opposite the selected object

**Cross-cutting law:** information lives in the world (position, silhouette, color, motion, music);
text only in opt-in hover/hard-pause surfaces. Fits Ian's text-hate exactly.

Full teardown receipts: scratchpad `research-06-competitor-teardown.md` (this session) →
final home in the vault research report.

## Brief (Phase 4 — DONE)
- `BRIEF.md` — compiled 2026-07-07, research-fed. Stack locked: raw Canvas 2D + TS + Vite, no engine.
- **Stop-hook condition (the /goal):** CROAKDOWN is done only when a 2P shared-screen co-op run
  works end-to-end on :5126 with 20+ waves, 3 bosses, generated art + real soundtrack wired, and
  `docs/GRADES.md` shows 3 blind critics ≥ 8.5/10 vs the MUST-BEAT bar. Anything less → keep building.

## VISUAL BAR (Ian's /goal, 2026-07-07 — the shipping gate for every screen)
- `docs/VISUAL_BAR.md` — every screen ≥ 42/50 vs REF_02 (painterly primary, pixel REF_01 =
  grit corrector), no axis < 7, graded by `scripts/critique.mjs` (hostile vision critic,
  Anthropic API). Verdicts logged to vault. Palette law: desaturated greens/teals + ONLY hot
  pink & warm gold accents. Screens: title/lobby/world-swarm/pause/shop/build/boss-intro/
  death/victory/settings (pause + settings DON'T EXIST YET — must be built).
- `docs/GOAL_PAPERDOLL.md` — linked equipment-on-frog goal; spec only, needs own skeptic
  gate + one-weapon spike BEFORE any gear art.
- Ian must drop the two chat reference PNGs into `docs/refs/` (VISUAL_REF_01=pixel,
  VISUAL_REF_02=painterly); critic uses rubric-description fallback until then.

## Decisions (running)
- 2026-07-07 · Name CROAKDOWN, port 5126, Vite+TS scaffold; renderer locked in BRIEF.md after perf research.
- 2026-07-07 · Preview/QA deferred to build phase — stub not worth verifying.

## Bugs (running)
- none yet

## Next
1. ~~Research + bar + brief + TD build~~ done, then superseded by the pivot
2. **Phase 1 — Combat Prototype** per `design/11 Production/Roadmap.md`: one frog, one
   stick, sludge family, graybox pond, full juice, HitEvent pipeline, headless tests.
   Gate = the Swing Test (`design/11 Production/Quality Gates.md`). No content until it passes.
