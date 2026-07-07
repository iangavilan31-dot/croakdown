# Quality Gates

> Part of the [[00 START HERE|CROAKDOWN bible]] · under the bar = doesn't ship · updated 2026-07-07

CROAKDOWN self-grades nothing. Every gate is externally verifiable: blind critics, the hostile vision critic, headless tests, or Ian's hands on a controller.

## Gate 1 — The Swing Test (ends Phase 1)

*The [[Vision]] promise, operationalized:* one frog, one stick, one sludge family, zero rewards, zero progression. Verdicts:

1. **Feel checklist** (all YES, verified on video capture): weight readable in silhouette alone · every hit answers on the contact frame · launches/bowling/wall-splats occur naturally in normal play · mash-only play feels good AND timing/spacing play is visibly ~2× better · 5 uninterrupted minutes of swinging stays fun with nothing to earn
2. **3 blind adversarial critics** on captured gameplay clips: *"rate the melee feel vs Hades/Dead Cells clips at the same fidelity level, 1–10"* — median **≥ 7.5** (prototype fidelity discount, feel judged through placeholder art)
3. **Ian plays it.** His first unprompted comment is about feel, not content. He says some version of "again."
4. Perf: worst-case pond swarm at 60 FPS, zero GC events ([[Performance Budget]])

Failing any → iterate Phase 1. There is no schedule pressure that overrides this gate — it IS the game.

## Gate 2 — Slice Gate (ends Phase 2)

- **VISUAL_BAR** ≥ 42/50, no axis < 7, on every live screen (`docs/VISUAL_BAR.md`, `scripts/critique.mjs` — hostile vision critic; Anthropic critic when Ian sets the key, gpt-4o fallback logs which graded)
- 3 blind critics ≥ **8/10** on the slice as a purchasable-demo experience
- Real-click QA green: full slice run via visible Playwright (`scripts/shoot.mjs`), real keys, both input paths
- 2P full slice with Ian + friend — at least one unprompted co-op story retold afterward ([[Design Pillars|Pillar 5]], measured the only way it can be)

## Gate 3 — Content Gate (ends Phase 3)

Full 20-wave 2P run end-to-end · every roster item meets its completeness contract ([[Weapon Design Standards]], [[Enemy Design Standards]], [[Boss Design Standards]]) · headless suite green · no placeholder assets on shipped surfaces · all twelve build end-states reachable and visually distinct.

## Gate 4 — Ship Bar (ends Phase 4)

- **3 blind adversarial critics ≥ 8.5/10** vs the MUST-BEAT presentation bar (feats list in `GYAT.md`)
- VISUAL_BAR green on ALL screens incl. boss intros, ceremony, run-end
- 60 FPS locked through The Bloom phase IV (the declared worst case)
- DualSense physically verified by Ian (flagged, never faked)
- Every [[Decision Log]] entry reconciled with the vault (no undocumented drift)

## Standing verification law

Real clicks on visible pages, never `dispatchEvent`, never hidden tabs (WebGL/canvas freezes rAF) · quality-critical = 3 blind critics, and you don't deploy under the gate (PANE precedent) · honest reports: failing scores get written down, not reworded.
