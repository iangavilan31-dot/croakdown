# Movement and Controls

> Part of the [[00 START HERE|CROAKDOWN bible]] · updated 2026-07-07

Movement must be satisfying with no enemies on screen. The frog is springy, weighty, and expressive — hop cadence is the game's heartbeat.

## Movement model

- **Hop-based locomotion**: continuous input, but the frog moves in a rapid hop cadence (~7 hops/s at full speed `TUNE`) with per-hop micro squash-and-stretch and mud/water reactions per landing ([[Environment and Reactivity]]). Reads as ground movement, feels alive. Never a glide — *nothing slides* ([[Animation Standards]])
- Base speed 330 px/s `TUNE` · acceleration to full in 90 ms · instant stop (survivor-genre precision)
- **Dash-hop** `LOCKED (shape)`: 260 px leap over 0.18 s · i-frames frames 2–9 (0.13 s) · 2 charges · 1.4 s recharge each `TUNE` · usable to cancel attack recovery ([[Combat System]]) · landing splash/dust always · brief afterimage trail
- **Water/mud modifiers**: shallow water slows 12% but big splash feedback; mud slows 18% and holds skid decals; lily pads bounce (+30% next hop distance) — movement THROUGH the swamp is a texture, not friction for its own sake `TUNE all`

## Input maps

Controller-first (DualSense over USB, MDN "standard" mapping, Chrome-first). Remap UI is a v1 requirement; below are defaults.

| Verb | DualSense | Keyboard/Mouse (P1) | Kbd fallback (P2) |
|---|---|---|---|
| Move | Left stick | WASD | Arrows |
| Aim | Right stick (optional override; else move-dir) | Mouse | Move-dir |
| Attack / hold Heavy | Square | Left click | Enter |
| Tongue | R1 | Right click | Right Shift |
| Dash-hop | X (cross) | Space | Right Ctrl |
| Interact / revive (hold) | Circle | E | / |
| Ready-up (wave start, hold) | Circle | E | / |
| Pause | Options | Esc | — |

- Gamepad polled every rAF; join = "press any button" on the join screen (gesture gate)
- If `mapping !== "standard"`, route to in-game remap before play
- Physical DualSense verification is Ian's loop — flag in reports, never fake it

## Feel requirements (testable)

- Input-to-photon for movement < 3 frames; dash responds on the next sim tick, always
- The dash never rubber-bands: no cooldown-empty dead press — an empty-charge press buffers 150 ms like attacks
- Coyote rules for edges of hazards (75 ms grace) `TUNE`
- Standing still is animated: idle variants, blink, croak throat-bob, weapon weight shifting ([[Animation Standards]]). The character is alive before the first input — this is the title-screen-to-combat continuity promise

## Accessibility

Shake slider (exists) · damage numbers toggle (default OFF) · hold-to-mash option (accessibility auto-chain at 80% effectiveness — assists never beat manual play) `TUNE` · colorblind-safe status tints checked at art time ([[Art Direction]]).
