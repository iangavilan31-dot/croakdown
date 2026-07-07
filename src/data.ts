// CROAKDOWN content tables — enemies, towers, items, frogs, wave schedule.
// All balance numbers are 2P-baseline (BRIEF §7.3). Speed never scales.

export type EnemyKind =
  | 'sludgeling' | 'bogrunner' | 'spitter' | 'shellback' | 'broodmother' | 'broodling'
  | 'dragonfly' | 'rotleech' | 'hunter' | 'elder_sludge'
  | 'drowned_stag' | 'mother_of_moths' | 'rotting_king';

export type Aggro = 'heart' | 'frog' | 'tower';

export interface EnemyDef {
  kind: EnemyKind;
  hp: number; hpPerWave: number;
  dmg: number; dmgPerWave: number;
  speed: number;           // px/s — never scales
  radius: number;
  aggro: Aggro;
  essence: number;         // base essence dropped
  ranged?: { range: number; cooldown: number; projSpeed: number };
  armorFront?: boolean;    // shellback: immune from the front arc
  spawns?: { kind: EnemyKind; every: number; count: number }; // broodmother
  eatsTowers?: boolean;
  boss?: boolean;
  debutWave: number;       // weirdness schedule
  tint: string;            // placeholder-art color
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  sludgeling:   { kind: 'sludgeling', hp: 12, hpPerWave: 5, dmg: 4, dmgPerWave: 0.6, speed: 48, radius: 12, aggro: 'heart', essence: 2, debutWave: 1, tint: '#7ba05e' },
  bogrunner:    { kind: 'bogrunner', hp: 8, hpPerWave: 3.5, dmg: 3, dmgPerWave: 0.5, speed: 95, radius: 10, aggro: 'frog', essence: 2, debutWave: 2, tint: '#9a7ab0' },
  spitter:      { kind: 'spitter', hp: 14, hpPerWave: 5, dmg: 5, dmgPerWave: 0.8, speed: 45, radius: 12, aggro: 'heart', essence: 3, ranged: { range: 220, cooldown: 2.2, projSpeed: 160 }, debutWave: 3, tint: '#adc25e' },
  shellback:    { kind: 'shellback', hp: 40, hpPerWave: 12, dmg: 7, dmgPerWave: 1, speed: 38, radius: 15, aggro: 'heart', essence: 5, armorFront: true, debutWave: 6, tint: '#6a9a9a' },
  broodmother:  { kind: 'broodmother', hp: 60, hpPerWave: 16, dmg: 6, dmgPerWave: 1, speed: 30, radius: 20, aggro: 'heart', essence: 8, spawns: { kind: 'broodling', every: 4, count: 2 }, debutWave: 9, tint: '#c07a96' },
  broodling:    { kind: 'broodling', hp: 5, hpPerWave: 2, dmg: 2, dmgPerWave: 0.4, speed: 110, radius: 7, aggro: 'frog', essence: 0, debutWave: 9, tint: '#d69ab4' },
  dragonfly:    { kind: 'dragonfly', hp: 10, hpPerWave: 4, dmg: 4, dmgPerWave: 0.7, speed: 150, radius: 9, aggro: 'frog', essence: 3, debutWave: 13, tint: '#6ec4d8' },
  rotleech:     { kind: 'rotleech', hp: 30, hpPerWave: 10, dmg: 10, dmgPerWave: 1.4, speed: 60, radius: 12, aggro: 'tower', essence: 5, eatsTowers: true, debutWave: 16, tint: '#d09055' },
  hunter:       { kind: 'hunter', hp: 26, hpPerWave: 9, dmg: 8, dmgPerWave: 1.1, speed: 80, radius: 13, aggro: 'frog', essence: 5, debutWave: 5, tint: '#a066b0' },
  elder_sludge: { kind: 'elder_sludge', hp: 220, hpPerWave: 40, dmg: 12, dmgPerWave: 1.5, speed: 42, radius: 26, aggro: 'heart', essence: 30, boss: true, debutWave: 8, tint: '#8ab060' }, // wave-8 mini-boss
  drowned_stag: { kind: 'drowned_stag', hp: 900, hpPerWave: 0, dmg: 16, dmgPerWave: 0, speed: 60, radius: 34, aggro: 'frog', essence: 80, boss: true, debutWave: 10, tint: '#7aa8c0' },
  mother_of_moths: { kind: 'mother_of_moths', hp: 1600, hpPerWave: 0, dmg: 14, dmgPerWave: 0, speed: 48, radius: 38, aggro: 'heart', essence: 120, boss: true, debutWave: 15, tint: '#c0b0dc' },
  rotting_king: { kind: 'rotting_king', hp: 2800, hpPerWave: 0, dmg: 20, dmgPerWave: 0, speed: 40, radius: 44, aggro: 'heart', essence: 200, boss: true, debutWave: 20, tint: '#a8bc60' },
};

// ---------- towers (living swamp plants; 3 tiers each) ----------
export type TowerKind = 'snaplily' | 'sporeshroom' | 'thornvine' | 'willowisp' | 'bulrush' | 'moonbell';

export interface TowerDef {
  kind: TowerKind;
  name: string; tag: string;                 // title + ONE short tag (Ian's text law)
  cost: [number, number, number];            // grow cost, then attune costs t2, t3
  dps: [number, number, number];
  range: [number, number, number];
  fireRate: [number, number, number];        // shots/s
  projSpeed: number;
  hp: number;                                // towers can be eaten by rotleeches
  special?: 'slow' | 'aoe' | 'pierce' | 'zone' | 'heal';
  tier1Unlocked?: boolean;                   // in starting loadout
  tint: string;
}

export const TOWERS: Record<TowerKind, TowerDef> = {
  snaplily:   { kind: 'snaplily', name: 'SNAPLILY', tag: 'bites what comes close', cost: [12, 18, 30], dps: [11, 20, 34], range: [90, 100, 115], fireRate: [1.1, 1.3, 1.6], projSpeed: 0, hp: 60, tier1Unlocked: true, tint: '#7da35a' },
  sporeshroom:{ kind: 'sporeshroom', name: 'SPORESHROOM', tag: 'lobs bursting spores', cost: [16, 24, 40], dps: [6, 13, 26], range: [180, 200, 230], fireRate: [0.6, 0.7, 0.85], projSpeed: 150, hp: 45, special: 'aoe', tier1Unlocked: true, tint: '#a37da3' },
  thornvine:  { kind: 'thornvine', name: 'THORNVINE', tag: 'lashes through lines', cost: [18, 26, 44], dps: [7, 15, 29], range: [140, 155, 175], fireRate: [0.9, 1.05, 1.25], projSpeed: 260, hp: 55, special: 'pierce', tint: '#5a8a6e' },
  willowisp:  { kind: 'willowisp', name: 'WILL-O-WISP', tag: 'chills the murk', cost: [14, 22, 36], dps: [3, 6, 12], range: [120, 135, 150], fireRate: [1.4, 1.6, 1.9], projSpeed: 200, hp: 40, special: 'slow', tint: '#7ab8c4' },
  bulrush:    { kind: 'bulrush', name: 'BULRUSH', tag: 'holds the line', cost: [10, 16, 28], dps: [4, 9, 18], range: [70, 78, 88], fireRate: [1.8, 2.1, 2.5], projSpeed: 0, hp: 140, special: 'zone', tint: '#b8a35a' },
  moonbell:   { kind: 'moonbell', name: 'MOONBELL', tag: 'mends nearby roots', cost: [20, 30, 48], dps: [0, 0, 0], range: [110, 125, 140], fireRate: [0.5, 0.6, 0.75], projSpeed: 0, hp: 50, special: 'heal', tint: '#c4d4e8' },
};

// ---------- frog heroes ----------
export interface FrogDef {
  id: 'warden' | 'sporeback' | 'ribbit';
  name: string; tag: string;
  hp: number; speed: number; dashCd: number;
  weapon: { dmg: number; rate: number; range: number; projSpeed: number; kind: 'tongue' | 'spit' | 'sword'; arc?: number };
  buildDiscount?: number;   // sporeback grows cheaper
  rim: string;              // team-color rim fallback (P-color overrides in co-op)
  tint: string;
}

export const FROGS: FrogDef[] = [
  { id: 'warden', name: 'THE WARDEN', tag: 'tongue like a whipcrack', hp: 60, speed: 170, dashCd: 1.4, weapon: { dmg: 7, rate: 2.4, range: 150, projSpeed: 0, kind: 'tongue' }, rim: '#e8b84a', tint: '#5a8a4a' },
  { id: 'sporeback', name: 'SPOREBACK', tag: 'grows things cheaper', hp: 75, speed: 150, dashCd: 1.7, weapon: { dmg: 5, rate: 1.8, range: 230, projSpeed: 240, kind: 'spit' }, buildDiscount: 0.8, rim: '#4ac4b8', tint: '#6e5a8a' },
  // the greatsword fantasy: a sword bigger than the frog, heavy arcs, blood everywhere
  { id: 'ribbit', name: 'RIBBIT THE RED', tag: 'the sword is bigger than him', hp: 90, speed: 140, dashCd: 1.6, weapon: { dmg: 19, rate: 0.85, range: 105, projSpeed: 0, kind: 'sword', arc: Math.PI * 0.85 }, rim: '#e06050', tint: '#8a5040' },
];

// ---------- items (shop; stat mutations) ----------
export interface ItemDef {
  id: string; name: string; tag: string;
  tier: 1 | 2 | 3 | 4;
  base: number; // base price
  mod: Partial<{ dmg: number; rate: number; range: number; hp: number; speed: number; magnet: number;
                 towerDps: number; towerRange: number; buildDiscount: number; essenceGain: number;
                 dashCd: number; symbiosis: number }>;
}

export const ITEMS: ItemDef[] = [
  { id: 'flycap', name: 'FLY CAP', tag: 'hits harder', tier: 1, base: 12, mod: { dmg: 2 } },
  { id: 'reedwrap', name: 'REED WRAP', tag: 'thicker skin', tier: 1, base: 12, mod: { hp: 12 } },
  { id: 'pondskip', name: 'POND SKIP', tag: 'quicker legs', tier: 1, base: 12, mod: { speed: 14 } },
  { id: 'glowgrub', name: 'GLOW GRUB', tag: 'pulls essence', tier: 1, base: 10, mod: { magnet: 30 } },
  { id: 'tonguering', name: 'TONGUE RING', tag: 'faster snaps', tier: 1, base: 14, mod: { rate: 0.25 } },
  { id: 'rootcharm', name: 'ROOT CHARM', tag: 'plants bite harder', tier: 1, base: 14, mod: { towerDps: 0.12 } },
  { id: 'mirefang', name: 'MIREFANG', tag: 'much harder', tier: 2, base: 22, mod: { dmg: 4 } },
  { id: 'bogplate', name: 'BOG PLATE', tag: 'shrugs the swarm', tier: 2, base: 22, mod: { hp: 24 } },
  { id: 'deepreach', name: 'DEEP REACH', tag: 'longer snaps', tier: 2, base: 20, mod: { range: 30 } },
  { id: 'sporesatchel', name: 'SPORE SATCHEL', tag: 'grows for less', tier: 2, base: 24, mod: { buildDiscount: 0.9 } },
  { id: 'wispsight', name: 'WISP SIGHT', tag: 'plants see farther', tier: 2, base: 22, mod: { towerRange: 0.15 } },
  { id: 'heartmoss', name: 'HEARTMOSS', tag: 'essence blooms', tier: 2, base: 24, mod: { essenceGain: 0.15 } },
  { id: 'kingsfang', name: "KING'S FANG", tag: 'savage snaps', tier: 3, base: 38, mod: { dmg: 7, rate: 0.2 } },
  { id: 'lilyheart', name: 'LILYHEART', tag: 'alive and rooted', tier: 3, base: 40, mod: { hp: 30, towerDps: 0.15 } },
  { id: 'chorusbead', name: 'CHORUS BEAD', tag: 'symbiosis sings', tier: 3, base: 36, mod: { symbiosis: 0.25 } },
  { id: 'stormskip', name: 'STORM SKIP', tag: 'dash reborn', tier: 3, base: 36, mod: { dashCd: -0.4, speed: 12 } },
  { id: 'eldergland', name: 'ELDER GLAND', tag: 'the old power', tier: 4, base: 60, mod: { dmg: 10, towerDps: 0.2 } },
  { id: 'mireheart', name: 'MIREHEART', tag: 'the swamp provides', tier: 4, base: 62, mod: { hp: 40, essenceGain: 0.25, magnet: 40 } },
];

// ---------- wave composition ----------
// Each wave = list of spawn groups; count/hp scale via sim.ts. Weirdness debuts: 3/6/9/13/16.
export interface SpawnGroup { kind: EnemyKind; count: number; countPerWave: number; delay: number; interval: number; }
export interface WaveDef { groups: SpawnGroup[]; elite?: boolean; boss?: EnemyKind }

export function waveTable(): WaveDef[] {
  const W: WaveDef[] = [];
  for (let w = 1; w <= 20; w++) {
    const groups: SpawnGroup[] = [];
    const dur = w >= 20 ? 100 : Math.min(70, 25 + (w - 1) * 5);
    // baseline pressure: sludgelings all game, bogrunners from 2. Waves must FEEL like waves —
    // constant bodies (VS minimum-on-screen lesson), not a trickle.
    groups.push({ kind: 'sludgeling', count: 14 + w * 3, countPerWave: 0, delay: 0, interval: dur / (14 + w * 3) });
    if (w >= 2) groups.push({ kind: 'bogrunner', count: 6 + w * 2, countPerWave: 0, delay: 2, interval: dur / (6 + w * 2) });
    if (w >= 3) groups.push({ kind: 'spitter', count: 2 + Math.floor(w / 2), countPerWave: 0, delay: 5, interval: 7 });
    if (w >= 5) groups.push({ kind: 'hunter', count: 1 + Math.floor(w / 3), countPerWave: 0, delay: 8, interval: 10 });
    if (w >= 6) groups.push({ kind: 'shellback', count: 1 + Math.floor(w / 3), countPerWave: 0, delay: 7, interval: 9 });
    if (w >= 9) groups.push({ kind: 'broodmother', count: Math.floor(w / 5), countPerWave: 0, delay: 10, interval: 16 });
    if (w >= 13) groups.push({ kind: 'dragonfly', count: 6 + Math.floor(w / 2), countPerWave: 0, delay: 4, interval: 3 });
    if (w >= 16) groups.push({ kind: 'rotleech', count: Math.floor(w / 5), countPerWave: 0, delay: 8, interval: 13 });
    const def: WaveDef = { groups };
    if (w === 8) def.boss = 'elder_sludge';
    if (w === 10) def.boss = 'drowned_stag';
    if (w === 15) def.boss = 'mother_of_moths';
    if (w === 20) def.boss = 'rotting_king';
    if (w === 11 || w === 14 || w === 17) def.elite = true; // elite waves: pressure spike
    W.push(def);
  }
  return W;
}

// ---------- boss intro cards (spider-punk ritual — the ONE collage-punk surface) ----------
export const BOSS_CARDS: Partial<Record<EnemyKind, { name: string; tag: string }>> = {
  elder_sludge: { name: 'ELDER SLUDGE', tag: "the bog's first hunger" },
  drowned_stag: { name: 'THE DROWNED STAG', tag: 'what the water kept' },
  mother_of_moths: { name: 'MOTHER OF MOTHS', tag: 'her dust is a lullaby' },
  rotting_king: { name: 'THE ROTTING KING', tag: 'the swamp remembers' },
};

// ---------- arena root nodes (fixed sockets, BRIEF §7.1) ----------
export interface RootNode { x: number; y: number } // fractions of arena size
export const ROOT_NODES: RootNode[] = [
  { x: 0.30, y: 0.30 }, { x: 0.70, y: 0.30 },
  { x: 0.20, y: 0.55 }, { x: 0.80, y: 0.55 },
  { x: 0.35, y: 0.75 }, { x: 0.65, y: 0.75 },
  { x: 0.50, y: 0.22 }, { x: 0.50, y: 0.82 },
];

// spawn mouths (edges of the arena where enemies enter; forecast glyphs live here)
export const SPAWN_MOUTHS = [
  { x: 0.0, y: 0.35 }, { x: 0.0, y: 0.65 }, { x: 1.0, y: 0.35 }, { x: 1.0, y: 0.65 },
  { x: 0.35, y: 0.0 }, { x: 0.65, y: 0.0 }, { x: 0.35, y: 1.0 }, { x: 0.65, y: 1.0 },
];
