# Art Direction

> Part of the [[00 START HERE|CROAKDOWN bible]] · updated 2026-07-07

The visual quality must be exceptional — intentionally handcrafted, never an AI prototype. **The reference pack is the visual authority**: `docs/refs/VISUAL_REF_01.png` (pixel), `VISUAL_REF_02.png` (painterly mood primary), `REFERENCE_PACK.png` + v2 (transcribed in `docs/refs/REFERENCE_PACK_V2_NOTES.md` — image pending Ian's download to `REFERENCE_PACK_V2.png`). The `docs/VISUAL_BAR.md` gate stands in full: **every screen ≥ 42/50, no axis < 7**, graded by the hostile vision critic (`scripts/critique.mjs`).

## Mood

Dreamlike · mysterious · ancient · peaceful · dangerous. Cute-but-eerie, NOT kid-friendly. A bioluminescent night swamp you'd want to live in until you notice what's watching. References (scoped): Cult of the Lamb (cute-dread + chunky shapes) · Hades (impact clarity) · Dead Cells (motion sells) · Hyper Light Drifter (atmosphere + restraint) · Eastward/Moonlighter (painterly pixel warmth).

## Style `LOCKED`

**Painterly pixel art.** Pixel renders, painterly mood (Ian-approved 2026-07-07: pixel is the format, REF_02's painting is the grading target). Reference-pack art law, verbatim:
- low pixel density, heavy dithering
- natural, organic shapes
- **glow in small clusters, NOT soft blur** (open migration task: current soft radial glows → clustered pixel-dot glows)
- chunky readable sprites, excellent silhouettes, heavy atmosphere
- nearest-neighbor scaling in the renderer, no mixed pixel densities within a scene

## Palette law `LOCKED`

- **Body of the world**: dark teal, desaturated swamp greens, bog purples, muddy browns, black water
- **Light**: warm gold — lanterns, essence, reward, player warmth. Bioluminescence is the PRIMARY light source (lotus, gill-glow, wisps, glow reeds)
- **Danger**: hot pink — the ONLY other accent. Enemy attack flashes, corruption, The Bloom's veins
- Accents ONLY gold + hot pink. Nothing else, ever
- Readability grammar ([[Game Feel Standards]]): enemies cool/dark with glowing eyes; players + essence + telegraphs warm

## UI chrome `LOCKED 2026-07-07`

Dark **swamp-glass** panels (deep green-black translucent) · cream text · warm gold accents · hush vignette + fireflies behind every overlay · chunky Outfit-style type. The white-frosted/ink-on-light house chrome is RETIRED for this project (scored 2–3/10 cohesion vs REF_02). **Banned (3×, workspace law)**: neon-cyan holo HUD, scanlines, mono microtype, cursive gold slop, generic AI-template feel. Spider-punk collage energy lives in EXACTLY one place: boss intro cards ([[Boss Design Standards]]).

## Character mandates

- **Large readable frogs** — charismatic gritty warriors, not mascots. Distinct silhouettes per hero + team rim-lights ([[Co-op Design]])
- **Plump expressive enemies** — grotesque welcome: extra eyes, dripping flesh, wrong anatomy; cool-disgusting, never cartoon-cute ([[Enemy Design Standards]])
- Weapons look COOL and heavy; the sword drags ([[Sword Line]])
- Scale table and sheet specs: [[Sprite and Scale Standards]]

## Production pipeline

- **gpt-image-1** generation via `tools/gen_art.py` (proven GEEKED pipeline) with a style-lock prefix per asset class; budget ~$2–4/pass. PIL placeholders FIRST so the game is never art-blocked; swap via manifest; verify every sprite on a contact sheet BY EYE
- **No generic assets** — nothing from asset packs, nothing off-model. Every asset passes the silhouette check and the palette law before wiring
- Never run browser QA while generators write into `public/` (Vite full-reload gotcha, [[Decision Log]])
- Equipment-on-frog art is GATED behind the paper-doll spike (`docs/GOAL_PAPERDOLL.md`) — gear is a system before it's art

## World anchors (from the v2 pack — canon props)

Lantern Frog Shrine (statue, world-building anchor) · stone shrine · broken pillar · water log · skull rock · hanging lantern · rune stone · root arch · bubbling mud · named tiles (waters, pads, mud, reeds, cattails, mushrooms, rock, fog). These are the vocabulary of every arena: [[Environment and Reactivity]].
