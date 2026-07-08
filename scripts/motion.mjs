// CROAKDOWN motion-capture probe — verify procedural animation READS in motion.
// Walks the frog in a straight line and grabs a rapid burst of frames across one
// hop cycle, and captures enemies mid-waddle. Headless (never hijacks the screen).
// Usage: node scripts/motion.mjs  ->  docs/qa/motion-*.png

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'docs/qa';
mkdirSync(OUT, { recursive: true });

const VW = 1280, VH = 800;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
page.on('pageerror', (e) => console.log('PAGEERROR', String(e)));

const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const sleep = (ms) => page.waitForTimeout(ms);

await page.goto('http://localhost:5126');
await sleep(300);
await page.mouse.click(VW / 2, VH / 2);
await sleep(600);

// aim right so the frog faces forward-right while walking, then hold D to walk.
await page.mouse.move(VW * 0.9, VH * 0.5);
await page.keyboard.down('KeyD');
await sleep(260);                    // let it get up to speed / into a hop cycle
// burst: 5 frames ~70ms apart spans roughly one hop arc (hopPhase cycles ~2-3Hz)
for (let i = 0; i < 6; i++) { await shot(`motion-walk-${i}`); await sleep(70); }
await page.keyboard.up('KeyD');

// hop-height + squash readout straight from the render inputs (proves it's animating)
const series = [];
await page.keyboard.down('KeyD');
for (let i = 0; i < 14; i++) {
  const s = await page.evaluate(() => {
    const f = window.__world.frog;
    return { hopPhase: +f.hopPhase.toFixed(3), vx: Math.round(f.vx), vy: Math.round(f.vy),
             speed: Math.round(Math.hypot(f.vx, f.vy)) };
  });
  series.push(s); await sleep(30);
}
await page.keyboard.up('KeyD');
console.log('WALK SERIES (hopPhase should sweep, speed>20 => hopArc animates):');
for (const s of series) console.log(JSON.stringify(s));

// enemies mid-waddle: stand still a beat so they close in seeking
await sleep(700);
await shot('motion-enemies');

await browser.close();
