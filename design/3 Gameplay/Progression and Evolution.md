# Progression and Evolution

> Part of the [[00 START HERE|CROAKDOWN bible]] · updated 2026-07-07

Ian-verbatim law: **the frog EVOLVES — not equipment upgrades. Visual upgrades ALWAYS accompany gameplay upgrades.** "I am becoming ridiculously powerful" must be visible on the sprite, in the arc, and in the swarm's reaction.

## The two ladders (in-run)

Every frog runs two visible evolution ladders simultaneously:

### Weapon evolution (per weapon line)
Canonical example — the sword ladder `LOCKED (names+count)`:
`stick → reed blade → lotus sword → moon cleaver → LIVING VINE SWORD`
Each tier changes: sprite (bigger/brighter/animated), arc size, frame data, VFX color story, SFX layer, and adds ONE new mechanical property. Full data: [[Sword Line]]. Tongue ladder (`normal → piercing → forked → LIGHTNING TONGUE`): [[Giant Tongue]]. Every weapon line defines its ladder in its own page ([[Weapon Design Standards]]).

**How tiers happen**: evolution cards appear in the [[Shop and Economy|shop]] when prerequisites are met (weapon owned + stat threshold or relic). Buying one triggers the **evolution moment** — 0.8 s hard-pause bloom on the frog, petals/spores burst, new weapon revealed held high, croak fanfare, zoom-pulse. This moment ranks with the Bloom Chest in polish priority ([[Quality Gates]]).

### Body evolution (stats made flesh)
Stat purchases visibly mark the frog at thresholds `TUNE thresholds`:
- Max HP → plumper frog, war-scars
- Damage → arm/shoulder mass, weapon-hand glow
- Speed → leaner legs, longer hop stretch
- Crit/status builds → eye glow, skin-pattern shifts (poison = mottled, ice = pale rime, blood = dark red streaks)
Implementation is palette/overlay layers on the frog sheet, feeding the paper-doll system (`docs/GOAL_PAPERDOLL.md` — spec-only, own gate before gear art).

## Stats (kept small and physical)

`LOCKED (list)` — MaxHP · Damage% · Attack Speed% (anim-scaled, never breaks anticipation ratios) · Move Speed% · Crit% · Knockback% (impulse scalar — a BUILD STAT; knockback builds are launch/bowling builds) · Status power · Pickup radius · Luck. No armor stat at launch — durability comes from HP and not getting hit; keeps math legible.

## Sources of power

1. **Level-ups** — essence doubles as XP (single-currency law, [[Shop and Economy]]); level-up = hard-pause 3-card stat pick. Co-op: both players pick simultaneously on split panels
2. **Shop items** — weapons, relics, evolution cards ([[Shop and Economy]])
3. **Relics** — run-defining rule-benders (shared in co-op: "shared relics" is Ian-verbatim; e.g., *Mycelium Pact: all poison you both apply is shared and doubled*). Relics drop from the Bloom Chest only ([[Waves and Pacing]])
4. **[[Secrets and Discoveries]]** — small, real, discovered power

## Build variety (Ian's list, the design targets)

Giant Sword · Tongue · Poison · Ice · Fireflies (orbiting familiars) · Reflection · Crits · Blood (bleed/lifesteal) · Moon Magic · Leap Slam · Summoner · Lightning Tongue. Each is a *reachable, visually distinct* end-state, not a checkbox — a Blood build frog looks drenched and terrifying by wave 15. Items/relics are designed backward from these twelve end-states ([[Shop and Economy]]).

## Meta-progression (post-v1 posture)

Unlocks widen (new frogs, weapons entering the pool, danger pips) — never deepen (no +damage% meta). The Swing Test must pass on a fresh save forever ([[Design Philosophy]]).
