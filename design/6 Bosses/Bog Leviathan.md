# Bog Leviathan — wave 15

> Part of the [[00 START HERE|CROAKDOWN bible]] · boss per [[Boss Design Standards]] · updated 2026-07-07

**The legend**: the swamp's oldest appetite — a mountain of eel-salamander that swims through MUD as if it were water. The arena-control exam: the whole floor becomes the boss's weapon. The only boss that is mostly invisible — dread by absence.

- **Silhouette**: never fully seen until phase 3 — a 480 px `TUNE` head, lantern-lure barbels, fins like rotted sails; between surfacings only its WAKE exists (a traveling ridge of mud + reeds folding)
- **Tag line**: `BOG LEVIATHAN — the swamp is its throat`
- **Arrival**: arena-wide tremor; every prop shakes; distant reeds fold in a LINE toward the arena; the line arrives and the floor opens
- **Arena state**: per-phase water level changes (the signature) — the arena is redrawn under your feet

## Kit

| Attack | Anticipation | Behavior | Punish window |
|---|---|---|---|
| **Breach** | 50f — converging ripple rings + rising bass, glyph bloom | Erupts under a frog: 160 px bite ring, launches everything (enemies included — it eats its own escort, and that's ON THEME) | 60f beached after — the classic |
| **Wake Charge** | reeds fold along its path 40f ahead | Sub-surface charge, the traveling ridge itself knocks down (dodge the RIDGE, not a sprite) | Turnaround at arena edge |
| **Lure Light** | barbel glow surfaces, sways | A false [[Secrets and Discoveries|glowing-fish]] light — approach = Breach ambush. It hunts using the game's own secret grammar (the swamp lies at wave 15) | Refusing the lure = it surfaces bored, 40f |
| **Swallow** *(2P)* | targets the frog farther from its partner | Drags a frog by the ankle toward deep water (bleed-out-style crawl); partner must deal damage threshold to sever | Post-sever thrash 50f |

## Phases (HP 4200 solo `TUNE`, ×1.7 2P)

1. **The Wake** (100–70%): submerged. Wake Charges + Breaches; deep water floods the arena's outer ring (fighting space shrinks; wave enemies keep spawning — triage under compression)
2. **The Hunger** (70–35%): water recedes to CENTER pool (fighting space inverts); Lure Light + Swallow unlock; Breaches chain ×2
3. **The Beaching** (35%→ or timer): it hauls itself OUT — fully visible at last, colossal, dragging itself on fin-arms; loses Breach, gains sweeping tail arcs + bite lunges; every movement carves mud furrows (permanence decals at boss scale). Slower, readable, brutal — the monster-movie payoff phase

## Kill

Slow-mo on the final blow to its lure-heart (the barbel light gutters); it collapses full-length across the arena — **the corpse becomes terrain** for the rest of the run: a ridge you hop over, already growing moss by wave 17 (the permanence pillar's crown jewel). Essence erupts from its gullet — everything it ever swallowed.

## Design notes

- Dread-by-absence inverts the horde formula: waves 1–14 taught "what you see kills you"; the Leviathan teaches "what you DON'T see"
- All three phases re-teach arena reading: ripple grammar, reed-fold grammar, light-trust grammar ([[Environment and Reactivity]] carries half this fight)
- Perf: phases 1–2 are cheap (no boss sprite!) — budget spends on water/mud sim and the phase-3 mega-sprite ([[Performance Budget]])
