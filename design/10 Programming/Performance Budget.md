# Performance Budget

> Part of the [[00 START HERE|CROAKDOWN bible]] · updated 2026-07-07

**60+ FPS locked on the dev box (AMD RX 6600, Chrome).** Frame budget 16.6 ms; the sim targets ≤ 6 ms, render ≤ 8 ms, 2.6 ms headroom `TUNE against reality in Phase 1`. Feel is the product — a dropped frame during a heavy swing is a design failure, not a perf footnote.

## Entity budgets `LOCKED (caps)`

| Pool | Cap | Notes |
|---|---|---|
| Live enemies | **70** | Fewer-bigger law ([[Sprite and Scale Standards]]). Invisible overflow despawn (off-screen farthest first — Brotato trick); wave director respects the cap in pulse sizing |
| Particles | 600 | Pooled quads; per-event emission caps ([[VFX Standards]]) |
| Ground decals | 250 | Oldest fade 10 s over-budget; decal canvas accumulates (no per-frame redraw) |
| Floaters (essence, motes) | 200 | Magnet-merge when dense (10 motes → 1 big mote, same value) |
| Audio voices | 32 | Priority: player-hit > kill > enemy > ambience; round-robin steals lowest |
| HitEvents/tick | 64 | A hammer spin through the horde stays bounded |

## Hot-loop laws

- **Zero allocation** in sim tick and render frame (pools + reused scratch vectors; no closures, no array spreads, no string building)
- Spatial hash rebuilt incrementally; queries never scan the full entity list
- Soft-body separation ([[Combat System]] crowding): budget-capped at 3 neighbor checks/enemy/tick via the hash `TUNE` — crowd feel is a perf line item, protect it
- Sprites pre-rendered to atlases at load (incl. palette-swap variants and flash-white copies — runtime tinting is banned in the hot path)
- No DOM in the loop; canvas-drawn UI; text only on pause surfaces
- Decal/backdrop layers redraw only on change; entity canvas is the only full-clear per frame

## Boss-scale clauses

Bosses are one entity with bespoke rigs — their cost is VFX + world-state, not count. [[Bog Leviathan]] phases 1–2 spend the enemy budget low (boss invisible) to afford mud/water sim; [[The Bloom]] phase IV is the declared worst case: boss + 2 heralds + adds + blizzard ring + full juice. **Phase IV is the perf acceptance test** ([[Quality Gates]]).

## Instrumentation (Phase 1 deliverable)

`?perf` overlay: sim ms / render ms / pools in use / entities / particles / decals / GC events (must be ZERO during waves). Headless perf test: scripted worst-case swarm + hammer spin, asserts frame budget on CI-ish runs `TUNE tolerance`. Perf regressions block merge like test failures ([[Quality Gates]]).
