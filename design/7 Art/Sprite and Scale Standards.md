# Sprite and Scale Standards

> Part of the [[00 START HERE|CROAKDOWN bible]] · updated 2026-07-07

Ian law: sprite size up **+30–50%** vs the TD build; fewer, LARGER enemies instead of hundreds of dots — more readable, easier to animate, stronger personality, heavier weapons, memorable enemies.

## Scale table `LOCKED (classes) / TUNE (px)`

Logical canvas 1920×1080, single fixed arena ([[Co-op Design]] camera law). All sprites authored at 1× and nearest-neighbor scaled; one consistent pixel density per scene.

| Class | Height | Entities |
|---|---|---|
| Hero frog | 84 px | player frogs (TD era was ~56 — this is the +50%) |
| Fodder | 64 px | Blobbit, Skeeter, Mushgloom, Emberfly |
| Mid | 96 px | Spikeblob, Toxicap, Bogpop, Darter, Duskmoth |
| Bruiser | 128 px | Gloopa, Shellshroom, Broodmother |
| Elite / large | 160–200 px | family elites, Eldershroom, Sludge King, Insect Queen |
| Boss | 280–512 px | [[Drowned King]] 320 · [[Mother Mosquito]] 280 wingspan · [[Bog Leviathan]] 480 head · [[The Bloom]] 512 |
| Weapons | oversized | the sword is LONGER than the frog is tall — weapons break the frog's bounding box on purpose |

Screen budget at cap (~70 live, [[Performance Budget]]): a full swarm covers ~35% of screen area — dense but parting visibly under a heavy swing.

## Sheet & authoring standards

- Sprite sheets per creature: consistent cell grid, anchor at feet-center (shadow point), pivot data in the manifest
- Every creature ships its full [[Animation Standards]] set — the sheet layout mirrors the reference pack's animation strips (idle / move / SPAWN / hit / defeated, plus per-page extras)
- Palette-swap variants share sheets (tier recolors — legal for same-behavior stat tiers only, [[Enemy Design Standards]])
- Paper-doll equipment sheets match the frog body's frame layout exactly, depth-sorted per frame (`docs/GOAL_PAPERDOLL.md` — Mana Seed/Seliel reference; GATED until its spike passes)
- Shadows: every airborne/ground entity has a soft blob shadow — it's the readability anchor during launches and boss dives
- Outlines: 1 px darkest-body-color selective outline (not black sticker lines); rim-light side follows the nearest light source, team-color rims for players

## Silhouette check (per asset, before wiring)

1. Fill the sprite solid black — is it identifiable at gameplay scale?
2. Place among its family — distinct?
3. In fog + dust ([[Insect Family|Duskmoth]]) — does the eye-glow + shape still read?
4. Attack anticipation pose — readable as THREAT at 100% zoom in a crowd?
Fail any → redraw. Log verdicts with the art pass in the vault ([[Quality Gates]]).
