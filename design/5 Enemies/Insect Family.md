# Insect Family

> Part of the [[00 START HERE|CROAKDOWN bible]] · family per [[Enemy Design Standards]] · updated 2026-07-07

**Silhouette language**: winged verticals — thin bodies, wing shimmer, hover-bob; swoop-orbit locomotion (the only family that doesn't walk). **Palette**: chitin darks with iridescent wing highlights; attack states glow wing-warm. Insects own TEMPO — they're the fast pressure that keeps heavy-weapon frogs honest and makes the [[Giant Tongue]] and [[Reed Spear]] shine. Ian roster (verbatim): mosquito, dragonfly, firefly, moth, queen.

## Skeeter — the mosquito `Wave 7+`

- **Role**: harassment; punishes standing still. Answered by: tongue snipe (its hard counter), spear thrusts, dash-timing
- **Stats** `TUNE`: HP 15 · speed 110% of frog (fastest enemy in the game — speed cap law: nothing ever exceeds 115%) · mass 0.6 · essence 2
- **Attack**: orbits at 150 px, then darts in to latch (20f wind-whine windup — audio-first telegraph); latched: drains 2 HP/s until hit off (any damage, partner tongue, or dash shakes it) `TUNE`
- **Reactions**: dies to almost anything — the joy is CONNECTING; swat-kills mid-dart feel like tennis
- Drained HP visibly swells its abdomen red — flying gore, grotesque-cute, and a fatter target

## Darter — the dragonfly `Wave 12+`

- **Role**: line pressure; introduces lane-dodging. Answered by: spear skewer along its line, sidestep + punish, hammer heavy on the recovery
- **Stats** `TUNE`: HP 50 · speed 90% (100% during charge) · mass 1.2 · essence 4
- **Attack**: hover-locks, draws a shimmering charge LINE (0.8 s, honest telegraph — the line IS the hitbox preview), then charges its full length; 10 dmg + pierce-through. Long overshoot recovery = punish window
- Darter packs (3–5) stagger their lines — a crossing-lanes bullet-hell moment built from BODIES, not bullets (identity-safe)

## Emberfly — the firefly `Wave 13+ mixed`

- **Role**: light that lies. In a game where glow = friendly ([[Art Direction]]), the Emberfly weaponizes trust — a warm mote that drifts close and IGNITES
- **Stats** `TUNE`: HP 10 · speed 70% erratic drift · mass 0.5 · essence 2
- **Attack**: self-ignites near a frog (1 s flare-up tell: its glow shifts gold → hot pink, the danger accent), leaving a burning trail 3 s; touch = burn stack
- Killed before flare: pops as a tiny heal-mote (+2 HP). Risk-reward swatting; tongue-catch is safe and rewarded
- Density-capped: ≤ 6 live `LOCKED` (readability — too many false-friendly lights breaks the palette law)

## Duskmoth — the occluder `Wave 13+`

- **Role**: vision pressure. Answered by: killing it fast, fighting OUT of the dust, tongue through the cloud
- **Stats** `TUNE`: HP 60 · speed 55% · mass 1.0 · essence 4
- **Attack**: none direct — wing-beats shed scale-dust clouds (120 px, 4 s) that dim/blur everything inside (soft occlusion shader layer, [[VFX Standards]]); enemies in dust get +10% dodge-feel (they're simply harder to SEE) `TUNE`
- Drawn to the brightest thing on screen — including Emberflies, lantern props, and gold-heavy evolved frogs (a Living Vine frog attracts moths; the world reacts to your build — pillar 6 poetry)
- Its dust NEVER covers enemy anticipation flashes (readability override, [[Game Feel Standards]])

## Insect Queen — family champion `Elite waves / Wave 16+`

Wasp-bodied matriarch, twice Skeeter scale, egg-heavy abdomen. **One trick**: screams a pheromone pulse — all live insects on screen briefly re-target and CONVERGE on one frog (the co-op "save me" moment). Births 2 Skeeters on a 8 s cycle. Kill priority reads instantly: she is the only insect with a crown-glow.

---
*Mother Mosquito, the wave-10 legend, is the Skeeter concept elevated to myth — see [[Mother Mosquito]].*
