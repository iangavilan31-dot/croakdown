// Gate-1 filmstrip capture — exact 60Hz frames via the spike's ?step mode.
// Produces: proof/hop-NN.png, proof/swing-NN.png, proof/heavy-NN.png + metrics.json.
// Usage: node spikes/swingtest/capture.mjs   (reuses the running :5126)

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'spikes/swingtest/proof';
mkdirSync(OUT, { recursive: true });

const VW = 1100, VH = 700;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://localhost:5126/spikes/swingtest/?step');
await page.waitForTimeout(600);

const step = (n, patch = {}) => page.evaluate(([n, p]) => window.__step(n, p), [n, patch]);
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });

// frog is at arena center; camera centers it. Aim right at the first dummy.
const AIM = { aimX: 1180, aimY: 540 };   // dummy #1 sits at frog.x+220
const metrics = { hop: [], swing: [], heavy: [], notes: [] };

// ---- settle: a few idle ticks so springs relax ----
await step(30, AIM);

// ---- HOP: hold D (mx=1) for 40 ticks, one frame every 2 ticks ----
for (let i = 0; i < 20; i++) {
  const s = await step(2, { mx: 1, ...AIM });
  metrics.hop.push(s);
  await shot(`hop-${String(i).padStart(2, '0')}`);
}
await step(30, AIM); // settle

// ---- LIGHT SWING at a dummy: tap, then run every tick ~30 frames ----
let s = await step(1, { attackEdge: true, attackHeld: true, ...AIM });
metrics.swing.push(s);
await shot('swing-00');
for (let i = 1; i < 30; i++) {
  s = await step(1, AIM);           // held released after tick 1 => light commits
  metrics.swing.push(s);
  await shot(`swing-${String(i).padStart(2, '0')}`);
}
await step(40, AIM);

// ---- HEAVY: press and HOLD 26 ticks (past windup->heavyhold), release, capture ----
await step(1, { attackEdge: true, attackHeld: true, ...AIM });
for (let i = 0; i < 12; i++) {
  s = await step(2, { attackHeld: true, ...AIM });
  metrics.heavy.push(s);
  await shot(`heavy-hold-${String(i).padStart(2, '0')}`);
}
for (let i = 0; i < 24; i++) {
  s = await step(1, AIM);           // released -> the heavy fires
  metrics.heavy.push(s);
  await shot(`heavy-${String(i).padStart(2, '0')}`);
}

// ---- numeric gate checks ----
const freezes = metrics.swing.filter((m) => m.freeze > 0).length;
const enemyKicked = metrics.swing.some((m) => m.enemies.some((e) => Math.hypot(e.vx, e.vy) > 300));
const enemyFroze = metrics.swing.some((m) => m.enemies.some((e) => e.freeze > 0));
const phases = [...new Set(metrics.swing.map((m) => m.phase))];
metrics.notes.push(`attacker hitstop frames observed: ${freezes}`);
metrics.notes.push(`enemy knockback >300px/s: ${enemyKicked}`);
metrics.notes.push(`enemy victim hitstop: ${enemyFroze}`);
metrics.notes.push(`phases seen: ${phases.join(',')}`);
metrics.notes.push(`page errors: ${errors.length ? errors.join(' | ') : 'none'}`);

writeFileSync(`${OUT}/metrics.json`, JSON.stringify(metrics, null, 1));
console.log(metrics.notes.join('\n'));
await browser.close();
process.exit(errors.length ? 2 : 0);
