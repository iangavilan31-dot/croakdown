# Technical Architecture

> Part of the [[00 START HERE|CROAKDOWN bible]] · updated 2026-07-07

## Stack `LOCKED`

**Raw Canvas 2D + TypeScript + Vite. No game engine.** Rationale (2026-07-07, survives the pivot): the house's two best-feeling games (LUMEN, NOX) are hand-rolled canvas; full control of the juice pipeline; no engine text-object/perf traps; benchmarks only diverge above our entity scale. Port **5126** `--strictPort`, Chrome-first. Steam path at ship: Tauri/Electron wrapper (Vampire Survivors precedent) — a Phase 4 concern designed-for now (no browser-only APIs in the sim).

## Architecture principles (from the [[Master Directive]])

Data-driven systems · highly modular · readable code · professional folder structure. Concretely:

```
src/
  engine/     # loop, pools, spatial hash, input, audio graph, sprites, rng
  sim/        # deterministic game state: entities, combat, waves, economy, co-op
  feel/       # the juice pipeline: hitstop, trauma, particles, decals, floaters
  render/     # canvas layers, camera, animation runtime, UI draw
  data/       # ALL numbers: weapons.ts, enemies.ts, waves.ts, items.ts, bosses.ts
  screens/    # title, shop, level-up, pause, settings, run-end
```

- **Sim/render split** `LOCKED`: fixed 60 Hz sim tick, rAF render with interpolation. The sim never reads the canvas; the renderer never mutates state. This is what makes headless testing and future netcode possible (co-op online-ready law)
- **Data-driven law**: every gameplay number lives in `data/` tables mirroring this vault's spec tables (frame data schema per [[Sword Line]]). Tuning = editing data, never systems. The vault page is the design source; `data/` is the numeric runtime copy
- **Determinism**: seeded RNG per run, sim inputs are the only entropy — replays and precise bug repro come free

## The one-event feedback pipeline `LOCKED`

A landed hit emits ONE `HitEvent {attacker, victim, weapon, damage, class, dir, pos, killed}` consumed by all feedback channels in the same tick: hitstop, flash, knockback/launch, particles, decals, audio, trauma, essence ([[Game Feel Standards]]). No system fires feedback ad hoc. Testable: assert every channel consumed every event; an effect without its audio twin is a bug ([[VFX Standards]]).

## Core engine services

- **Pools for everything** hot (enemies, particles, decals, events, floaters) — zero per-frame allocation in the loop ([[Performance Budget]])
- **Spatial hash** (cell ≈ 128 px) for targeting, soft-body crowd separation, tongue rays, arc queries
- **Layered canvases**: static backdrop / decals (accumulating, rarely cleared — permanence is literally cheap) / entities+VFX / UI
- **Animation runtime**: sheet playback + code-driven life (squash-stretch transforms, tumble rotation, breathing, hitstop shake) per [[Animation Standards]]; paper-doll compositor GATED (`docs/GOAL_PAPERDOLL.md`)
- **Input service**: kbd/mouse + Gamepad API per rAF, MDN "standard" mapping check, remap layer, 150 ms buffer in the sim ([[Movement and Controls]])
- **Audio graph** with duck bus ([[Audio Direction]])

## Salvage map (TD codebase → melee)

Per the VISION.md triage: **keep** engine/loop/input/juice/pools, wave director, shop & level-up grammar, co-op state, pause/settings, audio graph, QA bot + critique gate. **Delete** towers, grow/attune, ROOT_NODES, Heartbloom, forecast glyphs, pad ready-check. **Rewrite** `game.ts`/`sim.ts` around the [[Combat System]] contract (current sim has no attack anatomy, mass/impulse physics, or HitEvent pipeline — that IS Phase 1). Existing `render.ts` (64 KB) is TD-shaped; expect a structured extraction into `render/` rather than incremental edits.

## Testing (headless-first — the Sprout lesson)

Pure-TS modules + `npm test` runner, no canvas: frame-data resolution (buffer/cancel/chain state machine) · mass/impulse/launch math · wave budgets & weirdness schedule · economy formulas · co-op state machine (down/revive/scaling) · boss phase logic · pool integrity (no leaks at cap). Wiring tests catch boot-crash bugs — keep one that boots the real entry. Browser QA: visible Playwright only (`scripts/shoot.mjs`), real keys, never while generators write to `public/` ([[Quality Gates]]).
