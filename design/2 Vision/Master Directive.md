# Master Directive (2026-07-07)

> Part of the [[00 START HERE|CROAKDOWN bible]] · Ian's project-founding directive, condensed without loss of law. Original delivered in chat 2026-07-07 (post-pivot). Where wording matters, the normative phrases are quoted verbatim.

## Role

The AI is the permanent Lead Game Designer, Gameplay Engineer, Technical Director, Combat Designer, Art Director, Animation Director, Audio Director, Producer, and Documentation Lead. CROAKDOWN is expected to become a **commercial-quality indie game** — everything created should be something that could realistically ship on Steam.

## Mission

Before production code: build the complete design bible in an Obsidian vault. The vault is the permanent source of truth; every future coding decision references it. *"Documentation is never an afterthought. Documentation IS the project."* New design decisions update the vault immediately.

## Identity (normative)

- Premium co-op melee-first survivor roguelike. **NOT a bullet hell. NOT tower defense. NOT about guns. The player IS the weapon.**
- Core promise, verbatim: *"Every melee attack should feel so satisfying that players genuinely enjoy swinging their weapon even when there is absolutely no reward."*
- First emotion: *"I don't want to stop swinging."*

## The pillars (as given)

1. Combat comes before everything — one frog, one sword, one enemy must be fun first
2. Feel before features — never add content to compensate for mediocre gameplay
3. Quality over quantity — fewer, better weapons and enemies
4. The swamp is alive — environment supports combat, never replaces it
5. Co-op creates memorable moments — stories happen naturally
6. Everything reacts — enemies, water, mud, trees, reeds, mushrooms, particles, physics

(Expanded with Ian's VISION.md riders in [[Design Pillars]].)

## Combat priorities

Hitstop · knockback · enemy collisions · weapon weight · readable attacks · expressive animation · satisfying sound · environmental reactions. *"The player should constantly smile because the combat feels amazing."* → [[Combat System]]

## Art (normative)

Must NOT look like an AI prototype; intentionally handcrafted. References: Cult of the Lamb, Hades, Dead Cells, Hyper Light Drifter, Eastward, Moonlighter. Mood: dreamlike, mysterious, ancient, peaceful, dangerous. Painterly pixel art, chunky readable sprites, heavy atmosphere. Dark teal swamp, warm gold lighting, bioluminescent accents. Large readable frogs, plump expressive enemies, excellent silhouettes. No generic assets. → [[Art Direction]]

## Animation (normative)

Animation is gameplay. Every creature requires: idle, walk, attack, hit reaction, death, secondary motion, squash and stretch, weapon anticipation, follow-through, recovery. Quality rivals modern premium indies. *"Nothing slides. Everything breathes."* → [[Animation Standards]]

## Audio (normative)

Audio sells impact. Every weapon gets a unique identity. Combat sounds heavy. Constant living ambience. Music reacts dynamically to gameplay intensity. → [[Audio Direction]]

## Technical (normative)

60+ FPS · responsive controls · keyboard + PlayStation controllers, controller-first · data-driven systems · highly modular architecture · readable code · professional folder structure. → [[Technical Architecture]]

## Development order (normative, never reversed)

1. Obsidian design bible → 2. Combat prototype → 3. Vertical slice → 4. Content → 5. Polish. → [[Roadmap]]

## Relationship to `docs/VISION.md`

The directive and VISION.md are the same pivot expressed twice — the directive adds process law (documentation-first) and the quality bar framing; VISION.md adds concrete content law (enemy families, boss names, weapon list, evolution ladders, co-op split, sprite +30–50%). Both bind. Conflicts: VISION.md wins on content, the directive wins on process.
