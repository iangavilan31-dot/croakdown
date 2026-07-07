# Boss Design Standards

> Part of the [[00 START HERE|CROAKDOWN bible]] · updated 2026-07-07

Ian loves bosses — they get the biggest animation, audio, and spectacle budget in the game. Four **swamp legends** at waves 5/10/15/20: [[Drowned King]] · [[Mother Mosquito]] · [[Bog Leviathan]] · [[The Bloom]]. **No generic humanoid bosses** (Ian-verbatim ban). Every boss is a creature of swamp myth with a silhouette no other game has.

## The boss ritual `LOCKED (sequence)`

1. **The hush** — remaining wave enemies flee/burrow; music dies to ambience; water stills; fireflies vanish. The world announces the legend (wave-transition-as-world-state law)
2. **Arrival** — each boss has a bespoke entrance FROM the swamp (rises from deep water, descends from canopy dark…). Never a fade-in
3. **Intro card** — freeze-frame collage card: name + ONE tag line, spider-punk energy (the single sanctioned place for that style). ≤ 2 s, skippable by input
4. **The fight** — phases below
5. **The kill** — slow-motion final blow (0.4× speed, 0.6 s) · massive gore/essence burst · the world exhales (light warms, fireflies return, music resolves)
6. **[[Waves and Pacing|Bloom Chest ceremony]]** — the authored jackpot

## Phase rules

- 2–4 phases. Transition at HP% **OR** elapsed time, whichever first (Brotato Rhino pattern — fights never stall)
- **Skull-notched HP bar**: boss HP is a horizontal bloom-vine at screen top; phase thresholds are visible bulbs that CRACK as you pass them — spatial dread, zero text (MUST-BEAT feat)
- Every phase changes the WORLD, not just the boss: water level, fog density, light color, prop states ([[Environment and Reactivity]]). The arena fights alongside its legend
- Phase transitions are safe beats (2–3 s invulnerable spectacle) — players get to breathe and *watch*

## Fairness laws

- Every damaging attack: readable anticipation ≥ 30 frames `TUNE`, distinct audio pre-cue, warm-flash grammar ([[Enemy Design Standards]])
- All adds spawn with full telegraphs (~1 s ground glyph)
- **Soft DPS floor**: no boss dies in < 45 s (anti-anticlimax) `LOCKED` — implemented as phase-gated damage caps, invisible to honest builds
- **Soft enrage, never a wipe timer**: extended fights escalate add pressure; the deadline physically arrives (research law), it never just ends the run
- Bosses are mass ∞ (no displacement) but MUST flinch visually on heavy hits and show accumulating battle damage per phase — hitting a boss has to feel as good as hitting fodder ([[Game Feel Standards]] one-event rule applies in full)

## Co-op clauses

Each boss gains a *mechanic* in 2P, not inflated stats ([[Co-op Design]]): split attention demands, dual light-lures, drag-rescues. A boss must create at least one "I saved you / you saved me" story per fight.

## Budget reality

A boss costs roughly 4× an elite (bespoke rig, 2–4 phase kits, entrance + kill cinematics via runtime animation, unique music cue per [[Audio Direction]]). Four is the right number at this quality bar — resist the fifth until all four are unmissable ([[Design Pillars|Pillar 3]]).
