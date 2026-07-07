# Sludge Family

> Part of the [[00 START HERE|CROAKDOWN bible]] · family per [[Enemy Design Standards]] · updated 2026-07-07

**Silhouette language**: round-bottomed gel blobs, glowing eyes suspended in the mass, waddle-hop locomotion that jiggles the whole body. **Palette**: bog-dark greens/purples, membrane sheen, eye-glow. The fun-to-hit baseline of the game — sludge is where squash-and-stretch lives loudest. Ian roster (verbatim): small blob, heavy blob, spiked blob, exploder, elite, king.

## Blobbit — the fodder `Wave 1+`

- **Role**: swarm mass; the sword's food. Answered by: any swing at all
- **Stats** `TUNE`: HP 20 · speed 60% of frog · mass 1.0 · poise 0 (always flinches) · essence 1
- **Attack**: waddles in, body-bump nibble (windup 24f coil + warm eye-flash, 4 dmg, big punish window)
- **Reactions**: full menu — flinches, staggers, launches gloriously (THE tumble ammo)
- **Deaths**: normal splat · overkill burst (gel chunks as decals) · reference-pack "dissolve to ripples" for water deaths
- Reference: BLOBBIT is named in the v2 pack — base of the palette-swap swarm plan (stat-tier recolors legal within same behavior)

## Gloopa — the heavy blob `Wave 2+`

- **Role**: walking wall; makes crowds lumpy. Answered by: hammer, launch chains, spear pokes
- **Stats** `TUNE`: HP 90 · speed 35% · mass 2.5 · poise: immune to light flinch · essence 4
- **Attack**: forward belly-flop (30f windup, drops a mud splash ring 8 dmg + knockdown); the flop leaves it grounded 40f — a big fat punish window
- **Reactions**: staggers to finishers, launches only to heavy impulse (satisfying BECAUSE rare)
- Squishes Blobbits it lands on (friendly-fire comedy = crowd texture)

## Spikeblob — the anti-mash lesson `Wave 3+`

- **Role**: punishes brainless mashing; teaches timing. Answered by: hammer ring, tongue pull (spikes retract while flying), hit-the-rhythm
- **Stats** `TUNE`: HP 45 · speed 50% · mass 1.5 · essence 3
- **Cycle**: spikes OUT 1.2 s (hitting it costs 5 reflected dmg, absorbed-hit feedback) → spikes IN 1.8 s (fully vulnerable, brighter eyes) `TUNE`. Cycle telegraphed by inflate/deflate breathing — readable in a crowd by silhouette alone
- Reference: SPIKEBLOB named in v2 pack

## Bogpop — the exploder `Wave 6+`

- **Role**: urgency injection; punishes tunnel-vision. Answered by: burst damage (overkill before pop = NO explosion — rewards decisive hits), tongue-pull it away from the team, spear snipe
- **Stats** `TUNE`: HP 30 · speed 75% (fastest sludge) · mass 0.8 · essence 3
- **Behavior**: rushes the nearest frog, swells over 1.5 s (warm pulsing glow + rising whistle), pops: 90 px ring, 18 dmg. Overkill kill (≥2× remaining HP) defuses — gib instead of boom
- Its corpse-pop stains a big decal; chain-popping a Bogpop line is a highlight moment

## Sludge Elite — family champion `Elite waves`

Gloopa frame, +60% size, royal-purple sheen, crown of embedded bones. **One trick**: its belly-flop splits it into 3 Blobbits ONCE at 50% HP (spawner beat inside sludge). Mini spawn ritual per [[Enemy Design Standards]].

## Sludge King — the rare terror `Wave 14+ rare / danger 3`

- **Role**: field mini-boss; a wave-warping event, not a schedule item. ~15% chance to replace an elite pack late-run `TUNE`
- Massive (192 px), mass 5.0, absorbs Blobbits it touches (+HP, +size, visible growth) — the players must triage it before it eats its own wave
- Killing it bursts every absorbed Blobbit back out as essence — jackpot physics

## Broodmother — the spawner sac `Wave 9+`

- **Role**: priority-target pressure. Answered by: spear reach, tongue-pull it out of its guard-crowd
- **Stats** `TUNE`: HP 120 · speed 20% (barely moves) · mass 2.5 · essence 8
- **Behavior**: pulsating egg-sac blob; births 2 Blobbits every 6 s (birthing animation is grotesque and LOUD — you hear a Broodmother before you see it). Guard instinct: nearby sludge orbits it
- Death: sac ruptures — all queued eggs pop as essence, not enemies (killing it always feels like winning)
