# Design Philosophy

> Part of the [[00 START HERE|CROAKDOWN bible]] · updated 2026-07-07

How decisions get made on CROAKDOWN — the thinking style behind the [[Design Pillars]].

## The decision framework

When evaluating any proposed feature, ask in order:

1. **Does it make swinging more satisfying?** If yes → strong candidate.
2. **Does it make the swamp feel more alive or the co-op story better?** If yes → candidate.
3. **Is it content compensating for a feel problem?** If yes → rejected. Fix the feel.
4. **Can it be read without text?** If it needs a tutorial paragraph, redesign it until it doesn't. Information lives in the world: position, silhouette, color, motion, music.
5. **Can we afford its full cost?** A feature's cost = mechanic + animation set + audio identity + VFX + co-op interaction + perf budget. Half-paid features don't ship ([[Design Pillars|Pillar 2]]).

## Praise-mining law (Ian, 2026-07-07)

*"Steal what real players demonstrably love."* Before designing in a genre-adjacent space, check what 2023–2026 Reddit/Steam/forum players name as beloved small details, and incorporate every one that fits. The TD-era praise-mining research receipts live in the vault research report (`ObsidianPKM\research\embodied-tower-defense-2026-07-07.md`); a melee-focused praise-mining pass is a Phase 1 task in [[Roadmap]]. This thinking style applies to all future decisions.

## Inherited research laws that survived the pivot

Verified findings from the 2026-07-07 research run (6 agents + skeptic gate) that still bind:

- **Budget attention, not damage.** The scarce resource is the player's eyes. Every simultaneous demand on attention must be individually readable. Spectacle that stays readable is a MUST-BEAT feat.
- **Separate "stronger" from "weirder."** Stat ramps make enemies stronger; new *rules* make waves weirder. Never conflate — schedule rule-breakers deliberately ([[Waves and Pacing]]).
- **Enemy speed never scales with waves.** Ramp HP and count; speed changes gameplay grammar and breaks learned dodge timings.
- **No menus mid-combat.** Choices happen in hard pause (level-up, shop) or diegetically (world verbs). Contextual panels slide in opposite the action.
- **Tune for 2P baseline, scale down solo** (−25–30% enemy HP/count — Robot Entertainment law). See [[Co-op Design]].
- **One authored reward ceremony** — a full-pause jackpot moment players name as their favorite. Ours: the Bloom Chest after boss kills ([[Waves and Pacing]]).
- **Deadline as a boss** — pressure should physically arrive, not tick in a corner.

## The MUST-BEAT presentation bar

The competitor-teardown feats (diegetic purchasing, world-space threat forecast, wave transitions as world-state change, one-glance item grammar, phase-telegraphing boss bars, UI that dodges the action…) remain the presentation floor, re-scoped to melee. The full annotated list with scores lives in `GYAT.md`; each feat's melee-era owner is named in the relevant system page. Under the bar = doesn't ship ([[Quality Gates]]).

## Anti-patterns (rejected, do not re-propose)

- Auto-attack as the primary weapon verb — swinging is manual; that's the game. (Auto elements may exist as *items*, never as the core verb. See [[Combat System]].)
- Damage numbers on by default — OFF by default, toggle exists. Impact is communicated physically.
- Text-heavy anything — Ian: "I hate games you have to read the whole time."
- Generic humanoid bosses — Ian-verbatim ban. See [[Boss Design Standards]].
- White-frosted/ink-on-light UI chrome — scored 2–3/10 cohesion vs the reference pack; retired 2026-07-07 for dark swamp-glass ([[Art Direction]]).
- Neon-cyan holo HUD, scanlines, mono microtype, cursive gold slop (banned 3×, workspace-wide).
