# Animation Standards

> Part of the [[00 START HERE|CROAKDOWN bible]] · animation is gameplay · updated 2026-07-07

A defining feature of CROAKDOWN, budgeted like one. Quality bar: rivals modern premium indies (Dead Cells' readable snap, CotL's chunky charm). **Nothing slides. Everything breathes.**

## The required set (every creature, no exceptions)

Per [[Master Directive]], each creature ships with ALL of:

| Animation | Standard |
|---|---|
| **Idle** | ≥ 2 variants for heroes/bosses (breathing + a personality beat: blink, croak throat-bob, weight shift — reference pack: idle ×6 for the frog); 1+ for fodder, always breathing |
| **Walk/locomotion** | Family texture ([[Enemy Design Standards]]): frog hop cadence, sludge waddle-jiggle, mushroom root-shuffle, insect hover-bob. Feet/base never counter-slide vs velocity — the no-slide law is testable |
| **Attack** | Full anatomy: anticipation (squash/load) → active (stretch/snap) → follow-through → recovery. Anticipation is where WEIGHT lives ([[Combat System]]) |
| **Hit reaction** | Per tier: flinch / stagger / launch-tumble (spinning ballistic) / armored-absorb shudder ([[Combat System]]) |
| **Death** | ≥ 2: normal + overkill burst; status deaths (shatter/crumble/melt) where statuses apply ([[VFX Standards]]) |
| **SPAWN** | Smoke-cloud emergence (reference pack law) — nothing pops into existence |
| **Secondary motion** | Follow-through on soft parts: bellies, caps, wings, robes, weapon straps — 1–2 frame lag on the main mass |
| **Squash & stretch** | Every impact and every hop; volume-conserving (squash wide = squash short) |

Heroes add: dash-hop, tongue-lash, downed-crawl, revive-channel, ready-croak, evolution reveal per weapon tier ([[Progression and Evolution]]). Bosses add: entrance, phase transitions, kill cinematic ([[Boss Design Standards]]).

## Frame economy (pixel-art discipline)

Painterly pixel animation reads through POSES, not frame counts: 4–8 frames per cycle with strong keys beats 20 mushy frames. Snappy timing: 1–2 frame anticipation-to-active snaps for lights; long held anticipations for heavies (the [[Bog Hammer]] hangs at the top of its arc). Smears and multiples are encouraged on fast arcs (the sword's active frames are 60% smear).

## Runtime animation (code-driven, on top of sheets)

The engine adds life the sheets can't ([[Technical Architecture]]):
- Micro squash-stretch scaling on hops/impacts (transform, not redraws)
- Hitstop sprite-shake ([[Game Feel Standards]])
- Tumble rotation for launches
- Breathing scale oscillation on idles (±1.5%)
- Paper-doll layering per `docs/GOAL_PAPERDOLL.md` — equipment sheets frame-matched to the body, depth-sorted per frame (GATED behind its spike)

## Review ritual

Every animation is reviewed IN GAME at gameplay scale against: (1) no-slide check, (2) silhouette check per key pose ([[Sprite and Scale Standards]]), (3) the one-question test — *does hitting/being-hit-by this feel better than last week?* Contact-sheet + in-game GIF per creature logged with the art pass ([[Quality Gates]]).
