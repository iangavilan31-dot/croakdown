# /goal — VISUAL BAR (croakdown) — Ian's gate, verbatim intent, 2026-07-07

One gate: **every screen ships at ≥ 42/50 vs REF_02, no axis under 7, graded by a hostile
vision critic on a REAL screenshot** — or it does not ship. No screen graduates on vibes.

## References
- **PRIMARY: `docs/refs/VISUAL_REF_02.png`** — painterly night-swamp, mellow frog, glowing
  lotus, dark blob swarm, minimal HUD. Floor for mood, lighting, composition, frog-feel.
- **Secondary: `docs/refs/VISUAL_REF_01.png`** — rugged pixel variant. If a screen reads
  cleaner/cuter than REF_02, pull it back toward REF_01's grit. REF_02 wins ties.
- (Ian: drop the two PNGs from chat into `docs/refs/` — critic uses rubric + proxies until then.)

## Rubric (/50, screenshot-graded)
1. **Lighting & atmosphere /10** — bioluminescent glow IS the light source; drifting fog;
   vignette; mystic and hazy, never flat. Dreamlike, not literal drug imagery.
2. **Palette discipline /10** — desaturated swamp greens/teals base; **hot pink + warm gold
   are the ONLY bright accents. Any fourth saturated color is a defect.**
3. **Composition & readability /10** — silhouette-first; at full co-op swarm density every
   threat/projectile/pickup reads instantly. Beautiful but unreadable = fail.
4. **Character feel /10** — frogs mellow, chunky, on-model, heavy-lidded, slightly slumped;
   equipped gear visibly ON the frog (see GOAL_PAPERDOLL.md), on-model.
5. **Cohesion & finish /10** — every menu/HUD/screen lives in the same painted world; no
   programmer-art seams, no default-font UI. One hand made all of it.

## The loop (hard gate)
1. Boot real build → visible-Playwright screenshot of the screen in a representative state
   (world = mid-swarm, gear visible).
2. `node scripts/critique.mjs <screen>` → sends screenshot + REF_02 to the Anthropic API
   vision model (ANTHROPIC_API_KEY) prompted as a HOSTILE ART DIRECTOR: rubric /50, single
   worst axis, one concrete fix.
3. **< 42 or any axis < 7 → screen is held.** Fix → re-shoot → re-grade until it clears.
4. Log every verdict: vault `claude-refs/projects/croakdown/visual-grade-<screen>.md`
   (score, worst axis, fix applied, before/after paths).

**Screens that must pass:** title · lobby/co-op join · world mid-swarm · pause · upgrade/shop ·
wave-clear/build · boss intro · death/revive · victory · settings. If it renders pixels, it gets graded.

## Swarm rules (co-op scale)
- 1-2 base enemy bodies, variety via palette swap + modular overlays (spikes/crowns/size/eye
  color) — parameterized assets, not 40 redraws.
- Readability at max 2P density is a ship-blocker (Composition axis).
- Accent discipline under load: enemies live desaturated; ONLY telegraphs, hits, elite markers
  borrow pink/gold.
- Budget: hero-paint the STATIC world + UI; keep the high-count swarm clean/chunky/on-palette.

## North stars (calibrate, don't copy)
Cult of the Lamb (closest) · Darkest Dungeon (readability under load) · Don't Starve (grit) ·
Night in the Woods (cohesive painted UI).

## Done means
Every shipped screen logged ≥ 42/50, no axis < 7 · swarm reads at max co-op density · gear
renders on the frog animated + live-updating (linked goal) · menus/HUD live in the painted
world. It reads as a shipped indie game, not a prototype.
