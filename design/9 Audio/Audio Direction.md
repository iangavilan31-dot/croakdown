# Audio Direction

> Part of the [[00 START HERE|CROAKDOWN bible]] · audio sells impact · updated 2026-07-07

Combat sounds HEAVY. The swamp never falls silent. Music reacts to intensity. Audio is half of game feel — every feedback event fires its audio on the contact frame ([[Game Feel Standards]] one-event rule).

## SFX architecture

- Web Audio graph: SFX bus → duck compressor · BGM bus · ambience bus · UI bus. Heavy kills/explosions/boss hits DUCK the mix ~0.2 s
- Layered hits: **transient (click/snap) + body (material) + bass boom (weight)** — weight lives in the low end
- Round-robin ≥ 3 variants per event, ±6% random pitch — no machine-gun repetition
- Never measure media via bash pipes (RTK gotcha) — python scripts only

## Weapon identities (unique per line — [[Weapon Design Standards]] contract)

| Weapon | Identity |
|---|---|
| [[Sword Line]] | Wet slice + bass thunk; tiers add petal-chime → stone-hum → living creak |
| [[Bog Hammer]] | Deep boom + mud splash + stone knock; pre-swing air-hum |
| [[Reed Spear]] | Whip-crack + reed whistle; skewer *thunk-thunk-thunk* |
| [[Giant Tongue]] | Elastic stretch → wet snap; lightning tier adds crackle |

Enemy families get vocal identities: sludge = wet burbles/pops · mushrooms = creaks + spore hisses · insects = wing-whines (the Skeeter whine and [[Mother Mosquito]]'s cathedral version are a designed dread-motif). Every [[Secrets and Discoveries|secret]] has a distinct audio signature.

## Ambience (the swamp is alive, constantly)

Night-swamp bed: water lap, distant croaks answering each other, insect chorus, wood creaks, occasional deep bloops from the dark water. Ambience is REACTIVE: combat mutes the wildlife (they're hiding); quiet beats bring the chorus back — the same grammar as the fireflies ([[Environment and Reactivity]]). Boss hushes are the ambience bus doing the storytelling ([[Boss Design Standards]]).

## Music (dynamic, intensity-reactive)

- **Combat tracks in 2–3 vertical layers** (base groove / pressure layer / frenzy layer) unmuted by the shared combo meter tier ([[Co-op Design]]) + wave phase. Crossfades ≤ 1 bar, beat-aligned `TUNE`
- **Stingers**: wave-start rise, wave-clear resolve, elite arrival, evolution fanfare (croak-chorus), Bloom Chest jackpot, boss kill resolve
- **Boss themes ×4** — each legend owns a theme; [[The Bloom]] corrupts the main leitmotif (its phase-II "song" is the title melody, detuned; phase IV strips to heartbeat + pure leitmotif). Write the leitmotif FIRST; everything quotes it
- Existing 7 TD-era BGM tracks: re-audition against the melee identity — combat tracks likely need more percussion/weight; keep what passes, regenerate what doesn't
- Pipeline: hyperframes-media local engine (MusicGen/Lyria, keyless) → `public/audio/bgm/`; drop-in folder so Ian can replace with FL Studio exports later (his domain — flag, never block on it)

## The frog voice

Heroes croak: on ready-up (the co-op croak-together), on evolution (fanfare chorus), on revive, rarely on idle. The croak is the brand's audio logo — chesty, characterful, never cartoon-squeaky. Title screen: one distant croak answers the player's first input.
