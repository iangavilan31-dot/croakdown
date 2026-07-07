# MYSTIC SWAMP — Reference Pack v2 (transcribed)

Ian pasted an EXPANDED v2 of the reference pack in chat on 2026-07-07 evening.
**The image itself is NOT on disk yet** — Ian: download it and drop it at
`docs/refs/REFERENCE_PACK_V2.png` (chat paste can't be saved from the session).
Everything actionable in it is transcribed below so work can proceed.

## Concept notes (verbatim from the sheet — these are ART LAW)
- top-down 2D arena survival
- frog is the player
- swamp theme: glow, mystery, rot
- low pixel density, heavy dithering
- natural, organic shapes
- **glow in small clusters, NOT soft blur** ← current render glows (lantern
  under-glow, orb charms, lotus bloom) are soft radial blurs; migrate them to
  clustered pixel-dot glows next art round

## What v2 adds over v1 (docs/refs/REFERENCE_PACK.png)
- **Frog animations**: idle ×6, tongue attack, blink, jump, CROAK (new), + a
  bottom strip of in-between frames w/ ripple + spark accents
- **Enemy animations**: idle / move / SPAWN (new — smoke-cloud emergence) /
  hit / defeated (dissolve to ripples)
- **Enemy VARIANTS (palette-swap family, exactly the VISUAL_BAR swarm plan)**:
  BLOBBIT (base), SPIKEBLOB, MUSHGLOOM (mushroom cap), FLOATLING, WISPOD
- **Tiles & terrain (named)**: water 1, water 2, deep water; lily pad, mossy
  pad, flower pad, mud; reeds, cattails, mushrooms, rock, fog
- **Light sources**: lotus flower, firelight mushroom, will-o'-wisp, glow
  reeds, LANTERN FROG SHRINE (statue prop — strong world-building anchor)
- **Effects**: firefly, tongue impact, water ripple, glow (lotus), splash,
  spore drift
- **Weapons (8 swords)**: Lily Blade (balanced), Reed Katana (fast), Moss
  Cleaver (heavy), Bone Slicer (bleed), Glow Lotus (magic), Toxic Bane
  (poison), Toxic Bane variant (point?), Wisp Edge
- **ITEMS & PICKUPS (fills the missing item-icon slot in the shop!)**: swamp
  heart, glow seed, moss armor, spirit orb, toxic vial, bone shard, lotus
  petal, reed spear, frog charm, mushroom cap, sludge core, dried tadpole,
  golden egg, cursed relic
- **Environment props**: stone shrine, broken pillar, water log, skull rock,
  hanging lantern, rune stone, root arch, bubbling mud
- **UI/HUD example**: pink hearts + wave track w/ skull + essence 326 (matches
  current HUD language), + PLAYER portrait chip, cooldown number chip, buff
  icons (arrow/shield/lotus), debuff icons (pink flame/skull)
- **Icon set 32×32** (larger set than v1's 34×34)
- **Font example**: full A-Z + 0-9 + punctuation ("WAVE 7 / UPGRADE / SWAMP
  BLESSING" style)
- **Mood reference thumbnails** (bottom-right corner)

## How to use next session
1. Get REFERENCE_PACK_V2.png from Ian's download into docs/refs/.
2. gen_art.py round 2: item icons (shop cards currently use glow-orb
   placeholders), enemy variants (palette-swap swarm), props, shrine.
3. Re-style glows to clustered-dot per the art law above.
4. Weapon sprites map to the future GOAL_PAPERDOLL system — don't build gear
   art before that goal's spike gate.
