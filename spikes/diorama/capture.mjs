// visible-window play-test capture for the diorama spike (hidden preview tabs freeze rAF)
// outputs go OUTSIDE the served folder so vite's watcher can't reload the page mid-run
import { chromium } from 'playwright';

const OUT = process.env.CAP_OUT || 'C:/Users/gamer/AppData/Local/Temp/claude-diorama-cap';
import { mkdirSync } from 'fs';
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({
  headless: false,
  channel: 'chrome',
  args: ['--window-position=-1080,-578', '--window-size=1080,760'],
});
const cx = await b.newContext({
  viewport: { width: 1050, height: 590 },
  deviceScaleFactor: 1.5,
  recordVideo: { dir: `${OUT}/vid`, size: { width: 1050, height: 590 } },
});
const page = await cx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));

const dbg = async label => {
  const s = await page.evaluate(() => ({
    boot: window.__dbg.boot, kd: window.__dbg.kd, atk: window.__dbg.atk,
    x: Math.round(window.__frog.x), y: Math.round(window.__frog.y), face: window.__frog.face,
  }));
  console.log(label, JSON.stringify(s));
};

await page.goto('http://localhost:5126/spikes/diorama/');
await page.waitForTimeout(2200);
await dbg('idle    ');
await page.screenshot({ path: `${OUT}/s-idle.png` });

// hop right toward the big blob
await page.keyboard.down('d');
await page.waitForTimeout(1000);
await page.keyboard.up('d');
await dbg('after-d ');
await page.waitForTimeout(150);

// first swing — mid-swing frame
await page.keyboard.press(' ');
await page.waitForTimeout(110);
await page.screenshot({ path: `${OUT}/s-swing.png` });
await dbg('swing1  ');
await page.waitForTimeout(450);

// second swing — kill pop
await page.keyboard.press(' ');
await page.waitForTimeout(150);
await page.screenshot({ path: `${OUT}/s-kill.png` });
await dbg('swing2  ');
await page.waitForTimeout(700);

// roam: down-left, then a swing facing left
await page.keyboard.down('s');
await page.waitForTimeout(400);
await page.keyboard.up('s');
await page.keyboard.down('a');
await page.waitForTimeout(700);
await page.keyboard.up('a');
await dbg('after-a ');
await page.keyboard.press(' ');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/s-roam.png` });
await dbg('end     ');

await cx.close();
await b.close();
console.log('errors:', errors.length ? errors.join('\n') : 'none');
console.log('out:', OUT);
