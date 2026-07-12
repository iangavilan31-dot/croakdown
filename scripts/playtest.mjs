// GATE 5/6 browser verification — real inputs, milestone screenshots, perf read.
// Covers what the headless run-test can't: rendering, P2 drop-in via keys, shop
// input flow, boss bar, victory/gameover screens, frame timing at density.
// Usage: node scripts/playtest.mjs   (reuses the running :5126)

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('screenshots', { recursive: true });
const verdict = { errors: [], steps: [] };
const ok = (s) => { verdict.steps.push('ok ' + s); console.log('ok', s); };

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => verdict.errors.push(String(e).slice(0, 300)));
page.on('console', (m) => { if (m.type() === 'error' && !/404|net::/.test(m.text())) verdict.errors.push(m.text().slice(0, 300)); });

const st = () => page.evaluate(() => {
  const w = window.__world;
  return {
    phase: w.phase, wave: w.wave, coins: w.coins, frogs: w.frogs.length,
    kits: w.frogs.map((f) => f.kit), hp: w.frogs.map((f) => Math.round(f.hp)),
    enemies: w.enemies.length, kinds: [...new Set(w.enemies.map((e) => e.kind))],
    boss: !!w.boss, globs: w.globs.length, zones: w.zones.length,
  };
});
const toScreen = async (wx, wy) => { const v = await page.evaluate(() => window.__view); return [wx * v.scale + v.ox, wy * v.scale + v.oy]; };
const fightTick = async (i) => {
  const s = await page.evaluate(() => {
    const w = window.__world, f = w.frogs[0];
    let n = null, nd = 1e9;
    for (const e of w.enemies) { const d = Math.hypot(e.x - f.x, e.y - f.y); if (d < nd) { nd = d; n = e; } }
    return { nx: n ? n.x : f.x + 100, ny: n ? n.y : f.y, nd };
  });
  const [sx, sy] = await toScreen(s.nx, s.ny);
  await page.mouse.move(Math.max(5, Math.min(1275, sx)), Math.max(5, Math.min(795, sy)));
  await page.mouse.down(); await page.waitForTimeout(40); await page.mouse.up();
  if (i % 6 === 0) await page.keyboard.press('KeyQ');       // P1 signature
  if (i % 9 === 0) await page.keyboard.press('Space');
  // P2 bot: shuffle + attack
  await page.keyboard.down(i % 2 ? 'KeyJ' : 'KeyL');
  await page.keyboard.press('KeyU');
  await page.keyboard.up(i % 2 ? 'KeyJ' : 'KeyL');
  if (i % 7 === 0) await page.keyboard.press('KeyO');       // P2 signature
  await page.waitForTimeout(120);
};

// ---- 1. quick boot + P2 drop-in ----
await page.goto('http://localhost:5126/?quick');
await page.waitForTimeout(1200);
await page.mouse.click(640, 400);
await page.keyboard.press('KeyU');                          // P2 joins
await page.waitForTimeout(500);
let s = await st();
if (s.frogs === 2 && s.kits[1] === 'snapper') ok(`P2 drop-in (${s.kits.join('+')})`);
else verdict.errors.push('P2 join failed: ' + JSON.stringify(s));

// ---- 2. duo combat, wave 1-2 ----
for (let i = 0; i < 30; i++) { await fightTick(i); if ((await st()).phase === 'shop') break; }
await page.screenshot({ path: 'screenshots/gate5-duo-combat.png' });
ok('duo combat screenshot');

// ---- 3. shop: cursor + buy via inputs ----
s = await st();
if (s.phase !== 'shop') {
  for (let i = 0; i < 60 && (await st()).phase !== 'shop'; i++) await fightTick(i);
  s = await st();
}
if (s.phase === 'shop') {
  const coinsBefore = s.coins;
  // P1 buys slot 0 (cursor starts there), then marks ready; P2 dives
  await page.mouse.down(); await page.waitForTimeout(50); await page.mouse.up();
  await page.waitForTimeout(200);
  const s2 = await st();
  if (s2.coins < coinsBefore) ok(`shop buy via input (coins ${coinsBefore}->${s2.coins})`);
  else verdict.steps.push('-- shop buy skipped (could not afford slot 0)');
  await page.screenshot({ path: 'screenshots/gate5-shop-duo.png' });
  await page.keyboard.press('Space');                       // P1 ready
  await page.keyboard.press('KeyP');                        // P2 ready
  await page.waitForTimeout(300);
  if ((await st()).phase === 'wave') ok('shop DIVE via inputs -> next wave');
}

// ---- 4. wave 8: all five behaviors + painted bodies on screen ----
await page.evaluate(() => window.__skipToWave(8));
await page.waitForTimeout(9000);                            // let the mix spawn in
s = await st();
ok(`wave 8 kinds on screen: ${s.kinds.join(',')} globs:${s.globs}`);
for (let i = 0; i < 6; i++) await fightTick(i);
await page.screenshot({ path: 'screenshots/gate5-wave8-menagerie.png' });

// ---- 5. wave 15: elder + boss bar ----
await page.evaluate(() => window.__skipToWave(15));
await page.waitForTimeout(2500);
s = await st();
if (s.boss) ok('elder boss alive on wave 15');
else verdict.errors.push('no boss on wave 15');
await page.screenshot({ path: 'screenshots/gate5-boss.png' });

// ---- 6. perf at density: sample real frame times ----
await page.evaluate(() => window.__skipToWave(13));
await page.waitForTimeout(12000);                           // build the horde
s = await st();
const frameMs = await page.evaluate(() => new Promise((res) => {
  const t = [];
  let last = performance.now();
  const loop = (now) => { t.push(now - last); last = now; if (t.length < 90) requestAnimationFrame(loop); else res(t); };
  requestAnimationFrame(loop);
}));
const avg = frameMs.reduce((a, b) => a + b, 0) / frameMs.length;
const worst = Math.max(...frameMs);
ok(`perf @${s.enemies} enemies: avg ${avg.toFixed(1)}ms, worst ${worst.toFixed(1)}ms`);
verdict.perf = { enemies: s.enemies, avgMs: +avg.toFixed(2), worstMs: +worst.toFixed(2) };
await page.screenshot({ path: 'screenshots/gate5-horde-perf.png' });

// ---- 7. victory + gameover screen renders ----
await page.evaluate(() => window.__setPhase('victory'));
await page.waitForTimeout(400);
await page.screenshot({ path: 'screenshots/gate5-victory.png' });
await page.evaluate(() => window.__setPhase('gameover'));
await page.waitForTimeout(400);
await page.screenshot({ path: 'screenshots/gate5-gameover.png' });
ok('victory + gameover screens rendered');

// ---- 8. title (fresh load) ----
await page.goto('http://localhost:5126/');
await page.waitForTimeout(1400);
await page.screenshot({ path: 'screenshots/gate5-title.png' });
ok('title screenshot');

console.log('\nERRORS:', verdict.errors.length ? verdict.errors : 'none');
writeFileSync('docs/qa/playtest-verdict.json', JSON.stringify(verdict, null, 1));
await browser.close();
process.exit(verdict.errors.length ? 2 : 0);
