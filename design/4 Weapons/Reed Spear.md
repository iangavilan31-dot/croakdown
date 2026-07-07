# Reed Spear

> Part of the [[00 START HERE|CROAKDOWN bible]] · the duelist · updated 2026-07-07

A sharpened great-reed, light and singing. The precision counterpart to the sword's breadth and the hammer's mass — fast thrusts, long reach, line skewers. Also Ian's named roster item ("Reed Spear" appears verbatim in VISION.md and the reference pack pickups).

## Identity

- **Role**: single-target execution + line pressure. Best at: elites, armored flanks, skewering charge-lines of Darters. Weak at: being surrounded (narrow arcs — the spear frog must MOVE)
- **Carry**: upright walking-staff at idle (shepherd of the bog); levels to guard when enemies near — carry animation is threat-aware ([[Animation Standards]])
- **Audio**: whip-crack thrust + reed whistle; skewer multi-kills add a shish-kebab *thunk-thunk-thunk*

## Frame data — tier 1 `TUNE` (schema per [[Sword Line]])

| Attack | Windup | Active | Follow | Recovery | cancelFrom | Damage | Impulse | Arc | Reach |
|---|---|---|---|---|---|---|---|---|---|
| Light 1–2 (thrusts) | 4 | 4 | 3 | 8 | 3 | 8 | 300 | 20° | 210 px |
| Finisher (lunge skewer) | 8 | 6 (moves frog 90 px) | 5 | 14 | 7 | 18 | 500 | 15° | 260 px |
| Heavy (hold — sweeping parry-arc) | 12 | 6 | 5 | 14 | 8 | 16 | 700 | 180° rear-to-front | 170 px |

- **Skewer rule**: thrusts hit ALL enemies in the line (pierce), damage −15% per body after the first `TUNE`; 3+ skewered = bonus essence + unique audio
- Lunge finisher is also a micro-gap-closer (90 px forward) — spear frogs fence
- Heavy is the panic button: a wide rear-clearing sweep with strong impulse, low damage — repositioning tool, honors "no blocking" defense law ([[Combat System]])

## Evolution ladder `TUNE (names open to art pass)`

| Tier | Name | New property |
|---|---|---|
| 1 | **Reed Spear** | Fundamentals above |
| 2 | **Cattail Pike** | Skewer falloff removed; +30 px reach |
| 3 | **Heron's Beak** | Lunge distance ×2, i-frames during lunge active — the spear dashes THROUGH crowds |
| 4 | **MIDNIGHT NEEDLE** | Thrusts leave a lingering seam of light; crossing enemies take the thrust damage once (weave a cage of lines) |

## Feel notes

- Fastest input-response in the roster — the spear is the "responsive controls" showcase; buffer + cancel windows must feel telepathic
- Impale visual: skewered fodder briefly STAYS on the spear during follow-through, flung off by the next thrust (max 2 corpses riding) — grotesque, hilarious, pure CROAKDOWN `TUNE perf`
- Co-op: the finisher-of-flanks — pairs with [[Giant Tongue]] pins and [[Bog Hammer]] stuns; a spear-frog + hammer-frog team covers every enemy archetype in the game (by design — see [[Enemy Design Standards]] counter-matrix)
