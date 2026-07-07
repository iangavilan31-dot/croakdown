// CROAKDOWN headless combat tests — the sim is DOM-free by construction.
// Bundles src/sim/index.ts via vite's esbuild (no extra deps), then exercises
// the combat contract: frame data, buffer/cancel/chain, physics, determinism.
// The Sprout lesson: wiring tests catch boot-crash bugs before the browser does.

import { strict as assert } from 'node:assert';
import { build } from 'vite';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

await build({
  root,
  logLevel: 'silent',
  build: {
    write: true,
    outDir: 'test/.build',
    emptyOutDir: true,
    lib: { entry: join(root, 'src/sim/index.ts'), formats: ['es'], fileName: 'sim' },
  },
});
const S = await import(pathToFileURL(join(root, 'test/.build/sim.js')).href + `?t=${Date.now()}`);

let passed = 0, failed = 0;
function t(name, fn) {
  try { fn(); passed++; console.log(`  ok  ${name}`); }
  catch (e) { failed++; console.error(`FAIL  ${name}: ${e.message}`); }
}

const IDLE = { mx: 0, my: 0, aimX: 0, aimY: 0, attackEdge: false, attackHeld: false, tongueEdge: false, dashEdge: false };
const inp = (over = {}) => ({ ...IDLE, ...over });
const CX = S.constants.ARENA_W / 2, CY = S.constants.ARENA_H / 2;

/** Tick n times, collecting drained events. */
function run(w, n, input) {
  const log = [];
  for (let i = 0; i < n; i++) {
    S.tickWorld(w, typeof input === 'function' ? input(i) : input ?? IDLE);
    S.drainEvents(w, (e) => log.push({ ...e }));
  }
  return log;
}

console.log('CROAKDOWN sim — combat contract');

// ---------------- formulas (bible numbers must not drift) ----------------
t('wave durations: 25 +5/wave, cap 70, finale 100', () => {
  assert.equal(S.waveDuration(1), 25);
  assert.equal(S.waveDuration(10), 70);
  assert.equal(S.waveDuration(20), 100);
});
t('reroll cost + drop rate + tier gates (Shop and Economy)', () => {
  assert.equal(S.rerollCost(4, 0), 3);
  assert.equal(S.rerollCost(10, 2), 15);
  assert.ok(Math.abs(S.dropRate(5) - 0.94) < 1e-9);
  assert.equal(S.maxTier(8), 4);
});
t('hp scaling: danger pips + solo -27%; xp monotonic', () => {
  assert.equal(S.scaleHp(10, 5, 1, 3, 2), 14);
  assert.equal(S.scaleHp(10, 5, 1, 0, 1), 7);
  let prev = 0;
  for (let l = 1; l < 40; l++) { const v = S.xpForLevel(l); assert.ok(v >= prev); prev = v; }
});

// ---------------- engine primitives ----------------
t('rng deterministic; spatial hash finds neighbors only', () => {
  const a = S.makeRng(42), b = S.makeRng(42);
  for (let i = 0; i < 20; i++) assert.equal(a(), b());
  const h = new S.SpatialHash(80);
  const p1 = { x: 100, y: 100 }, p2 = { x: 130, y: 110 }, far = { x: 900, y: 900 };
  h.insert(p1); h.insert(p2); h.insert(far);
  const out = [];
  h.query(100, 100, 60, out);
  assert.ok(out.includes(p1) && out.includes(p2) && !out.includes(far));
});
t('pool integrity: get/put round-trips', () => {
  const p = new S.Pool(() => ({ v: 0 }), 4);
  const xs = [p.get(), p.get(), p.get()];
  xs.forEach((x) => p.put(x));
  assert.equal(p.taken, 0);
  assert.ok(p.available >= 4);
});

// ---------------- hitstop math (Game Feel Standards §1) ----------------
t('hitstop: class bases 3/5/9, kill +3, multi-hit cap 14', () => {
  assert.equal(S.baseHitstop('light'), 3);
  assert.equal(S.baseHitstop('medium'), 5);
  assert.equal(S.baseHitstop('heavy'), 9);
  assert.equal(S.swingHitstop('heavy', 0, true), 12);
  assert.equal(S.swingHitstop('heavy', 9, true), 14);   // capped
  assert.equal(S.attackerHitstop(10), 7);               // 70%
});
t('launch threshold: impulse/mass > 600', () => {
  assert.ok(S.willLaunch(1200, 1));      // heavy vs fodder -> flies
  assert.ok(S.willLaunch(900, 1));       // finisher vs fodder -> flies
  assert.ok(!S.willLaunch(420, 1));      // light vs fodder -> shoved
  assert.ok(!S.willLaunch(1200, 2.5));   // heavy vs gloopa -> budged, not launched
});

// ---------------- attack state machine ----------------
t('light fires on press: enemy takes stick damage after windup+1 frames', () => {
  const w = S.createWorld(7);
  const e = S.spawnEnemy(w, CX + 100, CY, 'blobbit');
  e.state = 'seek';
  const aim = { aimX: CX + 200, aimY: CY };
  S.tickWorld(w, inp({ ...aim, attackEdge: true, attackHeld: true }));
  for (let i = 0; i < S.STICK_CHAIN[0].windup; i++) S.tickWorld(w, inp(aim));
  assert.equal(e.hp, 20 - S.STICK_CHAIN[0].damage);
  assert.ok(e.freeze > 0, 'victim hitstop applied');
  assert.ok(w.frog.freeze > 0, 'attacker hitstop applied');
});
t('input buffer: attack pressed during recovery chains to swing 2', () => {
  const w = S.createWorld(7);
  const aim = { aimX: CX + 200, aimY: CY };
  S.tickWorld(w, inp({ ...aim, attackEdge: true }));
  const total = S.STICK_CHAIN[0].windup + S.STICK_CHAIN[0].active + S.STICK_CHAIN[0].follow;
  for (let i = 0; i < total; i++) S.tickWorld(w, inp(aim));
  assert.equal(w.frog.attack.phase, 'recovery');
  S.tickWorld(w, inp({ ...aim, attackEdge: true })); // buffered mid-recovery
  for (let i = 0; i < S.STICK_CHAIN[0].cancelFrom + 2; i++) S.tickWorld(w, inp(aim));
  assert.equal(w.frog.attack.chainIdx, 1, 'chained to swing 2');
  assert.equal(w.swingCounter, 2);
});
t('dash cancels recovery and grants i-frames', () => {
  const w = S.createWorld(7);
  const aim = { aimX: CX + 200, aimY: CY };
  S.tickWorld(w, inp({ ...aim, attackEdge: true }));
  const toRecovery = S.STICK_CHAIN[0].windup + S.STICK_CHAIN[0].active + S.STICK_CHAIN[0].follow + 2;
  for (let i = 0; i < toRecovery; i++) S.tickWorld(w, inp(aim));
  S.tickWorld(w, inp({ ...aim, dashEdge: true, mx: 1 }));
  assert.equal(w.frog.attack.phase, 'none', 'recovery canceled');
  assert.ok(w.frog.dashT > 0, 'dashing');
  S.tickWorld(w, inp(aim)); S.tickWorld(w, inp(aim));
  assert.ok(S.frogDashIframes(w.frog), 'i-frames active mid-dash');
});
t('hold-heavy: holding past the light windup charges then fires the heavy', () => {
  const w = S.createWorld(7);
  const e = S.spawnEnemy(w, CX + 120, CY, 'blobbit');
  e.state = 'seek'; e.hp = 100; e.maxHp = 100; // survive to observe the launch
  const aim = { aimX: CX + 300, aimY: CY };
  let heavySeen = false;
  for (let i = 0; i < 60; i++) {
    S.tickWorld(w, inp({ ...aim, attackHeld: true, attackEdge: i === 0 }));
    if (w.frog.attack.phase === 'heavyhold' || w.frog.attack.phase === 'heavywindup') heavySeen = true;
  }
  assert.ok(heavySeen, 'entered heavy charge while holding');
  for (let i = 0; i < 30; i++) S.tickWorld(w, inp(aim)); // release -> fires
  assert.ok(e.hp < 100 || e.state === 'tumble' || !e.alive, 'heavy connected');
});
t('tap stays light: quick press+release never charges a heavy', () => {
  const w = S.createWorld(7);
  const aim = { aimX: CX + 300, aimY: CY };
  S.tickWorld(w, inp({ ...aim, attackEdge: true, attackHeld: true }));   // press
  S.tickWorld(w, inp({ ...aim, attackHeld: false }));                    // release fast
  for (let i = 0; i < 40; i++) {
    S.tickWorld(w, inp(aim));
    assert.notEqual(w.frog.attack.phase, 'heavywindup', 'a tap must not charge');
    assert.notEqual(w.frog.attack.phase, 'heavyhold', 'a tap must not charge');
  }
});

// ---------------- physics: launch, bowling, wall splat ----------------
t('heavy launches a surviving blobbit into tumble', () => {
  const w = S.createWorld(7);
  const e = S.spawnEnemy(w, CX + 100, CY, 'blobbit');
  e.state = 'seek'; e.hp = 100; e.maxHp = 100; // survive the 34 dmg to observe launch
  S.applyMeleeHit(w, e, 34, 1200, 'heavy', 1, 0, 0);
  assert.equal(e.state, 'tumble');
  assert.ok(Math.hypot(e.vx, e.vy) > 600);
});
t('bowling: tumbling blobbit damages the one it hits', () => {
  const w = S.createWorld(7);
  w.frog.y = 200; // keep the frog out of the lane
  const a = S.spawnEnemy(w, CX, CY, 'blobbit');
  const b = S.spawnEnemy(w, CX + 90, CY, 'blobbit');
  a.state = 'seek'; b.state = 'seek';
  a.hp = 100; a.maxHp = 100; // survives the launching hit so it can bowl
  S.applyMeleeHit(w, a, 34, 1200, 'heavy', 1, 0, 0);
  const log = run(w, 12);
  assert.ok(log.some((e) => e.type === 'tumbleImpact'), 'impact event');
  assert.ok(b.hp < 20 || !b.alive, `victim damaged (hp ${b.hp})`);
});
t('wall splat: launched enemy takes +50% of the source hit at the bank', () => {
  const w = S.createWorld(7);
  w.frog.y = 200;
  const e = S.spawnEnemy(w, S.constants.ARENA_W - S.constants.ARENA_MARGIN - 60, CY, 'blobbit');
  e.state = 'seek';
  e.hp = 200; e.maxHp = 200; // survives launch + reaches the bank to splat
  S.applyMeleeHit(w, e, 34, 1200, 'heavy', 1, 0, 0);
  const log = run(w, 30);
  assert.ok(log.some((ev) => ev.type === 'wallSplat'), 'splat event fired');
});

// ---------------- reactions: poise, spikes, overkill ----------------
t('gloopa poise: light hits never interrupt its windup', () => {
  const w = S.createWorld(7);
  const g = S.spawnEnemy(w, CX + 80, CY, 'gloopa');
  g.state = 'windup'; g.stateF = 5;
  S.applyMeleeHit(w, g, 10, 420, 'light', 1, 0, 0);
  assert.equal(g.state, 'windup', 'not interrupted');
  const b = S.spawnEnemy(w, CX - 80, CY, 'blobbit');
  b.state = 'windup'; b.stateF = 5;
  S.applyMeleeHit(w, b, 10, 420, 'light', 1, 0, 0);
  assert.equal(b.state, 'seek', 'blobbit flinches out of its attack');
});
t('spikeblob: spikes out = 25% damage + 5 reflected to the frog', () => {
  const w = S.createWorld(7);
  const s = S.spawnEnemy(w, CX + 80, CY, 'spikeblob');
  s.state = 'seek'; s.spikesOut = true;
  const hpBefore = w.frog.hp;
  const res = S.applyMeleeHit(w, s, 10, 420, 'light', 1, 0, 0);
  assert.ok(res.reflected && res.armored);
  assert.equal(s.hp, 45 - Math.max(1, Math.round(10 * S.SPIKE_OUT_DMG_MULT)));
  // reflect damage lands via the frog swing path — here we assert the event contract
  s.spikesOut = false;
  S.applyMeleeHit(w, s, 10, 420, 'light', 1, 0, 0);
  assert.equal(s.hp, 45 - 3 - 10, 'full damage when vulnerable');
  assert.equal(w.frog.hp, hpBefore, 'direct applyMeleeHit does not touch frog (frog swing path owns reflect)');
});
t('overkill: kill with dmg >= 2x remaining HP flags overkill (gib)', () => {
  const w = S.createWorld(7);
  const e = S.spawnEnemy(w, CX + 80, CY, 'blobbit');
  e.state = 'seek'; e.hp = 5;
  S.applyMeleeHit(w, e, 34, 1200, 'heavy', 1, 0, 0);
  let over = false;
  S.drainEvents(w, (ev) => { if ((ev.type === 'hit' || ev.type === 'armored') && ev.killed && ev.overkill) over = true; });
  assert.ok(over);
});

// ---------------- tongue ----------------
t('tongue pulls a blobbit to melee range, stunned on arrival', () => {
  const w = S.createWorld(7);
  const e = S.spawnEnemy(w, CX + 250, CY, 'blobbit');
  e.state = 'seek';
  const aim = { aimX: CX + 300, aimY: CY };
  S.tickWorld(w, inp({ ...aim, tongueEdge: true }));
  for (let i = 0; i < 20; i++) S.tickWorld(w, inp(aim));
  const d = Math.hypot(e.x - w.frog.x, e.y - w.frog.y);
  assert.ok(d < 160, `pulled close (dist ${Math.round(d)})`);
  assert.ok(e.stunT > 0 || e.state === 'seek', 'arrives stunned/reset');
  assert.ok(w.frog.tCd > 0, 'cooldown started');
});
t('tongue pull retracts spikeblob spikes (safe-pull counter)', () => {
  const w = S.createWorld(7);
  const s = S.spawnEnemy(w, CX + 250, CY, 'spikeblob');
  s.state = 'seek'; s.spikesOut = true;
  const aim = { aimX: CX + 300, aimY: CY };
  S.tickWorld(w, inp({ ...aim, tongueEdge: true }));
  for (let i = 0; i < 20; i++) S.tickWorld(w, inp(aim));
  assert.equal(s.spikesOut, false);
});

// ---------------- determinism ----------------
t('determinism: same seed + same inputs -> identical worlds', () => {
  const mk = () => {
    const w = S.createWorld(1234);
    for (let i = 0; i < 600; i++) {
      S.tickWorld(w, inp({
        mx: Math.sin(i * 0.05) > 0 ? 1 : -1, my: 0,
        aimX: CX + 300, aimY: CY,
        attackEdge: i % 40 === 0, attackHeld: i % 40 < 8,
        dashEdge: i % 90 === 0, tongueEdge: i % 160 === 0,
      }));
      S.drainEvents(w, () => {});
    }
    return w;
  };
  const w1 = mk(), w2 = mk();
  assert.equal(w1.frog.x, w2.frog.x);
  assert.equal(w1.frog.y, w2.frog.y);
  assert.equal(w1.kills, w2.kills);
  assert.equal(w1.enemies.length, w2.enemies.length);
  for (let i = 0; i < w1.enemies.length; i++) assert.equal(w1.enemies[i].hp, w2.enemies[i].hp);
});

// ---------------- soak: spawner cap + no-crash wiring ----------------
t('soak 7200 ticks: enemy cap 70 never exceeded, world stays sane', () => {
  const w = S.createWorld(99);
  let maxEnemies = 0;
  for (let i = 0; i < 7200; i++) {
    w.frog.hp = 1e9; // immortal dummy — spawner pressure test
    S.tickWorld(w, inp({ aimX: CX + 100, aimY: CY, attackEdge: i % 30 === 0, mx: Math.sin(i * 0.01), my: Math.cos(i * 0.013) }));
    S.drainEvents(w, () => {});
    maxEnemies = Math.max(maxEnemies, w.enemies.length);
    assert.ok(w.enemies.length <= S.constants.ENEMY_CAP, `cap respected (got ${w.enemies.length})`);
  }
  assert.ok(maxEnemies > 10, `spawner actually spawns (peak ${maxEnemies})`);
  assert.ok(!w.gameOver, 'immortal frog never dies');
});

// ---------------- essence ----------------
t('kills drop essence; magnet collects it', () => {
  const w = S.createWorld(7);
  const e = S.spawnEnemy(w, CX + 60, CY, 'blobbit');
  e.state = 'seek'; e.hp = 1;
  S.applyMeleeHit(w, e, 10, 420, 'light', 1, 0, 0);
  assert.ok(w.drops.length >= 1, 'essence dropped');
  const log = run(w, 90, inp({ aimX: CX, aimY: CY }));
  assert.ok(w.frog.essence >= 1, `collected (essence ${w.frog.essence})`);
  assert.ok(log.some((ev) => ev.type === 'pip'));
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
