# GYAT.md — CROAKDOWN front door

One place for everything. Never repeat any of this elsewhere — link to it.

## Goal-lock (confirmed by Ian, 2026-07-07 — GUARDED mode, one gate, no more questions)
- **GOAL** — a co-op game with *real* production value (art + music that don't feel AI-slop)
  fusing Brotato's feel with tower-defense brains in a swampy-mystic frog world. The outcome:
  a game Ian would genuinely play with a friend and be proud to show.
- **NON-GOALS** — 3D Genshin/GTA scope · Rift Warden salvage · text-heavy game · self-graded 90/100.
- **DONE-BAR** — 2P shared-screen co-op run end-to-end (keyboard + DualSense/USB), 20+ waves,
  3+ bosses, gpt-image-1 art pass + real soundtrack, 3 blind adversarial critics **≥ 8.5/10**
  against the MUST-BEAT bar below. Under the bar = doesn't ship.
- **Locked forks** — embodied-TD core (frog fights in arena + plants living towers) ·
  swamp-mystic chunky 2D (Ollama-pfp/Brotato energy; spider-punk = boss cards only) ·
  shared-screen 2P first, online-ready design, netcode after v1 clears the bar · mystic, not weed.

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

## Decisions (running)
- 2026-07-07 · Name CROAKDOWN, port 5126, Vite+TS scaffold; renderer locked in BRIEF.md after perf research.
- 2026-07-07 · Preview/QA deferred to build phase — stub not worth verifying.

## Bugs (running)
- none yet

## Next
1. Collect 6 research agents → skeptic gate → land vault report
2. Distill MUST-BEAT bar into this file
3. Compile BRIEF.md → fire-and-forget build → /lookit + 3 blind critics
