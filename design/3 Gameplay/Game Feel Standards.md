# Game Feel Standards

> Part of the [[00 START HERE|CROAKDOWN bible]] · the locked juice numbers · updated 2026-07-07

The juice stack, standardized so every mechanic ships feeling identical in quality. These numbers came from the 2026-07-07 research run (juice canon, verified against Sakurai/GDC sources) and survive the pivot as the star of the game. All at 60 fps.

## 1. Hitstop `LOCKED (ratios) / TUNE (absolutes)`

| Event | Victim freeze | Attacker freeze |
|---|---|---|
| Light hit | 3 frames | 2 |
| Medium hit | 5 | 3 |
| Heavy hit | 9 | 6 |
| Kill | +3 | +2 |
| Boss phase-break hit | 12 | 8 |

- Victim's **sprite** shakes ±2 px during freeze; hurtbox stays static (Sakurai law)
- Attacker always freezes ~70% of victim — keeps the player fluid while selling contact
- **Multi-hit cap**: one swing hitting N enemies = max(single hitstop) + 1 frame per extra victim, capped at 14 frames total. A 10-enemy cleave feels MASSIVE, not frozen
- Hitstop never applies to the other player's frog

## 2. Hit flash & flash grammar

- Victim flashes solid white for 0.1 s on every hit
- Armored absorb: dim gray flash + dust, no white — armor must read in one hit
- Status applications tint the flash (green poison, orange burn, ice-blue freeze)

## 3. Screen shake (trauma model)

- Additive **trauma** value, shake amplitude = trauma², decays 1.8/s `TUNE`
- Budget: light hit +0.05 · heavy +0.15 · kill +0.1 · explosion/wall-splat +0.25 · boss slam +0.4. Hard cap 0.7
- Rotational shake ≤ 0.5°; translation ≤ 24 px. Settings slider (existing `croakdown.settings.v1` persists it)
- Micro zoom-pulse (2%, 0.15 s) reserved for boss phase changes and evolution moments only

## 4. Knockback

Physics model in [[Combat System]] — impulses: light 420 px/s · medium 700 · heavy/finisher 1200 `TUNE`. Player recoil-hop: every landed swing nudges the frog 12 px back (weight equals reaction).

## 5. Permanence (the battlefield remembers)

- Kill decals: blood pools, bones, cracked shells, torn reeds, scorch marks, drag smears from tumbles
- Blood is directional — sprays away from the killing blow; melee kills paint the arc
- Decal budget 250 `LOCKED`, oldest fade over 10 s once over budget ([[Performance Budget]])
- By wave 20 the arena tells the run's story ([[Vision]]). The run-end screen is shot ON this canvas

## 6. Audio contract (per-hit)

Every landed hit fires: layered SFX (transient + body + bass boom) · round-robin 3+ variants · ±6% random pitch · mix DUCKS ~0.2 s on heavy kills/explosions/boss hits. Weapon audio identities in [[Audio Direction]]. Feedback fires on the exact contact frame — audio, flash, hitstop, knockback, particles are ONE event in code ([[Technical Architecture]]).

## 7. Particles & impact VFX

Contact spark cone in the swing direction · blood burst scaled by damage · essence pops with magnet-pull arcs · shockwave rings on heavies/slams. Budgets and layer rules: [[VFX Standards]].

## 8. Camera

Fixed arena camera (TowerFall pattern, co-op law — never leash, never split). Shake/zoom are the only camera motion. See [[Co-op Design]].

## The one-event rule

A "hit" is a single atomic event in the engine that fans out to ALL feedback channels the same frame. If any channel (sound, flash, hitstop, particles, knockback) can desync from the others, the architecture is wrong. This rule is testable and tested ([[Technical Architecture]]).

## Readability discipline (the anti-slop guard)

Spectacle must stay readable (MUST-BEAT feat): enemies stay cool/dark, players + essence + telegraphs stay warm/glowing ([[Art Direction]] palette law). VFX never covers enemy anticipation frames. When a readability conflict arises, the telegraph wins over the explosion — always.
