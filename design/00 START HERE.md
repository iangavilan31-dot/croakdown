# CROAKDOWN — Design Bible

**Premium 2-player co-op melee horde survivor.** The player IS the weapon. This vault is the permanent source of truth for every design, art, animation, audio, and engineering decision on CROAKDOWN. Documentation is not an afterthought — documentation IS the project.

> **Authority chain (highest wins):**
> 1. Ian's live corrections (land them here immediately)
> 2. `docs/VISION.md` in the repo root — Ian's pivot intent, verbatim (2026-07-07)
> 3. This vault
> 4. Everything else. `BRIEF.md` and the TD-era goal-lock in `GYAT.md` are **superseded** — salvage reference only.

## What CROAKDOWN is

A frog warden cuts through swarms of swamp horrors with weapons that feel *incredible* — huge sword arcs, elastic tongue grabs, launches, physics, blood, permanent corpses — in a bioluminescent night swamp that reacts to everything. Brotato's progression grammar × Hades' combat feel × Cult of the Lamb's atmosphere. **It is NOT a bullet hell. NOT tower defense. NOT about guns.**

The one-sentence test: *within thirty seconds of picking up the controller, a player should say "dude… this feels incredible" — about the swinging, not the content.*

## Reading order

New to the project? Read in this order:

1. [[Vision]] — the promise and the player experience
2. [[Design Pillars]] — the six laws every decision obeys
3. [[Core Loop]] — the shape of a run
4. [[Combat System]] — the heart of the game
5. [[Game Feel Standards]] — the locked juice numbers
6. [[Roadmap]] — what gets built, in what order, behind what gates

Implementing a system? Go straight to its page — every page is written so a senior developer can build the system without guessing.

## Map

| Area | Pages |
|---|---|
| **Project** | [[Project Overview]] |
| **Vision** | [[Vision]] · [[Design Pillars]] · [[Design Philosophy]] · [[Master Directive]] |
| **Gameplay** | [[Core Loop]] · [[Combat System]] · [[Game Feel Standards]] · [[Movement and Controls]] · [[Progression and Evolution]] · [[Waves and Pacing]] · [[Shop and Economy]] · [[Co-op Design]] · [[Secrets and Discoveries]] |
| **Weapons** | [[Weapon Design Standards]] · [[Sword Line]] · [[Giant Tongue]] · [[Bog Hammer]] · [[Reed Spear]] · [[Weapon Roadmap]] |
| **Enemies** | [[Enemy Design Standards]] · [[Sludge Family]] · [[Mushroom Family]] · [[Insect Family]] |
| **Bosses** | [[Boss Design Standards]] · [[Drowned King]] · [[Mother Mosquito]] · [[Bog Leviathan]] · [[The Bloom]] |
| **Art** | [[Art Direction]] · [[Sprite and Scale Standards]] · [[Environment and Reactivity]] · [[VFX Standards]] |
| **Animation** | [[Animation Standards]] |
| **Audio** | [[Audio Direction]] |
| **Programming** | [[Technical Architecture]] · [[Performance Budget]] |
| **Production** | [[Roadmap]] · [[Quality Gates]] · [[Decision Log]] |

## Standing project law (inherited, non-negotiable)

- Port **5126** `--strictPort`. In use = already running; reuse it.
- Banned design list (rejected 3×): neon-cyan holo HUD, scanlines, mono microtype, cursive gold slop, generic AI-template feel. UI chrome = dark swamp-glass per [[Art Direction]].
- Minimal on-screen text. Information lives in the world: position, silhouette, color, motion, music. Text only on opt-in hover or hard-pause surfaces.
- QA = real clicks on a **visible** Playwright page (`scripts/shoot.mjs`), never `dispatchEvent`, never hidden tabs.
- `docs/VISUAL_BAR.md` gate stands: every screen ≥ 42/50, no axis < 7.
- Git: bare `git` in PowerShell is broken — use the Bash tool or `"C:\Program Files\Git\cmd\git.exe"`. Commit every working state.
- Seatbelt memory (DECISIONS / BUGS / SESSION_LOG / CURRENT_TASK) lives at `ObsidianPKM\claude-refs\projects\croakdown\`. See [[Decision Log]].

## Rules for maintaining this vault

- **A new design decision is not made until it is written here.** Update the page in the same session the decision happens.
- No empty placeholder pages, ever. If a system isn't designed yet, it appears only as a link from [[Roadmap]] with its phase.
- Numbers marked `TUNE` are starting values, expected to move during playtesting; numbers marked `LOCKED` change only with a [[Decision Log]] entry.
- Never duplicate — link. One fact lives in one place.
