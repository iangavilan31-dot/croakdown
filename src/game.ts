// CROAKDOWN game state + simulation. Render-free: draws nothing, owns all rules.
// The GOAL wins: Brotato feel + TD brain, both halves essential (BRIEF §7.1).

import {
  ENEMIES, TOWERS, FROGS, ITEMS, waveTable, ROOT_NODES, SPAWN_MOUTHS,
  EnemyKind, TowerKind, EnemyDef, ItemDef, FrogDef, WaveDef,
} from './data';
import {
  makeRng, waveDuration, rerollCost, dropRate, itemPrice, maxTier, tierWeights,
  scaleHp, scaleCount, xpForLevel, hitstopFrames, SpatialHash, Pool,
  REVIVE_SECONDS, applyWaveEndRespawn, isRunLost, ENEMY_CAP, WAVE_COUNT,
} from './sim';
import { addHitstop, addTrauma, addDecal, addFloater, spawnParticles, juice } from './juice';
import { sfx } from './audio';

export const ARENA_W = 1280;
export const ARENA_H = 800;
export const HEART = { x: ARENA_W / 2, y: ARENA_H / 2, r: 46 };

export type Phase =
  | 'title' | 'frogpick' | 'wave' | 'levelup' | 'shop' | 'build' | 'ceremony'
  | 'gameover' | 'victory';

export interface FrogStats {
  dmg: number; rate: number; range: number; hp: number; speed: number; magnet: number;
  towerDps: number; towerRange: number; buildDiscount: number; essenceGain: number;
  dashCd: number; symbiosis: number;
}

export interface Frog {
  def: FrogDef;
  idx: number;                    // 0 = P1, 1 = P2
  x: number; y: number; vx: number; vy: number;
  hp: number; maxHp: number;
  state: 'alive' | 'downed';
  reviveProgress: number;
  dashT: number; dashCdT: number; dashDirX: number; dashDirY: number; iframes: number;
  atkCd: number;
  facing: number;
  stats: FrogStats;
  items: string[];
  level: number; xp: number; pendingPicks: number;
  buildChannel: number;           // 0..1 progress on current node action
  channelNode: number;            // node index being channeled, -1 none
  loadoutSel: number;             // selected tower species index into loadout
  hitFlash: number;
  attackAnim: number;
  attackTX: number; attackTY: number;
}

export interface Enemy {
  def: EnemyDef;
  x: number; y: number; hp: number; maxHp: number; dmg: number;
  alive: boolean;
  hitFlash: number; shakeT: number;
  atkCd: number; spawnCd: number;
  slowT: number;
  hitByFrog: number; hitByTower: number; // symbiosis timestamps
  phase: number; phaseT: number;         // bosses
  targetTower: number;                    // rotleech target idx, -1 none
  telegraph: number;                      // pre-spawn ground glyph timer
  isElite: boolean;
}

export interface Tower {
  kind: TowerKind; node: number; tier: number; owner: number; // owner frog idx (co-op attune-binding)
  x: number; y: number; hp: number; maxHp: number;
  fireCd: number; hitFlash: number; growAnim: number;
}

export interface Projectile {
  x: number; y: number; vx: number; vy: number; dmg: number; from: 'frog' | 'tower' | 'enemy';
  owner: number; pierce: number; aoe: number; slow: boolean; life: number; r: number; color: string;
  alive: boolean;
}

export interface Orb { x: number; y: number; vx: number; vy: number; value: number; alive: boolean; t: number }

export interface ShopCard { item: ItemDef | null; tower: TowerKind | null; price: number; locked: boolean; sold: boolean }

export interface Game {
  phase: Phase;
  time: number;
  rng: () => number;
  danger: number;
  players: number;                 // 1 or 2
  p2Mode: 'pad' | 'keys' | 'off';
  frogs: Frog[];
  enemies: Enemy[];
  towers: Tower[];
  projectiles: Projectile[];
  orbs: Orb[];
  essence: number;                 // shared wallet
  wave: number;                    // current wave number (1-based); 0 = pre-run
  waveT: number;
  spawnCursors: { g: number; spawned: number; t: number }[];
  waveSpawnsDone: boolean;
  waves: WaveDef[];
  heartHp: number; heartMax: number; heartFlash: number;
  shopCards: ShopCard[];
  rerolls: number;
  shopPanel: number;               // whose panel focused (co-op alternates)
  levelupChoices: { stat: keyof FrogStats; amount: number; name: string; tag: string }[][];
  levelupFrog: number;
  ceremonyT: number; ceremonyItem: ItemDef | null; ceremonyRevealed: boolean;
  bossRef: Enemy | null;
  bossIntroT: number; bossIntroKind: EnemyKind | null;
  // secrets (BRIEF §7.5c): a rare golden fly worth chasing; patient frogs grow wild mushrooms
  goldenFly: { x: number; y: number; t: number } | null;
  goldenFliesCaught: number;
  nodeIdleT: number[];
  frogPickSel: number[]; frogPickDanger: number; frogPickStage: number;
  titleT: number;
  victoryT: number; gameoverT: number;
  runStats: { kills: number; symbiosis: number; towersGrown: number; essenceEarned: number };
  buildReadyT: number;             // both frogs on pad timer
  forecast: { mouth: number; kinds: EnemyKind[] }[];
  worldDusk: number;               // 0 = build (day/dusk), 1 = wave (night) — lerped
  screenFlashHint: string;         // one short tag under title moments; '' = none
}

const ePool = new Pool<Enemy>(() => ({
  def: ENEMIES.sludgeling, x: 0, y: 0, hp: 1, maxHp: 1, dmg: 1, alive: false,
  hitFlash: 0, shakeT: 0, atkCd: 0, spawnCd: 0, slowT: 0, hitByFrog: -9, hitByTower: -9,
  phase: 0, phaseT: 0, targetTower: -1, telegraph: 0, isElite: false,
}), 64);
const pPool = new Pool<Projectile>(() => ({
  x: 0, y: 0, vx: 0, vy: 0, dmg: 0, from: 'frog', owner: 0, pierce: 0, aoe: 0, slow: false,
  life: 0, r: 4, color: '#fff', alive: false,
}), 64);
const oPool = new Pool<Orb>(() => ({ x: 0, y: 0, vx: 0, vy: 0, value: 1, alive: false, t: 0 }), 64);

export const hash = new SpatialHash<Enemy>(80);
const queryBuf: Enemy[] = [];

export function newGame(): Game {
  return {
    phase: 'title', time: 0, rng: makeRng(Date.now() >>> 0), danger: 0, players: 1, p2Mode: 'off',
    frogs: [], enemies: [], towers: [], projectiles: [], orbs: [], essence: 0,
    wave: 0, waveT: 0, spawnCursors: [], waveSpawnsDone: false, waves: waveTable(),
    heartHp: 200, heartMax: 200, heartFlash: 0,
    shopCards: [], rerolls: 0, shopPanel: 0,
    levelupChoices: [], levelupFrog: 0,
    ceremonyT: 0, ceremonyItem: null, ceremonyRevealed: false,
    bossRef: null, bossIntroT: 0, bossIntroKind: null,
    goldenFly: null, goldenFliesCaught: 0, nodeIdleT: ROOT_NODES.map(() => 0),
    frogPickSel: [0, 1], frogPickDanger: 0, frogPickStage: 0,
    titleT: 0, victoryT: 0, gameoverT: 0,
    runStats: { kills: 0, symbiosis: 0, towersGrown: 0, essenceEarned: 0 },
    buildReadyT: 0, forecast: [], worldDusk: 0, screenFlashHint: '',
  };
}

function baseStats(def: FrogDef): FrogStats {
  return {
    dmg: def.weapon.dmg, rate: def.weapon.rate, range: def.weapon.range,
    hp: def.hp, speed: def.speed, magnet: 46,
    towerDps: 1, towerRange: 1, buildDiscount: def.buildDiscount ?? 1,
    essenceGain: 1, dashCd: def.dashCd, symbiosis: 0.15,
  };
}

export function makeFrog(def: FrogDef, idx: number): Frog {
  const stats = baseStats(def);
  return {
    def, idx,
    x: HEART.x + (idx === 0 ? -90 : 90), y: HEART.y + 150, vx: 0, vy: 0,
    hp: stats.hp, maxHp: stats.hp, state: 'alive', reviveProgress: 0,
    dashT: 0, dashCdT: 0, dashDirX: 0, dashDirY: 1, iframes: 0, atkCd: 0, facing: 1,
    stats, items: [], level: 1, xp: 0, pendingPicks: 0,
    buildChannel: 0, channelNode: -1, loadoutSel: 0, hitFlash: 0, attackAnim: 0, attackTX: 0, attackTY: 0,
  };
}

export function startRun(g: Game) {
  g.frogs = [];
  g.frogs.push(makeFrog(FROGS[g.frogPickSel[0]], 0));
  if (g.players === 2) g.frogs.push(makeFrog(FROGS[g.frogPickSel[1]], 1));
  g.danger = g.frogPickDanger;
  g.enemies.length = 0; g.towers.length = 0; g.projectiles.length = 0; g.orbs.length = 0;
  g.essence = 24;
  g.wave = 0;
  g.heartMax = g.heartHp = 300 + g.danger * 30;
  g.runStats = { kills: 0, symbiosis: 0, towersGrown: 0, essenceEarned: 0 };
  enterBuild(g, true);
}

// ---------- phase transitions ----------
export function enterBuild(g: Game, first = false) {
  g.phase = 'build';
  g.buildReadyT = 0;
  // dawn-mend (Thronefall pattern): the swamp partially heals its heart between waves —
  // losses tax the run without spiraling it
  if (!first) g.heartHp = Math.min(g.heartMax, g.heartHp + Math.round((g.heartMax - g.heartHp) * 0.25));
  // forecast next wave at spawn mouths (world-space, feat #2)
  const next = g.waves[g.wave]; // wave index = next wave (0-based into table)
  g.forecast = [];
  if (next) {
    const kinds = [...new Set(next.groups.map(gr => gr.kind))];
    if (next.boss) kinds.push(next.boss);
    const mouths = pickMouths(g, Math.min(4, 2 + Math.floor(g.wave / 6)));
    for (const m of mouths) g.forecast.push({ mouth: m, kinds: kinds.slice(0, 3) });
  }
  // wave-end safety net: downed frogs return at 50% HP if anyone survived (research co-op spec)
  if (!first && g.frogs.some(f => f.state === 'alive')) {
    for (const f of g.frogs) if (f.state === 'downed') {
      f.state = 'alive';
      f.hp = Math.max(1, Math.round(f.maxHp * 0.5));
      f.reviveProgress = 0;
    }
  }
}

function pickMouths(g: Game, n: number): number[] {
  const idx = SPAWN_MOUTHS.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(g.rng() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx.slice(0, n);
}

export function startWave(g: Game) {
  g.wave++;
  g.waveT = 0;
  g.waveSpawnsDone = false;
  g.phase = 'wave';
  g.bossRef = null;
  const def = g.waves[g.wave - 1];
  g.spawnCursors = def.groups.map((_, gi) => ({ g: gi, spawned: 0, t: def.groups[gi].delay }));
  sfx('waveStart');
}

function endWave(g: Game) {
  // essence sweep: vacuum all remaining orbs
  for (const o of g.orbs) if (o.alive) { collectOrb(g, o); }
  g.orbs.length = 0;
  const def = g.waves[g.wave - 1];
  if (g.wave >= WAVE_COUNT) { g.phase = 'victory'; g.victoryT = 0; sfx('victory'); return; }
  if (def.boss && g.ceremonyItem) { g.phase = 'ceremony'; g.ceremonyT = 0; g.ceremonyRevealed = false; return; }
  afterCeremony(g);
}

export function afterCeremony(g: Game) {
  g.ceremonyItem = null;
  // level-up picks first (hard-paused), then shop, then build
  queueLevelups(g);
  if (g.levelupChoices.length) { g.phase = 'levelup'; return; }
  openShop(g);
}

function queueLevelups(g: Game) {
  g.levelupChoices = [];
  for (const f of g.frogs) {
    while (f.pendingPicks > 0) {
      f.pendingPicks--;
      g.levelupChoices.push(rollStatPicks(g, f.idx));
    }
  }
  g.levelupFrog = 0;
}

const STAT_PICKS: { stat: keyof FrogStats; amount: number; name: string; tag: string }[] = [
  { stat: 'dmg', amount: 2, name: 'FANG', tag: 'hit harder' },
  { stat: 'hp', amount: 10, name: 'HIDE', tag: 'take more' },
  { stat: 'speed', amount: 10, name: 'LEGS', tag: 'move quicker' },
  { stat: 'rate', amount: 0.18, name: 'SNAP', tag: 'attack faster' },
  { stat: 'magnet', amount: 22, name: 'GLOW', tag: 'pull essence' },
  { stat: 'towerDps', amount: 0.08, name: 'ROOTS', tag: 'plants bite harder' },
  { stat: 'range', amount: 16, name: 'REACH', tag: 'strike farther' },
];

function rollStatPicks(g: Game, frogIdx: number) {
  const picks: typeof STAT_PICKS = [];
  const pool = [...STAT_PICKS];
  for (let i = 0; i < 3 && pool.length; i++) picks.push(pool.splice(Math.floor(g.rng() * pool.length), 1)[0]);
  return picks.map(p => ({ ...p, frogIdx } as any));
}

export function applyStatPick(g: Game, pick: { stat: keyof FrogStats; amount: number; frogIdx?: number }) {
  const f = g.frogs[(pick as any).frogIdx ?? g.levelupFrog] ?? g.frogs[0];
  (f.stats[pick.stat] as number) += pick.amount;
  if (pick.stat === 'hp') { f.maxHp += pick.amount; f.hp += pick.amount; }
  sfx('pick');
}

export function openShop(g: Game) {
  g.phase = 'shop';
  g.rerolls = 0;
  g.shopPanel = 0;
  rollShop(g);
}

export function rollShop(g: Game) {
  const w = g.wave;
  const cards: ShopCard[] = g.shopCards.filter(c => c.locked && !c.sold);
  const tw = tierWeights(w);
  const cap = maxTier(w);
  while (cards.length < 4) {
    // training wheels: shops 1-2 guarantee 2 tower species offers
    const wantTower = (w <= 2 && cards.filter(c => c.tower).length < 2) || (g.rng() < 0.3);
    if (wantTower) {
      const kinds = Object.keys(TOWERS) as TowerKind[];
      const k = kinds[Math.floor(g.rng() * kinds.length)];
      cards.push({ item: null, tower: k, price: itemPrice(TOWERS[k].cost[0], w), locked: false, sold: false });
    } else {
      let tier = 1;
      const r = g.rng() * (tw[0] + tw[1] + tw[2] + tw[3]);
      if (r > tw[0] + tw[1] + tw[2]) tier = 4; else if (r > tw[0] + tw[1]) tier = 3; else if (r > tw[0]) tier = 2;
      tier = Math.min(tier, cap);
      const pool = ITEMS.filter(i => i.tier === tier);
      const item = pool[Math.floor(g.rng() * pool.length)];
      cards.push({ item, tower: null, price: itemPrice(item.base, w), locked: false, sold: false });
    }
  }
  g.shopCards = cards;
}

export function buyCard(g: Game, ci: number, frogIdx: number) {
  const c = g.shopCards[ci];
  if (!c || c.sold || g.essence < c.price) { sfx('deny'); return; }
  g.essence -= c.price;
  c.sold = true;
  const f = g.frogs[frogIdx] ?? g.frogs[0];
  if (c.item) {
    f.items.push(c.item.id);
    applyItem(f, c.item);
  }
  // tower purchase = species unlocked into shared loadout (grow cost still paid at node)
  if (c.tower) unlockTower(g, c.tower);
  sfx('buy');
}

const unlockedTowers = new Set<TowerKind>();
export function unlockTower(_g: Game, k: TowerKind) { unlockedTowers.add(k); }
export function loadout(): TowerKind[] {
  const base = (Object.keys(TOWERS) as TowerKind[]).filter(k => TOWERS[k].tier1Unlocked);
  for (const k of unlockedTowers) if (!base.includes(k)) base.push(k);
  return base;
}
export function resetLoadout() { unlockedTowers.clear(); }

function applyItem(f: Frog, item: ItemDef) {
  const m = item.mod;
  if (m.dmg) f.stats.dmg += m.dmg;
  if (m.rate) f.stats.rate += m.rate;
  if (m.range) f.stats.range += m.range;
  if (m.hp) { f.stats.hp += m.hp; f.maxHp += m.hp; f.hp += m.hp; }
  if (m.speed) f.stats.speed += m.speed;
  if (m.magnet) f.stats.magnet += m.magnet;
  if (m.towerDps) f.stats.towerDps += m.towerDps;
  if (m.towerRange) f.stats.towerRange += m.towerRange;
  if (m.buildDiscount) f.stats.buildDiscount *= m.buildDiscount;
  if (m.essenceGain) f.stats.essenceGain += m.essenceGain;
  if (m.dashCd) f.stats.dashCd = Math.max(0.5, f.stats.dashCd + m.dashCd);
  if (m.symbiosis) f.stats.symbiosis += m.symbiosis;
}

// ---------- spawning ----------
function spawnEnemy(g: Game, kind: EnemyKind, elite = false): Enemy | null {
  // Brotato cap trick: silently retire the oldest non-elite, zero effects
  if (g.enemies.length >= ENEMY_CAP) {
    const idx = g.enemies.findIndex(e => e.alive && !e.def.boss && !e.isElite);
    if (idx >= 0) { const old = g.enemies[idx]; old.alive = false; g.enemies.splice(idx, 1); ePool.put(old); }
    else return null;
  }
  const def = ENEMIES[kind];
  const m = SPAWN_MOUTHS[Math.floor(g.rng() * SPAWN_MOUTHS.length)];
  const e = ePool.get();
  e.def = def;
  e.x = m.x * ARENA_W + (g.rng() - 0.5) * 60;
  e.y = m.y * ARENA_H + (g.rng() - 0.5) * 60;
  e.x = Math.max(10, Math.min(ARENA_W - 10, e.x));
  e.y = Math.max(10, Math.min(ARENA_H - 10, e.y));
  const eliteMul = elite ? 3.2 : 1;
  e.maxHp = e.hp = scaleHp(def.hp, def.hpPerWave, g.wave, g.danger, g.players, downedCount(g)) * eliteMul;
  e.dmg = Math.round((def.dmg + def.dmgPerWave * (g.wave - 1)) * (elite ? 1.5 : 1));
  e.alive = true; e.hitFlash = 0; e.shakeT = 0; e.atkCd = 0; e.spawnCd = def.spawns?.every ?? 0;
  e.slowT = 0; e.hitByFrog = -9; e.hitByTower = -9; e.phase = 0; e.phaseT = 0; e.targetTower = -1;
  e.telegraph = 0.9; // ground glyph before activation (~1s, tuned by feel)
  e.isElite = elite;
  g.enemies.push(e);
  if (def.boss) {
    g.bossRef = e;
    // freeze-frame intro card (BRIEF boss ritual; spider-punk surface)
    g.bossIntroT = 2.2;
    g.bossIntroKind = def.kind;
    sfx('bossIntro');
    addTrauma(0.5);
  }
  return e;
}

function downedCount(g: Game) { return g.frogs.filter(f => f.state === 'downed').length; }

// ---------- damage ----------
export function damageEnemy(g: Game, e: Enemy, dmg: number, from: 'frog' | 'tower', sourceX: number, sourceY: number) {
  if (!e.alive || e.telegraph > 0) return;
  // shellback front armor: immune if hit from the facing side (toward heart)
  if (e.def.armorFront) {
    const toHeartX = HEART.x - e.x, toHeartY = HEART.y - e.y;
    const fromX = sourceX - e.x, fromY = sourceY - e.y;
    const dot = toHeartX * fromX + toHeartY * fromY;
    if (dot > 0) { sfx('clink'); spawnParticles(e.x, e.y, 3, { color: '#9db4b4', speed: 60, maxLife: 0.25 }); return; }
  }
  e.hp -= dmg;
  e.hitFlash = 0.1;
  e.shakeT = 0.12;
  if (from === 'frog') e.hitByFrog = g.time; else e.hitByTower = g.time;
  const kill = e.hp <= 0;
  addHitstop(hitstopFrames(dmg, kill));
  if (kill) killEnemy(g, e); else sfx('hit');
}

function killEnemy(g: Game, e: Enemy) {
  e.alive = false;
  g.runStats.kills++;
  addTrauma(e.def.boss ? 0.6 : e.isElite ? 0.25 : 0.06);
  addDecal(e.x, e.y, e.def.boss ? 'scorch' : g.rng() < 0.4 ? 'bones' : g.rng() < 0.6 ? 'blood' : 'stain');
  spawnParticles(e.x, e.y, e.def.boss ? 40 : 10, { color: e.def.tint, speed: e.def.boss ? 220 : 120, maxLife: 0.6, size: 4 });
  // everything bleeds a little; big things bleed a lot (Ian's gore correction)
  spawnParticles(e.x, e.y, e.def.boss ? 26 : e.isElite ? 12 : 5, { color: '#8c1622', speed: e.def.boss ? 200 : 110, maxLife: 0.5, gravity: 140, size: 3 });
  sfx(e.def.boss ? 'bossDie' : 'kill');
  // symbiosis: mixed frog+tower damage within 1.2s → bonus (golden burst, no text)
  const mixed = g.time - e.hitByFrog < 1.2 && g.time - e.hitByTower < 1.2;
  let essence = e.def.essence;
  if (mixed && essence > 0) {
    const bonus = Math.max(1, Math.round(essence * (g.frogs[0]?.stats.symbiosis ?? 0.15)));
    essence += bonus;
    g.runStats.symbiosis++;
    spawnParticles(e.x, e.y, 8, { color: '#ffd75e', speed: 90, maxLife: 0.5, glow: true });
  }
  // drop decay (research: −1.5%/wave to 50% floor)
  const rate = dropRate(g.wave);
  for (let i = 0; i < essence; i++) {
    if (g.rng() > rate) continue;
    const o = oPool.get();
    o.x = e.x; o.y = e.y;
    const a = g.rng() * Math.PI * 2, s = 40 + g.rng() * 80;
    o.vx = Math.cos(a) * s; o.vy = Math.sin(a) * s;
    o.value = 1; o.alive = true; o.t = 0;
    g.orbs.push(o);
  }
  if (e.def.boss) {
    // ceremony reward (feat #4): roll a tiered item, revealed by the Great Lotus
    const cap = maxTier(g.wave);
    const pool = ITEMS.filter(i => i.tier <= cap);
    g.ceremonyItem = pool[Math.floor(g.rng() * pool.length)];
    g.bossRef = null;
  }
}

function collectOrb(g: Game, o: Orb) {
  if (!o.alive) return;
  o.alive = false;
  const gain = o.value;
  g.essence += gain;
  g.runStats.essenceEarned += gain;
  // essence is XP too (one-currency law): feed the lowest-level living frog
  const f = [...g.frogs].filter(fr => fr.state === 'alive').sort((a, b) => a.level - b.level)[0] ?? g.frogs[0];
  if (f) {
    f.xp += gain;
    while (f.xp >= xpForLevel(f.level)) { f.xp -= xpForLevel(f.level); f.level++; f.pendingPicks++; }
  }
  sfx('pip');
}

export function damageFrog(g: Game, f: Frog, dmg: number) {
  if (f.state !== 'alive' || f.iframes > 0) return;
  f.hp -= dmg;
  f.hitFlash = 0.12;
  f.iframes = 0.35;
  addTrauma(0.18);
  sfx('hurt');
  if (f.hp <= 0) {
    f.hp = 0; f.state = 'downed'; f.reviveProgress = 0;
    addTrauma(0.5); sfx('down');
    spawnParticles(f.x, f.y, 20, { color: f.def.tint, speed: 140, maxLife: 0.7 });
  }
}

export function damageHeart(g: Game, dmg: number) {
  // gnawing the Heartbloom is slower than fighting frogs — leaks are a tax the frog can
  // still answer, not an instant loss (the scalpel role needs time to work)
  g.heartHp -= Math.max(1, Math.ceil(dmg * 0.5));
  g.heartFlash = 0.15;
  addTrauma(0.3);
  sfx('heartHit');
  if (g.heartHp <= 0) g.heartHp = 0;
}

export function damageTower(g: Game, t: Tower, dmg: number) {
  t.hp -= dmg;
  t.hitFlash = 0.1;
  if (t.hp <= 0) {
    const i = g.towers.indexOf(t);
    if (i >= 0) g.towers.splice(i, 1);
    addDecal(t.x, t.y, 'lily');
    spawnParticles(t.x, t.y, 16, { color: TOWERS[t.kind].tint, speed: 130, maxLife: 0.6 });
    addTrauma(0.2); sfx('towerDie');
  }
}

// ---------- per-frame update (wave phase) ----------
export function updateWave(g: Game, dt: number, inputs: import('./input').PlayerInput[]) {
  const def = g.waves[g.wave - 1];
  g.waveT += dt;

  // spawn director — starving screen accelerates spawns (VS minimum-on-screen lesson)
  const liveCount = g.enemies.reduce((n, e) => n + (e.alive ? 1 : 0), 0);
  const minOnScreen = 4 + Math.floor(g.wave * 1.2);
  const spawnDt = liveCount < minOnScreen ? dt * 3 : dt;
  let allSpawned = true;
  for (const cur of g.spawnCursors) {
    const grp = def.groups[cur.g];
    const total = scaleCount(grp.count, grp.countPerWave, g.wave, g.danger, g.players) * (def.elite ? 1.5 : 1);
    if (cur.spawned >= total) continue;
    allSpawned = false;
    cur.t -= spawnDt;
    if (cur.t <= 0) {
      spawnEnemy(g, grp.kind, def.elite && g.rng() < 0.12);
      cur.spawned++;
      cur.t = grp.interval * (0.75 + g.rng() * 0.5) * waveDuration(g.wave) / waveDuration(g.wave); // jittered
    }
  }
  if (allSpawned && !g.waveSpawnsDone) {
    // boss enters after the wave's regular spawns are committed (BTD6: waves continue underneath)
    if (def.boss && !g.enemies.some(e => e.def.boss)) spawnEnemy(g, def.boss);
    else g.waveSpawnsDone = true;
  }

  updateFrogs(g, dt, inputs, true);
  updateEnemies(g, dt);
  updateTowers(g, dt);
  updateProjectiles(g, dt);
  updateOrbs(g, dt);
  updateSecrets(g, dt);

  // lose/win checks
  if (isRunLost(g.frogs.map(f => ({ state: f.state === 'alive' ? 'alive' as const : 'downed' as const, hp: f.hp, maxHp: f.maxHp, reviveProgress: 0 })), g.heartHp)) {
    if (g.heartHp <= 0 || g.frogs.every(f => f.state !== 'alive')) { g.phase = 'gameover'; g.gameoverT = 0; sfx('gameover'); return; }
  }
  if (g.waveSpawnsDone && !g.enemies.some(e => e.alive)) endWave(g);
}

export function updateFrogs(g: Game, dt: number, inputs: import('./input').PlayerInput[], combat: boolean) {
  for (const f of g.frogs) {
    const inp = inputs[f.idx] ?? inputs[0];
    f.hitFlash = Math.max(0, f.hitFlash - dt);
    f.iframes = Math.max(0, f.iframes - dt);
    f.attackAnim = Math.max(0, f.attackAnim - dt * 4);

    if (f.state === 'downed') {
      // partner revive: living frog stands near, channel fills (REVIVE_SECONDS)
      const partner = g.frogs.find(o => o !== f && o.state === 'alive');
      if (partner && dist(partner.x, partner.y, f.x, f.y) < 50) {
        f.reviveProgress += dt / REVIVE_SECONDS;
        if (f.reviveProgress >= 1) {
          f.state = 'alive'; f.hp = Math.max(1, Math.round(f.maxHp * 0.35)); f.reviveProgress = 0;
          spawnParticles(f.x, f.y, 18, { color: '#aef0c0', speed: 110, maxLife: 0.6, glow: true });
          sfx('revive');
        }
      } else f.reviveProgress = Math.max(0, f.reviveProgress - dt * 0.5);
      continue;
    }

    // movement
    let mx = inp.mx, my = inp.my;
    const ml = Math.hypot(mx, my);
    if (ml > 1) { mx /= ml; my /= ml; }
    f.dashCdT = Math.max(0, f.dashCdT - dt);
    if (inp.dash && f.dashCdT <= 0 && (mx || my)) {
      f.dashT = 0.18; f.dashCdT = f.stats.dashCd; f.iframes = 0.22;
      f.dashDirX = mx; f.dashDirY = my;
      sfx('dash');
      spawnParticles(f.x, f.y, 6, { color: '#cfe8d0', speed: 60, maxLife: 0.3 });
    }
    if (f.dashT > 0) {
      f.dashT -= dt;
      f.x += f.dashDirX * 620 * dt;
      f.y += f.dashDirY * 620 * dt;
    } else {
      f.x += mx * f.stats.speed * dt;
      f.y += my * f.stats.speed * dt;
    }
    if (mx) f.facing = Math.sign(mx);
    f.x = Math.max(14, Math.min(ARENA_W - 14, f.x));
    f.y = Math.max(14, Math.min(ARENA_H - 14, f.y));

    // auto-attack nearest enemy in range (Brotato feel)
    if (combat) {
      f.atkCd -= dt;
      if (f.atkCd <= 0) {
        const target = nearestEnemy(g, f.x, f.y, f.stats.range);
        if (target) {
          f.atkCd = 1 / f.stats.rate;
          f.attackAnim = 1;
          f.attackTX = target.x; f.attackTY = target.y;
          if (f.def.weapon.kind === 'tongue') {
            damageEnemy(g, target, f.stats.dmg, 'frog', f.x, f.y);
            spawnParticles(target.x, target.y, 4, { color: '#ffb0c0', speed: 80, maxLife: 0.25 });
            sfx('tongue');
          } else if (f.def.weapon.kind === 'sword') {
            // heavy greatsword arc: hits EVERYTHING in the crescent toward the target
            const swingA = Math.atan2(target.y - f.y, target.x - f.x);
            const halfArc = (f.def.weapon.arc ?? Math.PI * 0.8) / 2;
            hash.query(f.x, f.y, f.stats.range, queryBuf);
            let connected = 0;
            for (const e of queryBuf) {
              if (!e.alive || e.telegraph > 0) continue;
              const d = dist(f.x, f.y, e.x, e.y);
              if (d > f.stats.range + e.def.radius) continue;
              let da = Math.atan2(e.y - f.y, e.x - f.x) - swingA;
              while (da > Math.PI) da -= Math.PI * 2;
              while (da < -Math.PI) da += Math.PI * 2;
              if (Math.abs(da) <= halfArc) {
                damageEnemy(g, e, f.stats.dmg, 'frog', f.x, f.y);
                // blood gushes away from the swing
                spawnParticles(e.x, e.y, 7, { color: '#a01c28', speed: 170, maxLife: 0.55, angle: swingA, spread: 1.1, gravity: 120 });
                connected++;
              }
            }
            if (connected > 0) { addTrauma(0.10 + connected * 0.02); addHitstop(3 + Math.min(4, connected)); }
            sfx('bite'); // heavy chop layer until the sword SFX pass
          } else {
            fireProjectile(g, f.x, f.y, target.x, target.y, f.stats.dmg, 'frog', f.idx, f.def.weapon.projSpeed, 0, 0, false, '#bde06a');
            sfx('spit');
          }
        }
      }
    }

    // diegetic build/attune channel (only outside combat OR during combat too — BRIEF: during both)
    handleBuildChannel(g, f, inp, dt);
  }
}

function handleBuildChannel(g: Game, f: Frog, inp: import('./input').PlayerInput, dt: number) {
  const lo = loadout();
  if (inp.cycle) { f.loadoutSel = (f.loadoutSel + 1) % lo.length; sfx('cycle'); }
  // find nearest node
  let best = -1, bestD = 64;
  for (let i = 0; i < ROOT_NODES.length; i++) {
    const nx = ROOT_NODES[i].x * ARENA_W, ny = ROOT_NODES[i].y * ARENA_H;
    const d = dist(f.x, f.y, nx, ny);
    if (d < bestD) { best = i; bestD = d; }
  }
  if (best < 0 || !inp.build) { f.buildChannel = 0; f.channelNode = -1; return; }
  const existing = g.towers.find(t => t.node === best);
  const kind = lo[f.loadoutSel % lo.length];
  const def = existing ? TOWERS[existing.kind] : TOWERS[kind];
  // attune-binding: co-op — only the grower upgrades their tower (scarcity roles)
  if (existing && g.players === 2 && existing.owner !== f.idx) return;
  if (existing && existing.tier >= 3) return;
  const cost = Math.round((existing ? def.cost[existing.tier] : def.cost[0]) * f.stats.buildDiscount);
  if (g.essence < cost) { f.buildChannel = 0; return; }
  f.channelNode = best;
  const CHANNEL_TIME = existing ? 1.0 : 0.8;
  f.buildChannel += dt / CHANNEL_TIME;
  // spores fly from wallet to plant (render reads channel progress)
  if (f.buildChannel >= 1) {
    f.buildChannel = 0;
    g.essence -= cost;
    if (existing) {
      existing.tier++;
      existing.maxHp += 40; existing.hp = existing.maxHp;
      existing.growAnim = 1;
      sfx('attune');
      spawnParticles(existing.x, existing.y, 14, { color: TOWERS[existing.kind].tint, speed: 100, maxLife: 0.5, glow: true });
    } else {
      const nx = ROOT_NODES[best].x * ARENA_W, ny = ROOT_NODES[best].y * ARENA_H;
      g.towers.push({ kind, node: best, tier: 1, owner: f.idx, x: nx, y: ny, hp: TOWERS[kind].hp, maxHp: TOWERS[kind].hp, fireCd: 0, hitFlash: 0, growAnim: 1 });
      g.runStats.towersGrown++;
      sfx('grow');
      spawnParticles(nx, ny, 16, { color: TOWERS[kind].tint, speed: 120, maxLife: 0.6, glow: true });
    }
  }
}

function updateEnemies(g: Game, dt: number) {
  hash.clear();
  for (const e of g.enemies) if (e.alive) hash.insert(e);

  for (let i = g.enemies.length - 1; i >= 0; i--) {
    const e = g.enemies[i];
    if (!e.alive) { g.enemies.splice(i, 1); ePool.put(e); continue; }
    e.hitFlash = Math.max(0, e.hitFlash - dt);
    e.shakeT = Math.max(0, e.shakeT - dt);
    if (e.telegraph > 0) { e.telegraph -= dt; continue; }
    const slowMul = e.slowT > 0 ? 0.55 : 1;
    e.slowT = Math.max(0, e.slowT - dt);

    // targeting (the master dial)
    let tx = HEART.x, ty = HEART.y, targetFrog: Frog | null = null, targetTower: Tower | null = null;
    if (e.def.aggro === 'frog') {
      let bd = 1e9;
      for (const f of g.frogs) if (f.state === 'alive') { const d = dist(e.x, e.y, f.x, f.y); if (d < bd) { bd = d; targetFrog = f; } }
      if (targetFrog) { tx = targetFrog.x; ty = targetFrog.y; }
    } else if (e.def.aggro === 'tower' && g.towers.length) {
      let bd = 1e9;
      for (const t of g.towers) { const d = dist(e.x, e.y, t.x, t.y); if (d < bd) { bd = d; targetTower = t; } }
      if (targetTower) { tx = targetTower.x; ty = targetTower.y; }
    }

    const dx = tx - e.x, dy = ty - e.y;
    const d = Math.hypot(dx, dy) || 1;

    // ranged attackers hold at range
    if (e.def.ranged && d < e.def.ranged.range) {
      e.atkCd -= dt;
      if (e.atkCd <= 0) {
        e.atkCd = e.def.ranged.cooldown;
        fireProjectile(g, e.x, e.y, tx, ty, e.dmg, 'enemy', -1, e.def.ranged.projSpeed, 0, 0, false, '#c47a5a');
        sfx('espit');
      }
    } else {
      e.x += (dx / d) * e.def.speed * slowMul * dt;
      e.y += (dy / d) * e.def.speed * slowMul * dt;
    }

    // contact damage
    e.atkCd -= dt;
    if (e.atkCd <= 0) {
      if (targetFrog && d < e.def.radius + 16) { damageFrog(g, targetFrog, e.dmg); e.atkCd = 0.8; }
      else if (targetTower && d < e.def.radius + 20) { damageTower(g, targetTower, e.dmg); e.atkCd = 0.7; }
      else if (!targetFrog && !targetTower && d < e.def.radius + HEART.r) { damageHeart(g, e.dmg); e.atkCd = 1.0; }
    }

    // spawners
    if (e.def.spawns) {
      e.spawnCd -= dt;
      if (e.spawnCd <= 0) {
        e.spawnCd = e.def.spawns.every;
        for (let s = 0; s < e.def.spawns.count; s++) {
          const child = spawnEnemy(g, e.def.spawns.kind);
          if (child) { child.x = e.x + (g.rng() - 0.5) * 30; child.y = e.y + (g.rng() - 0.5) * 30; child.telegraph = 0.4; }
        }
        spawnParticles(e.x, e.y, 6, { color: e.def.tint, speed: 70, maxLife: 0.4 });
      }
    }

    // boss phases: HP% OR elapsed time, whichever first (Brotato Rhino law)
    if (e.def.boss) {
      e.phaseT += dt;
      const hpFrac = e.hp / e.maxHp;
      const nextPhaseAt = [0.66, 0.33, -1][e.phase] ?? -1;
      const timeTrigger = e.phaseT > 30;
      if (nextPhaseAt > 0 && (hpFrac <= nextPhaseAt || timeTrigger)) {
        e.phase++;
        e.phaseT = 0;
        addTrauma(0.6);
        addHitstop(10);
        juice.zoomPulse = 1;
        sfx('bossPhase');
        // each phase: summon adds + world reacts (render reads bossRef.phase)
        const addKind: EnemyKind = e.def.kind === 'drowned_stag' ? 'bogrunner' : e.def.kind === 'mother_of_moths' ? 'dragonfly' : 'sludgeling';
        for (let s = 0; s < 4 + e.phase * 2; s++) spawnEnemy(g, addKind);
      }
    }
  }
}

function updateTowers(g: Game, dt: number) {
  for (const t of g.towers) {
    t.hitFlash = Math.max(0, t.hitFlash - dt);
    t.growAnim = Math.max(0, t.growAnim - dt * 2);
    const def = TOWERS[t.kind];
    const ownerStats = g.frogs[t.owner]?.stats ?? g.frogs[0].stats;
    const range = def.range[t.tier - 1] * ownerStats.towerRange;
    t.fireCd -= dt;
    if (t.fireCd > 0) continue;

    if (def.special === 'heal') {
      // moonbell mends nearby towers + heart
      t.fireCd = 1 / def.fireRate[t.tier - 1];
      let healed = false;
      for (const o of g.towers) if (o !== t && dist(t.x, t.y, o.x, o.y) < range && o.hp < o.maxHp) { o.hp = Math.min(o.maxHp, o.hp + 4 + t.tier * 2); healed = true; }
      if (dist(t.x, t.y, HEART.x, HEART.y) < range && g.heartHp < g.heartMax) { g.heartHp = Math.min(g.heartMax, g.heartHp + 2 + t.tier); healed = true; }
      if (healed) spawnParticles(t.x, t.y, 3, { color: '#d8ecff', speed: 40, maxLife: 0.5, glow: true });
      continue;
    }

    const target = nearestEnemy(g, t.x, t.y, range);
    if (!target) continue;
    t.fireCd = 1 / def.fireRate[t.tier - 1];
    const dmg = Math.max(1, Math.round(def.dps[t.tier - 1] / def.fireRate[t.tier - 1] * ownerStats.towerDps));
    if (def.projSpeed > 0) {
      fireProjectile(g, t.x, t.y, target.x, target.y, dmg, 'tower', t.owner, def.projSpeed,
        def.special === 'pierce' ? 2 : 0, def.special === 'aoe' ? 46 : 0, def.special === 'slow', def.tint);
    } else {
      // melee towers (snaplily/bulrush): bite everything in inner radius
      hash.query(t.x, t.y, range, queryBuf);
      let bit = false;
      for (const e of queryBuf) {
        if (!e.alive || e.telegraph > 0) continue;
        if (dist(t.x, t.y, e.x, e.y) <= range) { damageEnemy(g, e, dmg, 'tower', t.x, t.y); bit = true; if (def.kind === 'snaplily') break; }
      }
      if (bit) { sfx('bite'); spawnParticles(t.x, t.y, 3, { color: def.tint, speed: 60, maxLife: 0.3 }); }
    }
  }
}

function fireProjectile(g: Game, x: number, y: number, tx: number, ty: number, dmg: number,
  from: Projectile['from'], owner: number, speed: number, pierce: number, aoe: number, slow: boolean, color: string) {
  const p = pPool.get();
  const d = Math.hypot(tx - x, ty - y) || 1;
  p.x = x; p.y = y;
  p.vx = ((tx - x) / d) * speed; p.vy = ((ty - y) / d) * speed;
  p.dmg = dmg; p.from = from; p.owner = owner; p.pierce = pierce; p.aoe = aoe; p.slow = slow;
  p.life = 2.4; p.r = from === 'enemy' ? 6 : 5; p.color = color; p.alive = true;
  g.projectiles.push(p);
}

function updateProjectiles(g: Game, dt: number) {
  for (let i = g.projectiles.length - 1; i >= 0; i--) {
    const p = g.projectiles[i];
    p.life -= dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    let dead = p.life <= 0 || p.x < -20 || p.x > ARENA_W + 20 || p.y < -20 || p.y > ARENA_H + 20;
    if (!dead && p.from === 'enemy') {
      for (const f of g.frogs) {
        if (f.state === 'alive' && dist(p.x, p.y, f.x, f.y) < 16) { damageFrog(g, f, p.dmg); dead = true; break; }
      }
      if (!dead && dist(p.x, p.y, HEART.x, HEART.y) < HEART.r) { damageHeart(g, p.dmg); dead = true; }
    } else if (!dead) {
      hash.query(p.x, p.y, 24, queryBuf);
      for (const e of queryBuf) {
        if (!e.alive || e.telegraph > 0) continue;
        if (dist(p.x, p.y, e.x, e.y) < e.def.radius + p.r) {
          if (p.aoe > 0) {
            hash.query(p.x, p.y, p.aoe, queryBuf);
            const hitList = queryBuf.filter(o => o.alive && dist(p.x, p.y, o.x, o.y) <= p.aoe);
            for (const o of hitList) damageEnemy(g, o, p.dmg, p.from === 'tower' ? 'tower' : 'frog', p.x, p.y);
            spawnParticles(p.x, p.y, 12, { color: p.color, speed: 130, maxLife: 0.4, glow: true });
            sfx('burst');
            dead = true;
          } else {
            damageEnemy(g, e, p.dmg, p.from === 'tower' ? 'tower' : 'frog', p.x, p.y);
            if (p.slow) e.slowT = 1.4;
            if (p.pierce > 0) { p.pierce--; } else dead = true;
          }
          break;
        }
      }
    }
    if (dead) { g.projectiles.splice(i, 1); p.alive = false; pPool.put(p); }
  }
}

function updateOrbs(g: Game, dt: number) {
  for (let i = g.orbs.length - 1; i >= 0; i--) {
    const o = g.orbs[i];
    o.t += dt;
    o.vx *= 0.92; o.vy *= 0.92;
    // magnet: nearest living frog inside magnet radius pulls
    let puller: Frog | null = null, bd = 1e9;
    for (const f of g.frogs) if (f.state === 'alive') {
      const d = dist(o.x, o.y, f.x, f.y);
      if (d < f.stats.magnet + 10 && d < bd) { bd = d; puller = f; }
    }
    if (puller) {
      const d = bd || 1;
      o.vx += ((puller.x - o.x) / d) * 900 * dt;
      o.vy += ((puller.y - o.y) / d) * 900 * dt;
    }
    o.x += o.vx * dt; o.y += o.vy * dt;
    if (puller && bd < 18) { collectOrb(g, o); g.orbs.splice(i, 1); oPool.put(o); continue; }
    if (!o.alive) { g.orbs.splice(i, 1); oPool.put(o); }
  }
}

export function nearestEnemy(g: Game, x: number, y: number, range: number): Enemy | null {
  hash.query(x, y, range, queryBuf);
  let best: Enemy | null = null, bd = range;
  for (const e of queryBuf) {
    if (!e.alive || e.telegraph > 0) continue;
    const d = dist(x, y, e.x, e.y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

// ---------- secrets ----------
function updateSecrets(g: Game, dt: number) {
  // golden fly: rare, fast, worth chasing — catch by touching it
  if (!g.goldenFly && g.goldenFliesCaught < 2 && g.rng() < dt * 0.02 && g.wave >= 2) {
    g.goldenFly = { x: -20, y: 150 + g.rng() * (ARENA_H - 300), t: 0 };
  }
  if (g.goldenFly) {
    const fly = g.goldenFly;
    fly.t += dt;
    fly.x += 190 * dt;
    fly.y += Math.sin(fly.t * 3.2) * 90 * dt;
    if (fly.x > ARENA_W + 20) g.goldenFly = null;
    else for (const f of g.frogs) {
      if (f.state === 'alive' && dist(f.x, f.y, fly.x, fly.y) < 30) {
        g.goldenFliesCaught++;
        g.goldenFly = null;
        spawnParticles(fly.x, fly.y, 26, { color: '#ffd75e', speed: 160, maxLife: 0.8, glow: true });
        addHitstop(8);
        sfx('lotusReveal');
        for (let i = 0; i < 14; i++) {
          const o = oPool.get();
          o.x = fly.x; o.y = fly.y;
          const a = g.rng() * Math.PI * 2, s = 60 + g.rng() * 120;
          o.vx = Math.cos(a) * s; o.vy = Math.sin(a) * s;
          o.value = 3; o.alive = true; o.t = 0;
          g.orbs.push(o);
        }
        break;
      }
    }
  }
  // wild mushroom: linger by an empty root node WITHOUT building for 6s — the swamp rewards patience
  for (let i = 0; i < ROOT_NODES.length; i++) {
    if (g.towers.some(t => t.node === i)) { g.nodeIdleT[i] = 0; continue; }
    const nx = ROOT_NODES[i].x * ARENA_W, ny = ROOT_NODES[i].y * ARENA_H;
    const lingering = g.frogs.find(f => f.state === 'alive' && !f.buildChannel && dist(f.x, f.y, nx, ny) < 44);
    if (lingering) {
      g.nodeIdleT[i] += dt;
      if (g.nodeIdleT[i] >= 6) {
        g.nodeIdleT[i] = 0;
        g.towers.push({ kind: 'sporeshroom', node: i, tier: 1, owner: lingering.idx, x: nx, y: ny, hp: TOWERS.sporeshroom.hp, maxHp: TOWERS.sporeshroom.hp, fireCd: 0, hitFlash: 0, growAnim: 1 });
        g.runStats.towersGrown++;
        spawnParticles(nx, ny, 22, { color: '#c9a3d9', speed: 130, maxLife: 0.7, glow: true });
        sfx('grow');
      }
    } else g.nodeIdleT[i] = Math.max(0, g.nodeIdleT[i] - dt * 2);
  }
}

// ---------- build phase (untimed; ready-check = frogs sit on Heartbloom pad) ----------
export function updateBuild(g: Game, dt: number, inputs: import('./input').PlayerInput[]) {
  updateFrogs(g, dt, inputs, false);
  updateOrbs(g, dt);
  updateSecrets(g, dt);
  const alive = g.frogs.filter(f => f.state === 'alive');
  const allOnPad = alive.length > 0 && alive.every(f => dist(f.x, f.y, HEART.x, HEART.y) < HEART.r + 18);
  if (allOnPad) {
    g.buildReadyT += dt;
    if (g.buildReadyT > 1.0) startWave(g);
  } else g.buildReadyT = Math.max(0, g.buildReadyT - dt * 2);
}

function dist(ax: number, ay: number, bx: number, by: number) { return Math.hypot(bx - ax, by - ay); }
