# /goal — PAPER-DOLL EQUIPMENT (linked goal — own system, own gate)

Ian's spec, 2026-07-07. **Do NOT start content-painting equipment until this goal passes its
own skeptic gate + a proving spike** (one weapon, full layered animation cycle, on-model,
depth-correct). Gear is a system before it's art.

- Every item the frog picks up (shield, sword, …) renders **visibly ON the frog** and
  **updates live** the instant it's acquired.
- Technique: **layered paper-doll sprites** — each equipment piece is its own sprite sheet
  with a frame layout identical to the frog body, layered at runtime, **depth-sorted
  in-front-of / behind the body per animation frame** (Mana Seed / Seliel = canonical
  reference implementation).
- **Full animations per item**, not static overlays: shield = raise/block/bash; sword =
  wind-up/swing/recover; each synced to the frog body animation.
- Variants via palette swap (weapon tiers = recolors, not redraws).
- Co-op: both players' loadouts render independently and stay readable in a swarm — feeds
  the VISUAL_BAR Composition axis.

Status: SPEC ONLY. Next step when picked up: skeptic gate on the approach (frame-layout
feasibility with gpt-image-1-generated sheets vs hand-drawn), then the one-weapon spike.
