// CROAKDOWN visible-page QA driver (house pattern: real inputs, visible window — never
// dispatchEvent, never hidden tabs). Reuses the running :5126 dev server.
// Usage: node scripts/shoot.mjs [--full]   (--full plays deeper into the run)

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'docs/qa';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

const state = () => page.evaluate(() => {
  const g = window.__game;
  return {
    phase: g.phase, paused: g.paused, wave: g.wave, essence: g.essence,
    enemies: g.enemies.length, towers: g.towers.length,
    frogs: g.frogs.map(f => ({ hp: Math.round(f.hp), state: f.state, level: f.level, x: Math.round(f.x), y: Math.round(f.y) })),
    heart: Math.round(g.heartHp), boss: g.bossRef ? { kind: g.bossRef.def.kind, hp: Math.round(g.bossRef.hp), phase: g.bossRef.phase } : null,
  };
});
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
const sleep = (ms) => page.waitForTimeout(ms);
const tap = async (key, ms = 350) => { await page.keyboard.press(key); await sleep(ms); };
const hold = async (key, ms) => { await page.keyboard.down(key); await sleep(ms); await page.keyboard.up(key); };

async function moveTo(tx, ty, maxMs = 4000) {
  // steer with real held keys toward a target point
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const s = await state();
    const f = s.frogs[0];
    if (!f) break;
    const dx = tx - f.x, dy = ty - f.y;
    if (Math.hypot(dx, dy) < 22) break;
    const keys = [];
    if (dx < -12) keys.push('KeyA'); if (dx > 12) keys.push('KeyD');
    if (dy < -12) keys.push('KeyW'); if (dy > 12) keys.push('KeyS');
    for (const k of keys) await page.keyboard.down(k);
    await sleep(120);
    for (const k of keys) await page.keyboard.up(k);
  }
}

async function waitPhase(phases, maxMs = 120000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const s = await state();
    if (phases.includes(s.phase)) return s;
    await sleep(500);
  }
  throw new Error(`timeout waiting for ${phases}; state=${JSON.stringify(await state())}`);
}

const log = (label, s) => console.log(label.padEnd(14), JSON.stringify(s));

await page.goto('http://localhost:5126');
await sleep(1500);
await shot('01-title');
log('title', await state());

await tap('Enter');            // title -> frogpick
await shot('02-frogpick');
await tap('Space', 450);       // confirm P1 frog -> P2 stage
await tap('Space', 450);       // skip P2 (solo) -> danger stage
await shot('03-danger');
await tap('Space', 600);       // confirm danger 0 -> run (build phase)
log('run start', await state());
await shot('04-build');

// pause + settings (VISUAL_BAR must-pass screens)
await tap('Escape', 450);
await shot('pause');
await tap('ArrowDown', 250);
await tap('Enter', 400);
await shot('settings');
await tap('Escape', 250);      // settings -> pause menu
await tap('Escape', 400);      // pause -> resume build
log('after pause', await state());

// grow a tower at the nearest node (diegetic channel: walk + hold E)
await moveTo(602, 568);
await hold('KeyE', 1600);
let s = await state();
log('after grow', s);
await shot('05-tower');

// sit on the Heartbloom pad to start wave 1
await moveTo(640, 480);
await moveTo(640, 430);
s = await waitPhase(['wave'], 8000).catch(async () => { await moveTo(640, 415); return waitPhase(['wave'], 6000); });
log('wave 1', s);
await sleep(4000);
await shot('06-wave1');

// survive wave 1: kite gently around the heart while auto-attack works
const t0 = Date.now();
while (Date.now() - t0 < 90000) {
  s = await state();
  if (s.phase !== 'wave') break;
  const f = s.frogs[0];
  const a = (Date.now() / 2400) % (Math.PI * 2);
  await moveTo(640 + Math.cos(a) * 150, 460 + Math.sin(a) * 110, 900);
}
s = await state();
log('wave 1 end', s);
await shot('07-postwave');

if (s.phase === 'levelup') {
  await tap('Digit1', 500);
  s = await state();
  while (s.phase === 'levelup') { await tap('Digit1', 400); s = await state(); }
  log('after picks', s);
}
if (s.phase === 'shop') {
  await shot('08-shop');
  await tap('Digit1', 400);     // buy first card if affordable
  await tap('KeyR', 400);       // reroll
  await shot('09-shop-after');
  await tap('Enter', 500);      // GO -> build
  s = await state();
  log('after shop', s);
}
await shot('10-build2');

if (process.argv.includes('--full')) {
  // play forward to the wave-8 mini-boss: loop sit-on-pad -> survive -> pick/shop
  for (let w = 2; w <= 8; w++) {
    await moveTo(640, 440); await moveTo(640, 415);
    s = await waitPhase(['wave'], 10000);
    console.log(`-- wave ${s.wave} start`);
    const tw = Date.now();
    while (Date.now() - tw < 120000) {
      s = await state();
      if (s.phase !== 'wave') break;
      const f = s.frogs[0];
      const a = (Date.now() / 2200) % (Math.PI * 2);
      await moveTo(640 + Math.cos(a) * 170, 460 + Math.sin(a) * 120, 900);
      if (s.boss) { await shot(`boss-w${s.wave}`); }
    }
    s = await state();
    log(`wave ${w} end`, s);
    if (s.phase === 'gameover') { await shot('gameover'); break; }
    while (s.phase === 'levelup') { await tap('Digit1', 400); s = await state(); }
    if (s.phase === 'ceremony') { await shot('ceremony'); await sleep(4500); s = await state(); }
    while (s.phase === 'levelup') { await tap('Digit1', 400); s = await state(); }
    if (s.phase === 'shop') { await tap('Digit1', 300); await tap('Enter', 500); s = await state(); }
    // SPEND: grow at empty nodes / attune owned towers until the wallet is thin
    const nodes = [[602, 568], [870, 488], [320, 496], [986, 352], [192, 360], [845, 192], [307, 208], [602, 112]];
    for (const [nx, ny] of nodes) {
      s = await state();
      if (s.phase !== 'build' || s.essence < 25) break;
      await moveTo(nx, ny, 3000);
      await hold('KeyE', 2000);
    }
  }
  await shot('11-full-end');
}

console.log('\nCONSOLE ERRORS:', errors.length ? errors : 'none');
log('final', await state());
await browser.close();
process.exit(errors.length ? 2 : 0);
