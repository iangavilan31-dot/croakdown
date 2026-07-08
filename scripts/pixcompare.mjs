// Candidate-generation probe for the pixel-density cohesion fix (QA-only).
// Sweeps the backdrop pixel factor live (window.__bpx) and captures the same
// representative pond state at each, so blind judges can pick the density that
// best unifies the pixel hero with the painted backdrop. Reuses the running :5126.
// Usage: node scripts/pixcompare.mjs  ->  docs/qa/pix-<f>.png
import { chromium } from 'playwright';
const VW = 1280, VH = 800;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
await page.goto('http://localhost:5126');
await page.waitForTimeout(400);
await page.mouse.click(VW / 2, VH / 2);   // start run
await page.waitForTimeout(700);
await page.mouse.move(VW * 0.62, VH * 0.42);
const FACTORS = [1, 2, 3, 4, 6];
for (const f of FACTORS) {
  await page.evaluate((v) => { window.__bpx = v; }, f);
  await page.waitForTimeout(220);
  await page.screenshot({ path: `docs/qa/pix-${f}.png` });
  console.log('captured px=', f);
}
await browser.close();
