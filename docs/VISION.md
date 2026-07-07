# CROAKDOWN — Core Vision (Ian, 2026-07-07 evening — SUPERSEDES embodied-TD)

> **THE PIVOT: towers are GONE.** No tower defense, no base management. The
> player IS the weapon. This document outranks GYAT.md's original goal-lock,
> BRIEF.md, and every TD-era spec. docs/VISUAL_BAR.md remains fully in force
> (the art gate got MORE important, not less).

**CROAKDOWN is a premium 2-player co-op MELEE horde survivor** — Brotato's
progression, Hades' combat feel, Cult of the Lamb's atmosphere. The goal is
not "Brotato with frogs." The goal is **the most satisfying melee horde
survivor ever made.** The player constantly feels themselves becoming an
unstoppable swamp guardian cutting through enormous swarms in a mysterious
bioluminescent night swamp.

## Pillar 1 — Combat Comes First
Everything revolves around satisfying melee. Huge sword arcs, tongue attacks,
knockback, hitstop, enemy launches, splash effects, environmental destruction,
permanent corpses, extremely satisfying enemy reactions. **Every swing feels
heavy.** Physics and impact over numbers: enemies launch, bounce, tumble,
slide through mud, collide with each other. Water splashes, reeds bend, spores
burst, petals scatter. By wave 20 the arena visually tells the story of the
run — bones, blood, broken reeds, glowing relics, hundreds of fallen enemies.

## Pillar 2 — A Living World
Nothing is ever static. Every screen alive: drifting fog, glowing spores,
wandering fireflies, swaying reeds, animated water, breathing lotus flowers.
Characters: idle breathing, blinking, weight shifting, squash/stretch,
expressive movement. **Menus contain ambient motion too.**

## Pillar 3 — Animation Is A Feature
A defining characteristic. Every creature: multiple idles, walking,
anticipation, several attacks, hit reactions, multiple deaths, status-effect
anims, squash/stretch, secondary motion. **Characters never slide across the
ground.**

## Pillar 4 — Bigger, More Expressive Characters
Sprite size up **+30–50%**. Fewer, LARGER enemies instead of hundreds of tiny
dots. More readable, easier to animate, stronger personality, heavier weapons,
memorable enemies.

## Art Direction
**The reference pack is the visual authority** (docs/refs/ + v2 pending Ian's
download). Mysterious, dreamy, painterly, chunky pixel art, heavy atmosphere.
Palette: dark teal, swamp greens, muddy browns. Accents ONLY warm gold + hot
pink. Bioluminescence is the primary light source. (VISUAL_BAR 42/50 gate
unchanged.)

## Gameplay Loop
Start wave → fight huge swarms → collect XP → level-up choice → **shared
shop** → repeat. Bosses every few waves. Simple. Fast. Readable.

## Co-op Philosophy
Built for co-op from day one, not single-player with two people.
- **Shared**: one wallet, one shop, shared rerolls/locks/relics, shared combo meter.
  Players constantly discuss purchases.
- **Individual**: each frog has unique weapons, own build, stats, evolution path, abilities.
- **Synergy**: strongest builds require teamwork — tongue pull → hammer smash;
  freeze → shatter; poison → fire explosion; stun → giant slam. Every run
  produces different team compositions.

## Enemy Design — families
Recognizable families sharing silhouettes + behavior:
- **Sludge**: small blob, heavy blob, spiked blob, exploder, elite, king
- **Mushrooms**: small, poison, armored, ancient
- **Insects**: mosquito, dragonfly, firefly, moth, queen

## Bosses — swamp legends
Drowned King, Mother Mosquito, Bog Leviathan, The Bloom. **No generic
humanoid bosses.**

## Progression — the frog EVOLVES (not equipment upgrades)
Visual upgrades ALWAYS accompany gameplay upgrades.
- Tongue: normal → piercing → forked → LIGHTNING TONGUE
- Sword: stick → reed blade → lotus sword → moon cleaver → LIVING VINE SWORD

## Weapons — everything belongs in the swamp
Lotus Blade, Reed Spear, Bog Hammer, Thorn Whip, Dragonfly Glaive, Giant
Tongue, Poison Cane, Frog Fists. **No guns.**

## Secrets
Hidden frog statues, golden dragonflies, mushroom circles, ancient shrines,
ghost frogs, glowing fish, secret caves.

## Build Variety
Giant Sword, Tongue, Poison, Ice, Fireflies, Reflection, Crits, Blood, Moon
Magic, Leap Slam, Summoner, Lightning Tongue.

## The Feeling
Player: "I am becoming ridiculously powerful."
Swamp: alive, beautiful, ancient, mysterious, dangerous.

---

## What this means for the existing codebase (pivot triage)
**SURVIVES**: engine/loop/input/juice pipeline (hitstop/trauma/decals/floaters
— now the star), wave director + shop + level-up grammar, co-op state, frogs,
enemy roster (reorganize into families), boss system + intro cards, music +
SFX, pause/settings, painted art + refs, QA bot + critique gate, secrets.
**DIES**: towers (all 18 sprites retire from gameplay), grow/attune channel,
ROOT_NODES/stumps as sockets, Heartbloom-as-defended-base + dawn-mend, tower
shop cards, forecast glyphs (respawn as spawn telegraphs), buildReadyT pad
ready-check (replace w/ simple wave start).
**TRANSFORMS**: build phase → brief between-wave breather (shop/heal); heart
HP → player HP is the fail state; tower shop slots → weapon/evolution cards;
shoot.mjs bot rewrites for melee (no node walking).
