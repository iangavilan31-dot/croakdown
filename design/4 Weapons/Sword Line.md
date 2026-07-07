# Sword Line — stick → LIVING VINE SWORD

> Part of the [[00 START HERE|CROAKDOWN bible]] · the flagship weapon · updated 2026-07-07

Ian's founding fantasy: *"a frog hero with a sword BIGGER than the frog, hanging low, heavy slashes, blood gushing."* The sword line is the game's calling card and the Phase 1 combat-prototype weapon ([[Roadmap]]). If this weapon isn't fun alone in a graybox pond, nothing ships.

## Identity

- **Role**: wide-arc crowd slasher. Best at: 3–8 enemies in front. Weak at: single armored targets (spear's job), enemies behind (commitment)
- **Carry**: dragged low behind the frog, tip furrowing mud (leaves a faint drag decal while walking — weight before the first swing)
- **Audio**: wet slice + bass thunk; higher tiers add petal-chime (lotus), stone-hum (moon), living creak (vine) ([[Audio Direction]])

## Frame data (canonical schema for all weapons) — tier 1 "stick" `TUNE`

At 60 fps. `cancelFrom` = first recovery frame that accepts dash/chain cancel.

| Attack | Windup | Active | Follow | Recovery | cancelFrom | Damage | Impulse | Arc | Reach |
|---|---|---|---|---|---|---|---|---|---|
| Light 1 | 6 | 5 | 4 | 10 | 4 | 10 | 420 | 120° | 150 px |
| Light 2 (reverse arc) | 5 | 5 | 4 | 10 | 4 | 10 | 420 | 120° | 150 px |
| Finisher (overhead→sweep) | 10 | 6 | 6 | 16 | 8 | 22 | 900 | 150° | 165 px |
| Heavy (hold ≥250 ms) | 18 | 6 | 8 | 18 | 10 | 34 | 1200 | 200° | 180 px |

- Heavy has **super-armor** during active frames (frog flinch-immune, still takes damage)
- Swing steering: aim may drift ±30° during windup (directional influence)
- Multi-hit: full damage to every enemy in arc (no falloff — cleaving crowds is the fantasy); hitstop obeys the multi-hit cap ([[Game Feel Standards]])

## Evolution ladder `LOCKED (names)` — each tier: sprite + arc + ONE new property

| Tier | Name | New property | Visual story |
|---|---|---|---|
| 1 | **Stick** | — (pure fundamentals) | A soggy branch. Humble. Already feels great — that's the point |
| 2 | **Reed Blade** | +15% arc, chain gap −2 frames | Woven reeds, green edge-light |
| 3 | **Lotus Sword** | Finisher emits a petal shockwave ring (small AoE, light impulse) | Blade blooms; petals scatter per swing ([[VFX Standards]]) |
| 4 | **Moon Cleaver** | Heavy leaves a crescent afterimage that hits once more (0.5×) | Pale stone-glow, night-blue trail; the swing paints moonlight |
| 5 | **LIVING VINE SWORD** | Blade is animated (writhes); arc +25%; kills root-burst — vines erupt from corpses, briefly snaring nearby enemies | The swamp itself fights with you. Idle: vine breathes, flowers open |

Tier deltas multiply tier-1 frame data; exact per-tier tables live beside the data files when tuned (this page defines shape + properties; `data/weapons.ts` is the numeric source once Phase 1 begins).

## Feel notes (build-day checklist)

- The stick must produce: mud-drag idle · anticipation squash · arc trail · 3-frame hitstop lights / 9-frame heavies · recoil hop · directional blood · corpse launch on finisher kills · round-robin slice audio. All on day one — [[Game Feel Standards]] is not a polish phase
- Blood gushes scale with tier — by Living Vine, a finisher through a crowd is a red event ([[VFX Standards]] gore rules)
- Synergy hooks: petals/crescents/vines all interact with statuses (petal ring spreads poison, crescent applies moon-brand for [[Co-op Design]] combos) `TUNE`
