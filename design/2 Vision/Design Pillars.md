# Design Pillars

> Part of the [[00 START HERE|CROAKDOWN bible]] · updated 2026-07-07

Six pillars. Every design decision must be justifiable against at least one, and no decision may violate one without a [[Decision Log]] entry approved by Ian.

## 1. Combat comes before everything

If one frog, one sword, and one enemy are not fun, nothing else matters. The [[Roadmap]] hard-gates all content work behind the [[Quality Gates|Swing Test]]. Corollary: **never add content to compensate for mediocre gameplay** — if a wave feels flat, fix feel, don't add an enemy.
→ [[Combat System]] · [[Game Feel Standards]]

## 2. Feel before features

Every feature ships with its juice or it doesn't ship. A new weapon with placeholder impact is not "done pending polish" — it is not done. Juice is specified up front ([[Game Feel Standards]]) and built in the same commit as the mechanic.

## 3. Quality over quantity

Fewer weapons, fewer enemies — better weapons, better enemies. Launch scope: **4 deeply-built weapon lines** ([[Weapon Design Standards]]), **3 enemy families** (~14 creatures, [[Enemy Design Standards]]), **4 swamp-legend bosses** ([[Boss Design Standards]]). Nothing enters the roster without its full animation set, audio identity, and a distinct combat role.

## 4. The swamp is alive

Nothing is ever static — drifting fog, glowing spores, wandering fireflies, swaying reeds, animated water, breathing lotus flowers. Menus contain ambient motion too. The environment supports combat and never replaces it: reactive, not mechanical. → [[Environment and Reactivity]]

## 5. Co-op creates memorable moments

Shared wallet, shared shop, shared combo meter; individual builds, evolutions, and roles that emerge by choice. Synergy verbs (pull → smash, freeze → shatter, poison → ignite) are designed so the strongest builds *require* teamwork. → [[Co-op Design]]

## 6. Everything reacts

Enemies, water, mud, trees, reeds, mushrooms, particles, physics. Every player action produces a visible, audible world response within one frame. The reaction budget is a first-class perf line item ([[Performance Budget]]), not a nice-to-have.

---

### Pillar riders (Ian-verbatim, from `docs/VISION.md`)

- **Animation is a feature** — a defining characteristic, budgeted like one. Characters never slide across the ground. → [[Animation Standards]]
- **Bigger, more expressive characters** — sprite size up 30–50% vs the TD build; fewer, LARGER enemies instead of hundreds of dots. → [[Sprite and Scale Standards]]
