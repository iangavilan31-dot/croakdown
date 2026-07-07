# Bog Hammer

> Part of the [[00 START HERE|CROAKDOWN bible]] · the launcher · updated 2026-07-07

A waterlogged root-maul with a rune-stone head. The slowest, heaviest, most physics-forward weapon — the bowling engine that makes the [[Combat System]] launch/tumble/wall-splat pipeline sing.

## Identity

- **Role**: AoE launcher + armor breaker. Best at: dense crowds, armored enemies, wall-adjacent fights. Weak at: fast single targets (Skeeters humiliate hammer frogs), sustained DPS
- **Carry**: over the shoulder, frog leans back to counterbalance; walk cycle has a weighty bob
- **Audio**: deep boom + mud splash + stone knock; the pre-swing air-hum is its telegraph signature

## Frame data — tier 1 `TUNE` (schema per [[Sword Line]])

| Attack | Windup | Active | Follow | Recovery | cancelFrom | Damage | Impulse | Arc | Reach |
|---|---|---|---|---|---|---|---|---|---|
| Light 1 (side sweep) | 12 | 5 | 6 | 14 | 8 | 18 | 800 | 100° | 140 px |
| Light 2 (return sweep) | 10 | 5 | 6 | 14 | 8 | 18 | 800 | 100° | 140 px |
| Finisher (overhead slam) | 16 | 4 | 8 | 20 | 12 | 30 | 1400 + ground ring | 60° + 120 px ring | 130 px |
| Heavy (hold — spin) | 22 | 12 (360° sweep) | 8 | 22 | 14 | 26 | 1300 | 360° | 150 px |

- Slam finisher produces a **ground shockwave ring** (120 px, light damage, knockdown on fodder) + mud crater decal
- Heavy spin has super-armor and moves the frog forward slowly during active (a rolling catastrophe)
- Cracks armor: hammer hits count double vs armor poise (Shellshroom's counter — [[Enemy Design Standards]])

## Evolution ladder `TUNE (names open to art pass)`

| Tier | Name | New property |
|---|---|---|
| 1 | **Bog Hammer** | Fundamentals above |
| 2 | **Rootmaul** | Slam ring +40% radius; ring launches (not just knocks down) |
| 3 | **Runestone Crown** | Launched enemies gain +50% collision damage (bowling balls, officially) |
| 4 | **HEART OF THE HILL** | Slam echoes: second delayed ring; spin pulls enemies IN during windup (brief vortex) then launches all |

## Feel notes

- The hammer is the multi-hit hitstop cap's stress test — a spin through 12 enemies must feel titanic but stay under the 14-frame cap ([[Game Feel Standards]])
- Wall-splat chains are the hammer's highlight reel; arenas provide splat surfaces on purpose ([[Environment and Reactivity]])
- Co-op: the designated smash half of pull → smash ([[Giant Tongue]], [[Co-op Design]]); stun → slam synergy makes stunned crowds count as walls
