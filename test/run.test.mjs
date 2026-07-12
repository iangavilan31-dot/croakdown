// FULL-RUN completability proof — a duo bot (warden P1 + snapper P2) plays all
// 15 waves headless through the real sim: fights, buys, dives, revives (S4).
// Asserts: victory is reachable, no soft-locks (watchdog per wave), caps hold,
// the wallet never goes negative. Usage: node test/run.test.mjs
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
    lib: { entry: join(root, 'src/sim/index.ts'), formats: ['es'], fileName: () => 'sim.js' },
    outDir: join(here, '.build'),
    emptyOutDir: false,
    minify: false,
  },
});
const S = await import(pathToFileURL(join(here, '.build/sim.js')).href);

const w = S.createWorld(4242, 'warden', 'wave');
S.addPlayer2(w, 'snapper');

const blank = () => ({ mx: 0, my: 0, aimX: 0, aimY: 0, attackEdge: false, attackHeld: false, tongueEdge: false, dashEdge: false, sigEdge: false });

function botInput(w, f, tick) {
  const inp = blank();
  if (!f.alive || f.downed) return inp;
  // priority: revive a downed partner (S4)
  const partner = w.frogs.find((o) => o !== f);
  if (partner && partner.downed) {
    inp.mx = Math.sign(partner.x - f.x);
    inp.my = Math.sign(partner.y - f.y);
    if (Math.hypot(partner.x - f.x, partner.y - f.y) < 40) { inp.mx = 0; inp.my = 0; }
    // still swat anything on the pad
    inp.aimX = f.x + 100; inp.aimY = f.y;
    inp.attackEdge = tick % 14 === 0;
    return inp;
  }
  // nearest enemy
  let n = null, nd = 1e9;
  for (const e of w.enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(e.x - f.x, e.y - f.y);
    if (d < nd) { nd = d; n = e; }
  }
  if (!n) {
    // drift to center to collect drops
    inp.mx = Math.sign(w.frogs[0] === f ? 900 - f.x : 1000 - f.x) * 0.6;
    inp.my = Math.sign(540 - f.y) * 0.6;
    return inp;
  }
  inp.aimX = n.x; inp.aimY = n.y;
  if (nd > 130) { inp.mx = Math.sign(n.x - f.x); inp.my = Math.sign(n.y - f.y); }
  inp.attackEdge = tick % 11 === (f.index ? 5 : 0);
  // low hp: dash away from the pack
  if (f.hp < f.maxHp * 0.3 && tick % 40 === 0) {
    inp.mx = -Math.sign(n.x - f.x); inp.my = -Math.sign(n.y - f.y);
    inp.dashEdge = true;
  }
  if (tick % 300 === (f.index ? 150 : 0)) inp.sigEdge = true;       // signatures on rotation
  if (f.kit === 'snapper' && tick % 90 === 30) inp.tongueEdge = true;
  return inp;
}

const MAX_TICKS = 60 * 60 * 30;   // 30 sim-minutes watchdog for the whole run
let waveStartTick = 0;
let lastWave = 1;
let deaths = 0;
let endTick = MAX_TICKS;
const waveLog = [];

for (let tick = 0; tick < MAX_TICKS; tick++) {
  if (w.phase === 'victory') { endTick = tick; break; }
  if (w.phase === 'gameover') {
    deaths++;
    assert.fail(`RUN DIED on wave ${w.wave} (kills ${w.kills}) — waves must be completable by a competent duo`);
  }
  if (w.phase === 'shop') {
    // greedy shopping: buy anything affordable, then dive
    for (let s = 0; s < w.shop.slots.length; s++) S.buyItem(w, w.frogs[tick % 2], s);
    const dive = [blank(), blank()];
    dive[0].dashEdge = true; dive[1].dashEdge = true;
    S.tickWorld(w, dive);
    continue;
  }
  if (w.wave !== lastWave) {
    waveLog.push(`wave ${lastWave}: ${(((tick - waveStartTick) / 60) | 0)}s  hp[${w.frogs.map((f) => Math.round(f.hp)).join(',')}] coins ${w.coins}`);
    lastWave = w.wave;
    waveStartTick = tick;
  }
  assert.ok(w.enemies.length <= S.constants.ENEMY_CAP, 'ENEMY_CAP law holds');
  assert.ok(w.coins >= 0, 'wallet never negative');
  const inputs = w.frogs.map((f) => botInput(w, f, tick));
  S.tickWorld(w, inputs);
  S.drainEvents(w, () => {});
  // per-wave soft-lock watchdog: 4 sim-minutes on one wave = stuck
  assert.ok(tick - waveStartTick < 60 * 240, `soft-lock watchdog on wave ${w.wave}`);
}

waveLog.push(`wave ${lastWave}: ${((endTick - waveStartTick) / 60) | 0}s (final)`);
console.log(waveLog.join('\n'));
console.log(`phase=${w.phase} kills=${w.kills} coins=${w.coins} deaths=${deaths}`);
assert.equal(w.phase, 'victory', 'the duo reaches THE POND IS QUIET');
console.log('FULL RUN COMPLETABLE — victory reached');
