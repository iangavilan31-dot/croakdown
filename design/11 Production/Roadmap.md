# Roadmap

> Part of the [[00 START HERE|CROAKDOWN bible]] · development order is law, never reversed · updated 2026-07-07

`Bible → Combat Prototype → Vertical Slice → Content → Polish.` Each phase ends at a [[Quality Gates|gate]]; under the gate = the next phase doesn't start. Never skip ahead.

## Phase 0 — Design Bible ✅ (this vault, 2026-07-07)

Complete interconnected vault, no placeholder pages, every system implementable without guessing. Maintenance is perpetual: decisions land here the session they're made.

## Phase 1 — Combat Prototype 🔨 IN PROGRESS (core built 2026-07-07)

**One frog. One stick. One family. A graybox pond.** Nothing else.

- ✅ Sim/render split + pools + spatial hash + input service + HitEvent one-event pipeline ([[Technical Architecture]]) — `src/engine`, `src/sim`
- ✅ Frog: hop locomotion, dash-hop w/ i-frames, idle life (blink, eye-track, weight) ([[Movement and Controls]])
- ✅ [[Sword Line]] tier-1 stick: full attack anatomy, 150 ms buffer, dash/chain cancels, 3-hit chain, tap/hold-heavy
- ✅ [[Sludge Family]]: Blobbit + Gloopa + Spikeblob with reaction tiers + mass/impulse/launch/tumble/**bowling**/wall-splat/crowd-separation physics ([[Combat System]])
- ✅ FULL juice stack from day one ([[Game Feel Standards]]) — placeholder art, REAL feel; blood + bone + gel **permanence** accumulating; trauma shake; hitstop
- ✅ [[Giant Tongue]] tier-1 pull-into-swing (identity verb, in the prototype)
- ✅ Headless suite (23 tests: frame data, buffer/cancel/chain, physics, determinism, 7200-tick soak, cap) + `?perf` overlay ([[Performance Budget]])
- ✅ TD module deletion per the salvage map; visible-Playwright QA driver rewritten for melee (`scripts/shoot.mjs`)
- ⏳ **Remaining for the gate**: melee praise-mining research pass; a real play-session feel-tuning loop (the numbers are first-draft `TUNE`); the 3-blind-critic pass on captured clips; Ian's hands-on "again" verdict
- **GATE: the Swing Test** — see [[Quality Gates]]. Core is proven (perf sim 0.01ms/render 0.18ms, combat + permanence + telegraphs working on a visible page). **Not yet passed**: needs feel-tuning + the critic/Ian verdicts. We iterate HERE until the pond is undeniably fun.

## Phase 2 — Vertical Slice

Waves 1–5 as the shipped game would play:
- Wave director + weirdness schedule w2/w3 + essence/level-up/shop rewired to melee ([[Waves and Pacing]], [[Shop and Economy]])
- [[Drowned King]] complete: ritual, phases, Bloom Chest ceremony
- 2P co-op: join, shared wallet/shop/combo, down/revive, scaling ([[Co-op Design]])
- Sword tiers 1–3 + tongue tiers 1–2 with evolution moments ([[Progression and Evolution]])
- Art pass 1 (hero, sludge family, arena, King — [[Art Direction]] pipeline + contact-sheet review); audio pass 1 (sword+tongue identities, ambience bed, leitmotif + 1 combat track); title→run < 30 s shell
- 2 secrets in ([[Secrets and Discoveries]]: Golden Dragonfly + Frog Statue)
- **GATE: Slice Gate** — VISUAL_BAR ≥ 42/50 on all live screens + blind critics ≥ 8/10 on the slice + Ian plays it with a friend

## Phase 3 — Content

All 20 waves · all 3 families + elites · remaining bosses ([[Mother Mosquito]], [[Bog Leviathan]], [[The Bloom]]) · [[Bog Hammer]] + [[Reed Spear]] lines · items for the twelve build end-states · relics · remaining secrets · danger pips · [[Weapon Roadmap]] lines as budget allows · paper-doll spike then gear rendering (`docs/GOAL_PAPERDOLL.md`)
- **GATE: Content Gate** — full 2P run end-to-end, all systems, no placeholder assets on any shipped surface

## Phase 4 — Polish & Ship Bar

Full art/audio coverage audit · animation review ritual per creature · perf soak (Bloom IV) · settings/accessibility complete · Steam wrapper spike · DualSense physical verify (Ian) · balance passes vs the twelve end-states
- **GATE: Ship Bar** — 3 blind adversarial critics **≥ 8.5/10** vs the MUST-BEAT bar, VISUAL_BAR green on every screen, 60 FPS locked. Under the bar = doesn't ship

## Standing rhythm (every phase)

Commit every working state · decisions → [[Decision Log]] the same session · vault updated before code when design changes · `SESSION_START.md` + seatbelt files current · PROJECTS.md + vault entity page at milestones.
