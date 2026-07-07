# VFX Standards

> Part of the [[00 START HERE|CROAKDOWN bible]] · updated 2026-07-07

VFX sell impact and never cost readability. Every effect belongs to one of four layers with strict budgets ([[Performance Budget]]).

## Layer model (draw order)

1. **Ground decals** — permanence: blood pools, bones, craters, furrows, scorch, cut reeds. Budget 250, oldest fade 10 s over-budget `LOCKED` ([[Game Feel Standards]])
2. **Under-entity** — telegraph glyphs, shadows, water ripples, aura rings (Eldershroom, shrine glows)
3. **Entity-attached** — hit flashes, status tints/drips, arc trails, tongue sprite, rim-lights
4. **Over-entity** — particles (sparks, blood sprays, spores, petals), shockwave rings, occlusion veils (Duskmoth dust — the ONE effect allowed to dim entities, and never their anticipation flashes)

## Impact grammar (per hit class)

- **Light hit**: 6–10 px spark cone in swing direction + micro blood specks + white flash
- **Heavy/finisher**: bigger cone + directional blood spray (8–14 droplets, land as decals) + 1 shockwave ring + dust ring at victim's feet
- **Kill**: blood burst scaled by overkill · corpse physics (tumble→decal conversion) · essence pop w/ magnet arc trails
- **Overkill burst**: gibs (2–4 body-part sprites become decals) + fountain spray — Ian's gore law: all kills bleed a little, heavy kills bleed a lot
- **Status**: poison = rising green motes + drip decals · burn = ember flecks + char edge · freeze = rime crust growing on the SPRITE (3 stacks = full ice shell) · bleed = trailing drops while moving

## Gore rules

Directional, physical, persistent — never gratuitous-random. Blood sprays AWAY from the blow; arcs paint crescents on the ground (a sword frog's kill-field is legible in the decals). Color: deep red reading toward the danger-pink family under night light `TUNE by eye vs palette law`. Bosses bleed at scale (barrel-drops, not specks) and leave era-defining decals (wing fall, corpse-terrain — [[Bog Leviathan]]).

## Signature effects (each weapon/system owns a shape)

- Sword: crescent arc trail (tier-colored, [[Sword Line]]) · petals at tier 3+
- Hammer: ground ring + mud clods
- Spear: needle gleam line + seam-of-light (tier 4)
- Tongue: elastic ribbon + wet impact star
- Essence: gold spore-motes (world's warmest gold — reward is the brightest friendly thing on screen)
- Synergy payoff: golden spore burst ([[Co-op Design]])
- Evolution moment: petal/spore bloom column ([[Progression and Evolution]])

## Discipline

- Pixel-native particles (chunky quads at scene pixel density) — no smooth engine-y particles inside pixel art; clustered-dot glow law applies to all emissive VFX ([[Art Direction]])
- Every effect variant capped and pooled; budgets in [[Performance Budget]]
- The telegraph always wins: no VFX may cover an enemy anticipation flash or a ground glyph ([[Game Feel Standards]] readability discipline)
- New VFX enter via the one-event pipeline ([[Technical Architecture]]) — an effect that can fire without its audio twin is a bug
