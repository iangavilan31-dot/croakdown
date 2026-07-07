# Co-op Design

> Part of the [[00 START HERE|CROAKDOWN bible]] · updated 2026-07-07

Built for co-op from day one, not single-player with two people. Shared-screen 2P first; the sim is authoritative-single-machine and online-ready by architecture ([[Technical Architecture]]) — netcode only after v1 clears the bar.

## Shared vs individual (Ian-verbatim split)

| Shared | Individual |
|---|---|
| One essence wallet | Weapons & weapon evolutions |
| One shop, shared rerolls & locks | Stat builds & level-up picks |
| Relics (Bloom Chest) | Abilities & body evolution |
| **Combo meter** | Frog identity/silhouette |

The shared wallet is the co-op's social engine — purchase discussions ARE the between-wave gameplay. Contest mechanics: [[Shop and Economy]].

## The shared combo meter

Kills by either frog within a rolling 2.5 s window sustain the meter `TUNE`. Tiers 10/25/50/100 kills → essence multiplier ×1.1/1.25/1.5/×2 + music intensity layers ([[Audio Direction]]) + subtle world response (fireflies gather, spores glow). The meter is drawn as a growing lotus at screen top — no numbers. It makes both players feel responsible for the same fire.

## Synergy verbs (designed teamwork)

The strongest builds require teamwork — combos are systemic, not scripted:
- **Pull → smash**: P1 [[Giant Tongue]] drags a bruiser into P2's [[Bog Hammer]] arc
- **Freeze → shatter**: ice stacks + any heavy = AoE shatter ([[Combat System]] statuses)
- **Poison → ignite**: burn detonates poison stacks
- **Stun → slam**: launches into stunned crowds bowl harder (stunned enemies count as walls for splat damage) `TUNE`
Every synergy pays a **golden spore burst** (bonus essence, no text) so teamwork is visibly profitable — the OMD-combo research pattern.

## Camera & screen law

Single fixed arena camera sized to the viewport (TowerFall pattern). Never leash, never split, never zoom for gameplay (juice-only shake/zoom, [[Game Feel Standards]]). Arena and sprite scale are designed to this constraint ([[Sprite and Scale Standards]]).

## Identity & readability

P1 amber rim-light, P2 spore-teal rim-light `LOCKED` — distinct frog silhouettes + team-color rim outlines; both loadouts render on-frog and stay readable in a swarm (feeds the VISUAL_BAR Composition axis; paper-doll dependency `docs/GOAL_PAPERDOLL.md`).

## Join / drop

Drop-in at menu and between waves (press any button on pad 2 → join screen). Mid-wave join spawns at partner with 3 s spawn protection at the next breather. Drop-out converts to solo scaling at the next wave.

## Down / revive / death

- Downed frog = **bleed-out ghost** (crawling, 20 s timer `TUNE`): can hop slowly, can't attack, still collects essence
- Revive: partner holds Interact within reach for 2.5 s — vulnerable channel, interrupt on hit `TUNE`. Revived at 40% HP
- Un-revived frog returns at next wave start at 50% HP (runs never hard-end on one mistake)
- **Double-KO = run over.** While one frog is down, enemy scaling eases toward solo values (research law)

## Scaling

Tune for 2P baseline; solo gets −25–30% enemy HP & count (Robot Entertainment law). Elites/bosses gain mechanics in 2P, not just stats (e.g., [[Mother Mosquito]] drains from both, [[The Bloom]] splits light-lures) — bosses must force *coordination*, not just more damage.
