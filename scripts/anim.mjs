// CROAKDOWN animation filmstrip capture (ANIMATION MASTERPASS).
// Records dense frame bursts cropped tight around the frog/enemy across a walk
// cycle, a sword swing, and an enemy waddle, so motion reads frame-by-frame
// (slow-mo review) for blind animation judging. Reuses the running :5126.
// Usage: node scripts/anim.mjs  ->  docs/qa/anim-*.png
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const OUT = 'docs/qa';
mkdirSync(OUT, { recursive: true });
const VW = 1280, VH = 800;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
await page.goto('http://localhost:5126');
await page.waitForTimeout(500);
await page.mouse.click(VW / 2, VH / 2);
await page.waitForTimeout(800);

const frogScreen = () => page.evaluate(() => {
  const v = window.__view, f = window.__world.frog;
  const fx = f.px + (f.x - f.px) * 0.5, fy = f.py + (f.y - f.py) * 0.5;
  return { sx: fx * v.scale + v.ox, sy: fy * v.scale + v.oy };
});
const clampClip = (sx, sy, w, h, ox, oy) => {
  let x = Math.round(sx - ox), y = Math.round(sy - oy);
  x = Math.max(0, Math.min(VW - w, x)); y = Math.max(0, Math.min(VH - h, y));
  return { x, y, width: w, height: h };
};
const S = 340;
async function grabFrog(name, i) {
  const { sx, sy } = await frogScreen();
  const clip = clampClip(sx, sy, S, S, S / 2, S * 0.62);   // bias up: sprite rises from feet
  await page.screenshot({ path: `${OUT}/${name}-${String(i).padStart(2, '0')}.png`, clip });
}

// WALK: aim ahead, hold D, sample ~1.5 hop cycles at ~34ms
await page.mouse.move(VW * 0.85, VH * 0.5);
await page.keyboard.down('KeyD');
await page.waitForTimeout(180);
for (let i = 0; i < 16; i++) { await grabFrog('anim-walk', i); await page.waitForTimeout(34); }
await page.keyboard.up('KeyD');
await page.waitForTimeout(450);

// ATTACK: aim right, tap-swing, capture anticipation -> contact -> follow -> recovery
await page.mouse.move(VW * 0.92, VH * 0.5);
await page.waitForTimeout(90);
for (let i = 0; i < 14; i++) {
  if (i === 1) await page.mouse.down();
  if (i === 2) await page.mouse.up();
  await grabFrog('anim-atk', i);
  await page.waitForTimeout(28);
}
await page.waitForTimeout(300);

// ENEMY: clip around the nearest enemy as it waddles in
const enemyScreen = () => page.evaluate(() => {
  const v = window.__view, w = window.__world, f = w.frog;
  let nd = 1e9, n = null;
  for (const e of w.enemies) { const d = Math.hypot(e.x - f.x, e.y - f.y); if (d < nd && d > 70) { nd = d; n = e; } }
  if (!n) return null;
  const ex = n.px + (n.x - n.px) * 0.5, ey = n.py + (n.y - n.py) * 0.5;
  return { sx: ex * v.scale + v.ox, sy: ey * v.scale + v.oy };
});
for (let i = 0; i < 12; i++) {
  const e = await enemyScreen();
  if (e) { const clip = clampClip(e.sx, e.sy, 240, 240, 120, 130); await page.screenshot({ path: `${OUT}/anim-enemy-${String(i).padStart(2, '0')}.png`, clip }); }
  await page.waitForTimeout(40);
}
console.log('anim frames captured');
await browser.close();
