# Combat System

> Part of the [[00 START HERE|CROAKDOWN bible]] · the heart of the game · updated 2026-07-07

The player IS the weapon. Combat is manual, physical, and readable. This page defines the combat *model*; per-weapon numbers live in the weapon pages; juice numbers live in [[Game Feel Standards]].

## Attack anatomy (the universal swing contract)

Every attack in the game — player or enemy — is built from the same four phases, driven by data ([[Technical Architecture]]):

| Phase | What happens | Design law |
|---|---|---|
| **Anticipation** | Wind-up. Sprite squashes/loads, weapon pulls back, audio pre-transient | Weight lives HERE. Heavy weapons get MORE anticipation frames — never more input latency |
| **Active** | Hitbox live. Arc VFX, contact frames | Hits resolve on contact frame, all feedback fires the same frame |
| **Follow-through** | Weapon continues past the arc; debris/splash trails | Sells mass. Never skipped, even on whiff |
| **Recovery** | Return to ready; **cancel window opens** | Player agency lives here |

Frame data is authored per attack in `data/weapons.ts` as `{windup, active, followthrough, recovery, cancelFrom}` at 60 fps. See [[Sword Line]] for the canonical filled-in example.

## Input model

- **Fixed 60 Hz sim**; input sampled per tick ([[Technical Architecture]])
- **Input buffer: 150 ms** `LOCKED` — any attack/dash pressed during a non-cancelable phase queues and fires on the first legal frame. Mashing always feels responded-to
- **Cancel rules**: recovery cancels into dash (always) and into next chain attack (after `cancelFrom` frame). Active frames never cancel — commitment is the price of weight
- **Chain combos**: primary weapons chain 3 hits (light-light-finisher). Finisher has bigger numbers, bigger knockback, longer recovery. Chain window 0.6 s `TUNE` after recovery starts; dropped chain resets to hit 1
- **Hold = heavy** `IMPLEMENTED (Phase 1)`: press begins a shared windup (instant, visible anticipation — taps feel immediate); **releasing before the windup completes commits the light, holding through it upgrades into the heavy** (own frame data, super-armor). This disambiguation is the whole trick: mashing/tapping = instant light chain (correct for a horde survivor), a deliberate hold = the greatsword heavy — one button, zero latency on taps. Verified in `test/combat.test.mjs` ("hold-heavy" + "tap stays light"). Hits resolve on the same tick the windup ends (no handoff frame)

## Aiming & targeting

- **P1 mouse**: swing aims at cursor. **Stick/keys**: swing aims at movement direction or last-faced
- **Soft magnetism**: if an enemy is within the weapon's reach and within ±20° `TUNE` of aim, snap the arc center to it. Never snaps to off-screen or behind-aim targets. Magnetism is invisible when it works; it must never override an obviously-intended whiff

## The physics of impact (what makes CROAKDOWN's melee different)

### Knockback & mass
Every entity has a **mass class**; every hit applies an **impulse** (px/s, per weapon). Resulting velocity = impulse / mass, decayed by mud friction (~6/s exponential `TUNE`).

| Mass class | Entities | Feel |
|---|---|---|
| 1.0 | Fodder (Blobbit, Skeeter…) | Fly satisfyingly far |
| 2.5 | Mid (Spikeblob, Toxicap…) | Shoved, not launched |
| 5.0 | Bruisers/elites | Budge only to heavies |
| ∞ | Bosses | Immune to displacement; still flinch visually ([[Boss Design Standards]]) |

### Launch & tumble (enemies as projectiles)
If `impulse / mass > 600` `TUNE`, the victim enters **tumble**: ballistic, spinning sprite, no AI, for 0.4–0.6 s.
- A tumbling enemy that hits another enemy deals `0.04 × relative speed` damage to *both* and flinches the victim — **bowling is a core damage strategy**, not a garnish
- Tumble into arena walls/rocks/logs = **wall splat**: +50% of the launching hit's damage, splat decal, heavy thud
- The [[Bog Hammer]] and sword finishers are the primary launchers; [[Giant Tongue]] pulls set launches up

### Enemy-to-enemy crowding
Enemies collide with each other (soft-body separation via spatial hash). Swarms compress, shove, and jostle — a heavy swing into a crowd visibly parts it. This is expensive and budgeted for ([[Performance Budget]]) because it is pillar 6 made mechanical.

## Hit reactions (the enemy's half of game feel)

Every enemy responds to every hit with one of four reaction tiers, gated by its **poise**:

1. **Flinch** — 6-frame interrupt, sprite shake, always available unless armored
2. **Stagger** — knockback + 0.4 s stun, current action canceled (hit ≥ poise threshold)
3. **Launch** — tumble as above (impulse threshold)
4. **Armored** — no interrupt; show absorbed-hit feedback (dust, "clink", reduced flash) so the player *reads* armor instantly. Armor is always breakable — flank, heavy, or launch another enemy into it ([[Enemy Design Standards]])

Deaths are tiered too: normal death animation · **overkill burst** (damage ≥ 2× remaining HP → gib + blood spray + parts as decals) · status deaths (burn crumble, shatter, melt) — see [[Animation Standards]] and [[VFX Standards]]. All kills bleed; heavy kills bleed a lot (Ian law).

## The tongue (universal secondary)

Every frog has the tongue on a short cooldown regardless of weapon — the signature verb that makes melee positioning FUN instead of a chore. Pull light enemies to you (into your swing), pull yourself to heavies. Full spec: [[Giant Tongue]]. Synergy verbs built on it are co-op currency ([[Co-op Design]]).

## Defense

- **Dash-hop with i-frames** is the primary defense ([[Movement and Controls]])
- **No blocking at launch** `LOCKED for v1` — defense is spacing, i-frames, and crowd control. (A shield/parry weapon is a candidate in [[Weapon Roadmap]]; it must not dilute the aggressive identity)
- Player hit reactions obey the same contract as enemies: hit flash, knockback, 0.3 s of i-frames after taking a hit, HP pips drop with a heart-crack animation. Getting hit must feel *bad but fair* — every enemy attack has a readable anticipation ([[Enemy Design Standards]])

## Status effects (build variety hooks)

Poison (DoT stack), Burn (DoT + spreads on death), Freeze (slow → frozen solid at 3 stacks; frozen enemies **shatter** on heavy hit), Stun, Bleed (Ian's blood pillar: bleeding enemies drip decals). Statuses exist to create co-op combos (freeze → shatter, poison → ignite detonation) — each status has a visible sprite-level tell, never just an icon. Numbers land with the items that apply them ([[Shop and Economy]]).

## What combat is NOT

No mana bars, no combo-string memorization, no stamina. Depth comes from spacing, timing, mass, and the swarm — not from execution barriers. A new player mashing attack must still feel amazing; a good player using launches, walls, tongue set-ups, and heavies should be twice as effective.
