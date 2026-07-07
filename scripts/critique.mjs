// VISUAL BAR critic — hostile art director via a vision API (docs/VISUAL_BAR.md).
// Usage: node scripts/critique.mjs <screen-name> [path-to-screenshot]
//   default screenshot: docs/qa/<screen-name>.png ; ref: docs/refs/VISUAL_REF_02.png (if present)
// Critic: ANTHROPIC_API_KEY (claude-opus-4-8) if set, else OPENAI_API_KEY (gpt-4o).
// Exit 0 = PASS (>=42/50, no axis <7), exit 3 = HELD. Verdict logged to the vault.

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const screen = process.argv[2];
if (!screen) { console.error('usage: node scripts/critique.mjs <screen> [screenshot.png]'); process.exit(1); }
const shotPath = process.argv[3] ?? `docs/qa/${screen}.png`;
const refPath = 'docs/refs/VISUAL_REF_02.png';
const AKEY = process.env.ANTHROPIC_API_KEY;
const OKEY = process.env.OPENAI_API_KEY;
if (!AKEY && !OKEY) { console.error('neither ANTHROPIC_API_KEY nor OPENAI_API_KEY is set'); process.exit(1); }
if (!existsSync(shotPath)) { console.error(`screenshot not found: ${shotPath}`); process.exit(1); }

const b64 = (p) => readFileSync(p).toString('base64');

const REF_INTRO = existsSync(refPath)
  ? 'REFERENCE (the bar — VISUAL_REF_02):'
  : 'No reference image on disk yet. Grade against this description of VISUAL_REF_02: painterly night swamp; bioluminescent glow as the only light source (golden lotus, glowing eyes, fireflies); drifting fog; soft vignette; desaturated swamp greens/teals; hot pink and warm gold as the ONLY bright accents; mellow chunky heavy-lidded frog; dark blob enemies with glowing eyes; minimal clean HUD (pixel hearts, wave track with skull, essence counter). North stars: Cult of the Lamb, Darkest Dungeon, Don\'t Starve, Night in the Woods.';
const CANDIDATE_INTRO = `CANDIDATE screenshot of the "${screen}" screen from the actual build:`;
const RUBRIC = `You are a HOSTILE art director gating an indie game. Grade the CANDIDATE against the reference bar on five axes, integer 0-10 each:
1 lighting_atmosphere - bioluminescent glow as light source, fog, vignette, mystic haze, never flat
2 palette_discipline - desaturated greens/teals base; hot pink + warm gold the ONLY bright accents; any 4th saturated color is a defect
3 composition_readability - silhouette-first; every threat/pickup reads instantly even in a swarm
4 character_feel - frogs mellow/chunky/heavy-lidded/on-model; gear visible on the frog where applicable. On menu/pause/settings screens that have no gameplay character BY DESIGN, grade this axis on the swamp motif and mascot iconography (lotus, lily pads, frog silhouettes) carrying the game's character - do NOT penalize the mere absence of a frog there
5 cohesion_finish - lives in the same painted world; no programmer-art seams or default-font UI
Be harsh. 7 = genuinely good. 9-10 = shipped-indie excellent. Placeholder/procedural elements score what they LOOK like, no benefit of the doubt.
Two benign 404s may appear in dev console; ignore anything not visible in the image itself.
Reply with ONLY JSON: {"scores":{"lighting_atmosphere":n,"palette_discipline":n,"composition_readability":n,"character_feel":n,"cohesion_finish":n},"total":n,"worst_axis":"...","worst_reason":"one sentence","fix":"the single most impactful concrete fix"}`;

let text, critic;
if (AKEY) {
  critic = 'claude-opus-4-8 (Anthropic)';
  const content = [];
  content.push({ type: 'text', text: REF_INTRO });
  if (existsSync(refPath)) content.push({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: b64(refPath) } });
  content.push({ type: 'text', text: CANDIDATE_INTRO });
  content.push({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: b64(shotPath) } });
  content.push({ type: 'text', text: RUBRIC });
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': AKEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-opus-4-8', max_tokens: 500, messages: [{ role: 'user', content }] }),
  });
  if (!res.ok) { console.error(`Anthropic API ${res.status}: ${await res.text()}`); process.exit(1); }
  const data = await res.json();
  text = data.content.map(c => c.text ?? '').join('');
} else {
  critic = 'gpt-4o (OpenAI fallback — set ANTHROPIC_API_KEY for the intended critic)';
  const content = [];
  content.push({ type: 'text', text: REF_INTRO });
  if (existsSync(refPath)) content.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${b64(refPath)}` } });
  content.push({ type: 'text', text: CANDIDATE_INTRO });
  content.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${b64(shotPath)}` } });
  content.push({ type: 'text', text: RUBRIC });
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${OKEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o', max_tokens: 500, messages: [{ role: 'user', content }] }),
  });
  if (!res.ok) { console.error(`OpenAI API ${res.status}: ${await res.text()}`); process.exit(1); }
  const data = await res.json();
  text = data.choices?.[0]?.message?.content ?? '';
}

const m = text.match(/\{[\s\S]*\}/);
if (!m) { console.error('no JSON in reply:', text); process.exit(1); }
const v = JSON.parse(m[0]);
const scores = Object.values(v.scores);
const pass = v.total >= 42 && scores.every(s => s >= 7);

const vaultDir = 'C:/Users/gamer/Documents/ObsidianPKM/claude-refs/projects/croakdown';
mkdirSync(vaultDir, { recursive: true });
const log = `# visual-grade: ${screen} — ${new Date().toISOString().slice(0, 16)}
- screenshot: ${shotPath}
- critic: ${critic}
- scores: ${JSON.stringify(v.scores)}
- total: ${v.total}/50 → ${pass ? 'PASS' : 'HELD'}
- worst axis: ${v.worst_axis} — ${v.worst_reason}
- fix: ${v.fix}
`;
writeFileSync(join(vaultDir, `visual-grade-${screen}.md`), log);
console.log(log);
// no process.exit(): fetch keep-alive handles crash libuv on Windows if we exit hard
process.exitCode = pass ? 0 : 3;
