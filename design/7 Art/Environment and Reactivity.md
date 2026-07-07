# Environment and Reactivity

> Part of the [[00 START HERE|CROAKDOWN bible]] · pillars 4 & 6 made concrete · updated 2026-07-07

The swamp is another character — interactive but never distracting. It exists to make combat more satisfying, never to replace it. Two budgets: **ambient life** (always on, even in menus) and **reactions** (answers to gameplay).

## Ambient life (nothing is ever static)

Always running, cheap, pooled ([[Performance Budget]]):
- Drifting fog banks (2 parallax layers) · glowing spore motes on slow air currents · wandering fireflies (≤ 12, they FLEE combat and RETURN in quiet beats — the swamp's mood ring) · swaying reeds/cattails (wind phase offsets) · animated water (reference tiles: water 1/2, deep) · breathing lotus flowers · will-o'-wisp lights at the arena's dark edges
- Light sources per the v2 pack: lotus flowers, firelight mushrooms, glow reeds, hanging lanterns, the Lantern Frog Shrine. All clustered-dot glow, never soft blur ([[Art Direction]])
- **Menus contain ambient motion too** (Ian-verbatim): title vista breathes; shop has the lantern shopkeeper + fireflies behind the glass

## Reaction contract (every player action answers within 1 frame)

| Action | World response |
|---|---|
| Hop landing | Water ripple ring / mud squish + skid decal / lily-pad bob & bounce |
| Dash | Splash wake or mud spray + reed-part along the path |
| Sword arc | Reeds/cattails in the arc CUT (fall as decals, regrow over 60 s) · water surface slashed (linear ripple) |
| Hammer slam | Mud crater decal · mushrooms in ring BURST (spore puff) · props hop · water shock ring |
| Spear thrust | Reed-line parts · skewered droplets |
| Tongue | Ripple at impact point · props wobble |
| Enemy launch/tumble | Drag furrows in mud · splash chains across water · reeds flattened in the tumble path |
| Kill | Blood/gore per [[VFX Standards]] · fireflies scatter |
| Explosion / boss slam | Trees at arena edge SHED leaves · all reeds bow outward · lanterns swing |

Breakables: mushroom clusters (burst), rotten logs (splinter), reed stands (mow-able). Breakables never gate progress and never drop loot — they exist purely so swinging through the world feels good (pillar 4 discipline: support, never replace).

## Arena design rules

- One arena at v1 (quality over quantity), built from the named tile/prop vocabulary; visual variety comes from boss world-state changes ([[Boss Design Standards]]) and the run's accumulating permanence
- **Splat surfaces on purpose**: rocks, root arches, the arena's edge treeline — wall-splat geometry is level design ([[Combat System]])
- Deep-water outer ring: enemies emerge from it (SPAWN smoke), secrets glint in it, [[Bog Leviathan]] owns it
- Terrain speed texture: mud/shallows/pads per [[Movement and Controls]] — a movement texture map, authored per arena
- The arena is a STAGE for permanence: by design, empty space exists for the run to fill with story ([[Game Feel Standards]])

## Restraint law

Ambient motion NEVER exceeds 10% of the screen's motion energy during combat `TUNE by eye` — the fight is always the loudest thing. When readability conflicts, ambience dims (fog thins near dense fights automatically). The environment's job is to make the combat louder, not itself.
