// CROAKDOWN visible-page QA driver — melee prototype (Phase 1).
// House pattern: real inputs on a VISIBLE window (never dispatchEvent, never hidden
// tabs — canvas rAF freezes when hidden). Reuses the running :5126 dev server.
// Drives the frog, aims the mouse at real enemies, swings/dashes/tongues, and
// captures the pond alive with combat + accumulating permanence.
// Usage: node scripts/shoot.mjs

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'docs/qa';
mkdirSync(OUT, { recursive: true });

// headless = never opens/steals a window (Ian: don't hijack the screen). Chromium headless
// still runs rAF + renders canvas 2D, so screenshots are valid (unlike a backgrounded tab).
const VW = 1280, VH = 800;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: VW, height: VH } });

// Real JS errors fail the gate. Benign 404s (drop-in BGM not generated yet, the CDN
// font offline in headless) are expected in the prototype — tracked, not blocking.
const errors = [];
const benign = [];
const isBenign = (t) => /Failed to load resource|net::ERR|404|fonts\.googleapis|\.mp3|\.wav/i.test(t);
page.on('console', (m) => { if (m.type() === 'error') (isBenign(m.text()) ? benign : errors).push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
const sleep = (ms) => page.waitForTimeout(ms);

// world<->screen mapping — read the LIVE follow-camera transform the game publishes on
// window.__view (zoom + frog-follow + clamp), so mouse-aim lands on the real on-screen enemy.
// Falls back to the old letterbox fit if the game hasn't drawn a frame yet.
const ARENA_W = 1920, ARENA_H = 1080;
async function toScreen(wx, wy) {
  const v = await page.evaluate(() => window.__view ?? null);
  if (v) return [wx * v.scale + v.ox, wy * v.scale + v.oy];
  const scale = Math.min(VW / ARENA_W, VH / ARENA_H);
  return [wx * scale + (VW - ARENA_W * scale) / 2, wy * scale + (VH - ARENA_H * scale) / 2];
}

const state = () => page.evaluate(() => {
  const w = window.__world;
  const f = w.frog;
  let nearest = null, nd = 1e9;
  for (const e of w.enemies) {
    const d = Math.hypot(e.x - f.x, e.y - f.y);
    if (d < nd) { nd = d; nearest = { x: e.x, y: e.y, kind: e.kind, state: e.state }; }
  }
  return {
    tick: w.tick, elapsed: Math.round(w.elapsed), kills: w.kills, gameOver: w.gameOver,
    enemies: w.enemies.length, drops: w.drops.length,
    frog: { x: Math.round(f.x), y: Math.round(f.y), hp: Math.round(f.hp), essence: f.essence, phase: f.attack.phase, dash: f.dashCharges },
    nearest, nd: Math.round(nd),
  };
});

async function moveToward(tx, ty, ms) {
  const s = await state();
  const f = s.frog;
  const keys = [];
  if (tx < f.x - 20) keys.push('KeyA'); else if (tx > f.x + 20) keys.push('KeyD');
  if (ty < f.y - 20) keys.push('KeyW'); else if (ty > f.y + 20) keys.push('KeyS');
  for (const k of keys) await page.keyboard.down(k);
  await sleep(ms);
  for (const k of keys) await page.keyboard.up(k);
}

const log = (label, s) => console.log(label.padEnd(16), JSON.stringify(s));

await page.goto('http://localhost:5126');
await sleep(400);            // let the first enemies spawn in
// wake audio + focus
await page.mouse.move(VW / 2, VH / 2);
await page.mouse.click(VW / 2, VH / 2);
await sleep(1200);
await shot('phase1-01-pond');
log('pond', await state());

// --- combat loop: aim at the nearest enemy, tap-swing, weave dashes/tongue/heavy ---
const start = Date.now();
let step = 0;
let shotSwarm = false, shotHeavy = false;
while (Date.now() - start < 26000) {
  const s = await state();
  if (s.gameOver) { log('DIED', s); break; }
  step++;

  // aim at nearest enemy (or drift right if none)
  const target = s.nearest ?? { x: s.frog.x + 200, y: s.frog.y };
  const [sx, sy] = await toScreen(target.x, target.y);
  await page.mouse.move(sx, sy);

  // close distance if far, else stand and swing
  if (s.nd > 150) {
    await moveToward(target.x, target.y, 160);
  } else {
    // in range — swing. every ~5th action, charge a heavy; sprinkle tongue + dash
    if (step % 7 === 0) {
      // heavy: hold the button
      await page.mouse.down();
      await sleep(360);
      await page.mouse.up();
      if (!shotHeavy) { await shot('phase1-03-heavy'); shotHeavy = true; }
    } else {
      await page.mouse.click(VW / 2, VH / 2, { position: undefined }); // click registers; aim already set
      await page.mouse.down(); await sleep(40); await page.mouse.up();
    }
    if (step % 4 === 0) await page.keyboard.press('KeyK');   // tongue
    if (step % 9 === 0) await page.keyboard.press('Space');  // dash
    await sleep(90);
  }

  // capsule shot: catch the frog MID-SWING right next to enemies (combat verb must read)
  if (!shotSwarm && s.nd < 120 && (s.frog.phase === 'active' || s.frog.phase === 'follow')) {
    await shot('phase1-02-swing'); shotSwarm = true;
  }
  if (step % 12 === 0) log(`t+${s.elapsed}s`, { enemies: s.enemies, kills: s.kills, hp: s.frog.hp, ess: s.frog.essence });
}

await sleep(500);
await shot('phase1-04-carnage');
const final = await state();
log('final', final);

// perf snapshot with the ?perf overlay
await page.goto('http://localhost:5126/?perf');
await page.mouse.click(VW / 2, VH / 2);
await sleep(6000);
// drive a bit so the swarm builds for the perf read
for (let i = 0; i < 20; i++) { await moveToward(ARENA_W / 2 + Math.cos(i) * 300, ARENA_H / 2 + Math.sin(i) * 200, 120); await page.mouse.down(); await sleep(40); await page.mouse.up(); }
await shot('phase1-05-perf');

console.log('\nREAL ERRORS:', errors.length ? errors : 'none');
console.log('BENIGN 404s (tracked):', benign.length);
await browser.close();
process.exit(errors.length ? 2 : 0);
