# Decision Log

> Part of the [[00 START HERE|CROAKDOWN bible]] · updated 2026-07-07

**The append-only log lives in the seatbelt folder:** `ObsidianPKM\claude-refs\projects\croakdown\DECISIONS.md` (the "why", newest at bottom). This page is the curated index of decisions that SHAPE the design — when a logged decision changes a system, the system's vault page is updated in the same session and the change cites the log date. Never duplicate the log here; summarize what binds.

## Founding decisions (binding)

| Date | Decision | Lives in |
|---|---|---|
| 2026-07-07 | Name CROAKDOWN, port 5126 strict, Vite+TS, own repo | [[Project Overview]] |
| 2026-07-07 | Stack: raw Canvas 2D, no engine | [[Technical Architecture]] |
| 2026-07-07 | Pixel renders, painterly mood (REF_02 grades, pixel ships) | [[Art Direction]] |
| 2026-07-07 | White-frosted UI retired → dark swamp-glass chrome | [[Art Direction]] |
| 2026-07-07 | QA = visible Playwright, real keys only | [[Quality Gates]] |
| 2026-07-07 | Vite full-reloads on `public/` writes — never QA during generation | [[Art Direction]] |
| 2026-07-07 | critique.mjs: gpt-4o fallback until ANTHROPIC_API_KEY set; no process.exit() (libuv crash) | [[Quality Gates]] |
| 2026-07-07 | Pause = frozen-sim flag, settings persist to `croakdown.settings.v1` | [[Technical Architecture]] |
| **2026-07-07 21:20** | **THE PIVOT: towers DEAD. Melee horde survivor. docs/VISION.md top authority** | everywhere — this vault is its product |
| 2026-07-07 (late) | Master directive: documentation-first; this bible built; development order locked | [[Master Directive]], [[Roadmap]] |
| 2026-07-07 (late) | Boss roster = VISION.md's four legends (Drowned King, Mother Mosquito, Bog Leviathan, The Bloom); TD-era boss trio retired | [[Boss Design Standards]] |
| 2026-07-07 (late) | Manual swinging is the core verb — auto-attack rejected as primary | [[Combat System]] |
| 2026-07-07 (late) | Launch roster: 4 weapon lines + universal tongue; Lotus Blade folded into sword ladder tier 3 | [[Weapon Design Standards]] |

## Open questions (owner: next design session — resolve into pages, then log)

- Attune/dance homage: does any PJM dance ritual survive the pivot (mushroom-circle secret covers some of it)? Currently: only the secret. Revisit after Phase 1
- TD-era BGM re-audition results ([[Audio Direction]])
- Solo hold-to-mash assist final % ([[Movement and Controls]])
- Paper-doll spike verdict gates all gear art (`docs/GOAL_PAPERDOLL.md`)

## Ian's open unlocks (blocking items on his side, flagged not faked)

- `ANTHROPIC_API_KEY` for the native hostile critic
- `docs/refs/REFERENCE_PACK_V2.png` download
- DualSense physical verification loop (Phase 2+)
