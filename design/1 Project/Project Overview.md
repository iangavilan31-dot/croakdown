# Project Overview

> Part of the [[00 START HERE|CROAKDOWN bible]] · updated 2026-07-07

## Identity card

| | |
|---|---|
| **Title** | CROAKDOWN |
| **Genre** | Co-op melee-first horde survivor roguelike |
| **Players** | 1–2, shared-screen local co-op (online-ready design, netcode post-v1) |
| **Fantasy** | You are a frog warden of a bioluminescent night swamp, becoming an unstoppable guardian one swing at a time |
| **Tone** | Dreamlike, mysterious, ancient, peaceful-until-it-isn't. Cute-but-eerie, NOT kid-friendly. Grotesque enemies welcome |
| **Session** | One run ≈ 25–35 min, 20 waves, 4 bosses |
| **Platform** | PC (Chrome-first web build → Steam via Tauri/Electron wrapper at ship; Vampire Survivors precedent) |
| **Input** | Controller-first (DualSense over USB, MDN "standard" mapping) + full keyboard/mouse. See [[Movement and Controls]] |
| **Perf bar** | 60+ FPS locked on the dev box (AMD RX 6600). See [[Performance Budget]] |
| **Quality bar** | Commercial indie — could realistically ship on Steam. Gates in [[Quality Gates]] |
| **Repo** | `C:\Projects with Code\creative\croakdown` · port 5126 strict · own git repo |

## The elevator pitch

Two friends in Discord late at night boot CROAKDOWN. Within thirty seconds one of them says *"dude… this feels incredible"* — not "lots of content," not "crazy progression." They noticed weapon weight, physics, impact, enemy reactions, satisfying movement, expressive animation. The first emotion is **"I don't want to stop swinging."** Everything else in this vault exists to amplify that feeling. See [[Vision]].

## What it is not

- **Not a bullet hell.** Enemy pressure comes from mass, weight, and positioning — not projectile curtains.
- **Not tower defense.** The 2026-07-07 TD design (Heartbloom, root nodes, living towers) is dead. Pivot triage — what survived, died, transformed — is recorded at the bottom of `docs/VISION.md`.
- **Not about guns.** Every weapon is melee or body-derived (tongue). "No guns" is Ian-verbatim law.
- **Not a content buffet.** Fewer, better weapons and enemies. See [[Design Philosophy]].

## Reference constellation

Combat feel: **Hades**, Dead Cells. Progression grammar: **Brotato**. Atmosphere & art bar: **Cult of the Lamb**, Hyper Light Drifter, Eastward, Moonlighter. Each reference is scoped — we take Hades' hit feedback, not its narrative; Brotato's shop grammar, not its auto-fire.

## Development order (never reversed)

1. Obsidian design bible ← *this vault*
2. Combat prototype — one frog, one sword, one enemy family ([[Roadmap]] Phase 1)
3. Vertical slice
4. Content
5. Polish

Details, gates, and current status: [[Roadmap]].

## Project history in one paragraph

Born 2026-07-07 as a GYAT run: research (6 agents + skeptic gate), competitor teardown (MUST-BEAT bar vs Brotato/BTD6/Thronefall/VS), and an embodied-tower-defense build that reached a playable wave loop with art, music, and QA tooling the same day. That evening Ian killed the TD core — the melee half was the part he loved — and re-locked the goal as a pure melee horde survivor (`docs/VISION.md`). The master directive (2026-07-07, [[Master Directive]]) formalized the pivot and mandated documentation-first. The TD-era research that wasn't about towers (juice canon, co-op patterns, pacing math, shop grammar, perf laws) remains valid and is folded into this vault where it applies.
