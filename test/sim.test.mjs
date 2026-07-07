// CROAKDOWN headless tests — pure sim math (no canvas, no DOM). Run: npm test
// The Sprout lesson: wiring tests catch boot-crash bugs before the browser does.

import { strict as assert } from 'node:assert';

// sim.ts is TS — test the compiled logic by re-implementing? No: import via tsx-free trick —
// we run vite's esbuild transform through a tiny loader. Simplest robust path: node --import tsx
// is not installed; instead we test through the built bundle? Keep it dependency-free:
// duplicate-free approach — import the TS source via a naive strip of types is fragile.
// DECISION: test the formulas through a compiled snapshot generated at test time with esbuild
// (vite dependency already ships esbuild).
import { build } from 'vite';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

// bundle sim.ts + data.ts + game-free modules to a temp ESM file, then import it
const out = await build({
  root,
  logLevel: 'silent',
  build: {
    write: true,
    outDir: 'test/.build',
    emptyOutDir: true,
    lib: { entry: join(root, 'src/sim.ts'), formats: ['es'], fileName: 'sim' },
  },
});
const sim = await import(pathToFileURL(join(root, 'test/.build/sim.js')).href + `?t=${Date.now()}`);

let passed = 0, failed = 0;
function t(name, fn) {
  try { fn(); passed++; console.log(`  ok  ${name}`); }
  catch (e) { failed++; console.error(`FAIL  ${name}: ${e.message}`); }
}

console.log('sim.ts formulas');

t('wave durations: w1=25, ramp +5, cap 70 at w10, finale 100', () => {
  assert.equal(sim.waveDuration(1), 25);
  assert.equal(sim.waveDuration(2), 30);
  assert.equal(sim.waveDuration(9), 65);
  assert.equal(sim.waveDuration(10), 70);
  assert.equal(sim.waveDuration(19), 70);
  assert.equal(sim.waveDuration(20), 100);
});

t('reroll cost: brotato formula, resets per shop', () => {
  assert.equal(sim.rerollCost(4, 0), 3);   // floor(4*0.75)=3
  assert.equal(sim.rerollCost(4, 1), 4);   // +floor(0.4*4)=1
  assert.equal(sim.rerollCost(10, 0), 7);
  assert.equal(sim.rerollCost(10, 2), 15); // 7 + 4 + 4
  assert.equal(sim.rerollCost(1, 0), 1);   // min 1
});

t('drop rate decays 1.5%/wave to 0.5 floor', () => {
  assert.equal(sim.dropRate(1), 1);
  assert.ok(Math.abs(sim.dropRate(5) - 0.94) < 1e-9);
  assert.equal(sim.dropRate(40), 0.5);
});

t('tier gates at waves 2/4/8', () => {
  assert.equal(sim.maxTier(1), 1);
  assert.equal(sim.maxTier(2), 2);
  assert.equal(sim.maxTier(4), 3);
  assert.equal(sim.maxTier(8), 4);
});

t('hp scaling: linear per wave, danger steps, solo -27%', () => {
  const base = sim.scaleHp(10, 5, 1, 0, 2);       // 2P baseline wave 1
  assert.equal(base, 10);
  assert.equal(sim.scaleHp(10, 5, 3, 0, 2), 20);  // +2 waves * 5
  assert.equal(sim.scaleHp(10, 5, 1, 3, 2), 14);  // danger 3 = +40%
  assert.equal(sim.scaleHp(10, 5, 1, 0, 1), 7);   // solo = 73%
  // one frog down in co-op scales toward solo
  assert.equal(sim.scaleHp(10, 5, 1, 0, 2, 1), 7);
});

t('hitstop: small hits 2-6f, kills 6-12f, capped', () => {
  assert.ok(sim.hitstopFrames(3, false) >= 2 && sim.hitstopFrames(3, false) <= 6);
  assert.ok(sim.hitstopFrames(50, false) <= 6);
  assert.ok(sim.hitstopFrames(3, true) >= 6);
  assert.ok(sim.hitstopFrames(80, true) <= 12);
});

t('xp curve is monotonic and starts small', () => {
  assert.equal(sim.xpForLevel(1), 8);
  let prev = 0;
  for (let l = 1; l < 40; l++) {
    const v = sim.xpForLevel(l);
    assert.ok(v >= prev);
    prev = v;
  }
});

t('spatial hash finds neighbors, misses far entities', () => {
  const h = new sim.SpatialHash(80);
  const a = { x: 100, y: 100 }, b = { x: 130, y: 110 }, far = { x: 900, y: 900 };
  h.insert(a); h.insert(b); h.insert(far);
  const out = [];
  h.query(100, 100, 60, out);
  assert.ok(out.includes(a) && out.includes(b));
  assert.ok(!out.includes(far));
});

t('wave-end respawn: everyone returns at 50% if anyone lived', () => {
  const frogs = [
    { state: 'alive', hp: 30, maxHp: 60, reviveProgress: 0 },
    { state: 'downed', hp: 0, maxHp: 80, reviveProgress: 0.4 },
  ];
  sim.applyWaveEndRespawn(frogs);
  assert.equal(frogs[1].state, 'alive');
  assert.equal(frogs[1].hp, 40);
});

t('wave-end respawn: full wipe stays dead', () => {
  const frogs = [
    { state: 'downed', hp: 0, maxHp: 60, reviveProgress: 0 },
    { state: 'downed', hp: 0, maxHp: 80, reviveProgress: 0 },
  ];
  sim.applyWaveEndRespawn(frogs);
  assert.equal(frogs[0].state, 'downed');
});

t('run lost on heart death or all frogs down', () => {
  const alive = [{ state: 'alive', hp: 1, maxHp: 1, reviveProgress: 0 }];
  const down = [{ state: 'downed', hp: 0, maxHp: 1, reviveProgress: 0 }];
  assert.equal(sim.isRunLost(alive, 100), false);
  assert.equal(sim.isRunLost(alive, 0), true);
  assert.equal(sim.isRunLost(down, 100), true);
});

t('deterministic rng: same seed, same stream', () => {
  const a = sim.makeRng(42), b = sim.makeRng(42);
  for (let i = 0; i < 20; i++) assert.equal(a(), b());
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
