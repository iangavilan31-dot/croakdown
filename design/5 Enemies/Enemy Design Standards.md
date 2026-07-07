# Enemy Design Standards

> Part of the [[00 START HERE|CROAKDOWN bible]] · updated 2026-07-07

Enemies exist to make swinging feel amazing. They are plump, expressive, grotesque-cute punching bags with *rules* — fewer and LARGER than genre norm (sprites +30–50%, live cap ~70, [[Performance Budget]]). Every enemy is a member of a **family** with shared silhouette language and palette (Ian-verbatim): [[Sludge Family]] · [[Mushroom Family]] · [[Insect Family]].

## The completeness contract (per creature)

1. **Combat role** — one sentence: what pressure does it add, and which player verb answers it
2. **Stats block** — HP class, speed, mass class ([[Combat System]]), poise, essence value
3. **Attack(s)** — full anatomy with readable anticipation ≥ 20 frames for damaging attacks `TUNE`; grace rules for off-screen attackers (never attack from off-screen)
4. **Hit reaction profile** — which of flinch/stagger/launch/armored apply, per weapon class
5. **Full animation set** — [[Animation Standards]] roster incl. SPAWN (smoke emergence) and ≥ 2 deaths
6. **Audio identity** — idle vocalization, attack, pain, death ([[Audio Direction]])
7. **Silhouette check** — readable at gameplay scale in a crowd, in fog, in its family AND distinct within it

## Silhouette & readability law

- Family = shared body language (Sludge: round-bottom blobs · Mushroom: capped stalks · Insect: winged verticals). Variant = one silhouette-changing feature (spikes, armor cap, sac), never just a palette swap for *mechanically different* enemies. Palette swaps allowed only for stat-tier variants of the SAME behavior
- Enemies read cool/dark with glowing eyes ([[Art Direction]] palette law); attack anticipations flash warm — threat is always the warmest thing about an enemy
- Plump and expressive: every enemy is fun to hit BEFORE its behavior matters — jiggle, squash, bounce ([[Animation Standards]])

## Behavior grammar

- Steering: seek player(s) with per-family movement texture (Sludge waddle-hops, Mushrooms drift-shuffle, Insects swoop-orbit). Soft-body crowd separation ([[Combat System]])
- **Aggro**: default = nearest frog; hunter types commit to one frog for ≥ 4 s (prevents co-op aggro ping-pong) `TUNE`
- **Attacks are readable**: anticipation (warm flash + body coil) → active → recovery (punish window — every enemy attack has one)
- Enemy speed NEVER scales with waves ([[Design Philosophy]])

## Counter-matrix (roster balance tool)

Every enemy must be strong against ≥ 1 weapon archetype and weak to ≥ 1:

| | Sword (arc) | Hammer (launch) | Spear (pierce) | Tongue (pull) |
|---|---|---|---|---|
| Swarm fodder | **counter** | good | weak | good |
| Armored | weak (frontal) | **counter** (armor ×2) | **counter** (flank) | good (expose) |
| Fast/darting | good | weak | **counter** (lines) | **counter** (snipe) |
| Spawners/auras | good | good | **counter** (reach) | good |
| Anti-melee (spikes/poison-on-death) | weak (mash punished) | **counter** (range of ring) | good | **counter** (safe pull) |

A new enemy that doesn't change this matrix isn't weird enough to add ([[Design Philosophy]] stronger-vs-weirder).

## Elites

Family champions at waves 4/8/12/16 ([[Waves and Pacing]]): +size, palette shift, ONE new trick (never just stats). Elites get a mini spawn ritual (ground rumble + family-audio sting) and drop an essence fountain. In 2P, elites gain a mechanic, not just HP ([[Co-op Design]]).

## Naming & tone

Names are swamp-folk: short, chunky, croakable (Blobbit, Toxicap, Skeeter). Grotesque is welcome — extra eyes, dripping flesh, wrong anatomy, cool-disgusting not cartoon-cute (Ian: "eye coming out of his head"). No text lore in-game; personality lives in animation and audio.
