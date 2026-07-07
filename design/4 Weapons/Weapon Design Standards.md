# Weapon Design Standards

> Part of the [[00 START HERE|CROAKDOWN bible]] · updated 2026-07-07

Fewer weapons, better weapons ([[Design Pillars|Pillar 3]]). Everything belongs in the swamp; **no guns** (Ian-verbatim). A weapon ships complete or not at all.

## Launch roster `LOCKED (count)`

Four fully-built lines + the universal tongue:

| Line | Archetype | Fantasy | Page |
|---|---|---|---|
| **Sword** (stick → Living Vine Sword) | Wide-arc slasher, the flagship | A blade bigger than the frog, heavy arcs, blood | [[Sword Line]] |
| **Bog Hammer** | Slow AoE launcher | The crowd-parter; bowling engine | [[Bog Hammer]] |
| **Reed Spear** | Fast thrust, reach, precision | The duelist; skewers lines | [[Reed Spear]] |
| **Giant Tongue** (universal + build path) | Grab/pull utility → primary for Tongue builds | The frog IS the weapon, literally | [[Giant Tongue]] |

Remaining Ian-roster weapons (Lotus Blade*, Thorn Whip, Dragonfly Glaive, Poison Cane, Frog Fists) are Phase 3 content: [[Weapon Roadmap]]. (*Lotus Blade is folded into the sword ladder as the tier-3 form.)

## The completeness contract

A weapon does not enter the game without ALL of:

1. **Frame data** — full attack anatomy per attack ([[Combat System]]): light chain ×3, heavy (hold), evolution deltas per tier
2. **A distinct combat role** — a situation where it's clearly the best answer, and one where it's clearly not
3. **An evolution ladder** — 3–5 tiers, each with a visible sprite change + ONE new mechanical property ([[Progression and Evolution]])
4. **Full animation set** — anticipation, active arc, follow-through, recovery, idle carry, walk carry, evolution reveal ([[Animation Standards]]); paper-doll sheets on-model (`docs/GOAL_PAPERDOLL.md` gate)
5. **Audio identity** — unique, layered, round-robin ([[Audio Direction]]). *"Every weapon requires a unique identity"*
6. **VFX identity** — arc trail shape + impact signature + palette slot ([[VFX Standards]])
7. **Co-op synergy hook** — at least one designed interaction with the other lines ([[Co-op Design]])

## Weight discipline (the feel law)

Weight = anticipation frames + recovery + hitstop + knockback + audio bass — **never input latency**. The heavier the weapon, the bigger its anticipation stretch and its payoff physics. Attack-speed stat compresses recovery and chain gaps, never anticipation below 70% `TUNE` — weapons must keep their character at max build.

## Data-driven law

All weapon numbers live in data tables (`data/weapons.ts`), not code ([[Technical Architecture]]). A designer (or Ian) can retune a weapon without touching a system file. Frame-data table schema is defined once in [[Sword Line]] and reused by every page.
