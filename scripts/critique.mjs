// VISUAL BAR critic — hostile art director via Anthropic vision API (docs/VISUAL_BAR.md).
// Usage: node scripts/critique.mjs <screen-name> [path-to-screenshot]
//   default screenshot: docs/qa/<screen-name>.png ; ref: docs/refs/VISUAL_REF_02.png (if present)
// Exit 0 = PASS (>=42/50, no axis <7), exit 3 = HELD. Verdict logged to the vault.

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const screen = process.argv[2];
if (!screen) { console.error('usage: node scripts/critique.mjs <screen> [screenshot.png]'); process.exit(1); }
const shotPath = process.argv[3] ?? `docs/qa/${screen}.png`;
const refPath = 'docs/refs/VISUAL_REF_02.png';
const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1); }
if (!existsSync(shotPath)) { console.error(`screenshot not found: ${shotPath}`); process.exit(1); }

const b64 = (p) => readFileSync(p).toString('base64');
const content = [];
if (existsSync(refPath)) {
  content.push({ type: 'text', text: 'REFERENCE (the bar — VISUAL_REF_02):' });
  content.push({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: b64(refPath) } });
} else {
  content.push({ type: 'text', text: 'No reference image on disk yet. Grade against this description of VISUAL_REF_02: painterly night swamp; bioluminescent glow as the only light source (golden lotus, glowing eyes, fireflies); drifting fog; soft vignette; desaturated swamp greens/teals; hot pink and warm gold as the ONLY bright accents; mellow chunky heavy-lidded frog; dark blob enemies with glowing eyes; minimal clean HUD (pixel hearts, wave track with skull, essence counter). North stars: Cult of the Lamb, Darkest Dungeon, Don\'t Starve, Night in the Woods.' });
}
content.push({ type: 'text', text: `CANDIDATE screenshot of the "${screen}" screen from the actual build:` });
content.push({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: b64(shotPath) } });
content.push({
  type: 'text', text: `You are a HOSTILE art director gating an indie game. Grade the CANDIDATE against the reference bar on five axes, integer 0-10 each:
1 lighting_atmosphere - bioluminescent glow as light source, fog, vignette, mystic haze, never flat
2 palette_discipline - desaturated greens/teals base; hot pink + warm gold the ONLY bright accents; any 4th saturated color is a defect
3 composition_readability - silhouette-first; every threat/pickup reads instantly even in a swarm
4 character_feel - frogs mellow/chunky/heavy-lidded/on-model; gear visible on the frog where applicable
5 cohesion_finish - lives in the same painted world; no programmer-art seams or default-font UI
Be harsh. 7 = genuinely good. 9-10 = shipped-indie excellent. Placeholder/procedural elements score what they LOOK like, no benefit of the doubt.
Reply with ONLY JSON: {"scores":{"lighting_atmosphere":n,"palette_discipline":n,"composition_readability":n,"character_feel":n,"cohesion_finish":n},"total":n,"worst_axis":"...","worst_reason":"one sentence","fix":"the single most impactful concrete fix"}` });

const res = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
  body: JSON.stringify({ model: 'claude-opus-4-8', max_tokens: 500, messages: [{ role: 'user', content }] }),
});
if (!res.ok) { console.error(`API ${res.status}: ${await res.text()}`); process.exit(1); }
const data = await res.json();
const text = data.content.map(c => c.text ?? '').join('');
const m = text.match(/\{[\s\S]*\}/);
if (!m) { console.error('no JSON in reply:', text); process.exit(1); }
const v = JSON.parse(m[0]);
const scores = Object.values(v.scores);
const pass = v.total >= 42 && scores.every(s => s >= 7);

const vaultDir = 'C:/Users/gamer/Documents/ObsidianPKM/claude-refs/projects/croakdown';
mkdirSync(vaultDir, { recursive: true });
const log = `# visual-grade: ${screen} — ${new Date().toISOString().slice(0, 16)}
- screenshot: ${shotPath}
- scores: ${JSON.stringify(v.scores)}
- total: ${v.total}/50 → ${pass ? 'PASS' : 'HELD'}
- worst axis: ${v.worst_axis} — ${v.worst_reason}
- fix: ${v.fix}
`;
writeFileSync(join(vaultDir, `visual-grade-${screen}.md`), log);
console.log(log);
process.exit(pass ? 0 : 3);
