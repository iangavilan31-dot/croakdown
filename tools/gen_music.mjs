// CROAKDOWN music pass — 7 BGM tracks via the shared hyperframes-media audio engine
// (local MusicGen path, keyless). Sequential: CPU generation is the bottleneck.
// Usage: node tools/gen_music.mjs [--only wave,boss3]

import { execFileSync, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, copyFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MEDIA = join(homedir(), '.claude', 'skills', 'hyperframes-media', 'scripts');
const OUT = join(root, 'public', 'audio', 'bgm');
mkdirSync(OUT, { recursive: true });

const TRACKS = {
  menu: 'mysterious calm swamp night ambience, soft marimba, deep sub bass, distant frogs and fireflies, sparse and loopable, moody game menu theme, 88 bpm',
  build: 'gentle mystical swamp groove, hand percussion, kalimba and warm pads, murky but hopeful, loopable game build-phase theme, 96 bpm',
  wave: 'driving dark swamp combat groove, tribal drums, low brass stabs, pulsing bass, urgent and groovy, loopable game battle theme, 122 bpm',
  boss1: 'heavy menacing swamp boss battle theme, deep war drums, growling bass, eerie bell hits, relentless, 112 bpm',
  boss2: 'frantic eerie moth-queen boss theme, fluttering arpeggios, dark waltz pulse, driving toms, unsettling beauty, 130 bpm',
  boss3: 'colossal final boss theme, doom drums, deep horns, rotting swamp king menace, epic and dark, slow heavy stomp, 100 bpm',
  ceremony: 'triumphant magical lotus-bloom fanfare, shimmering bells, warm rising swell, brief and celebratory, jackpot moment',
};

const only = process.argv.includes('--only')
  ? process.argv[process.argv.indexOf('--only') + 1].split(',')
  : Object.keys(TRACKS);

let ffmpeg = true;
try { execSync('ffmpeg -version', { stdio: 'ignore' }); } catch { ffmpeg = false; }

for (const name of only) {
  const prompt = TRACKS[name];
  if (!prompt) continue;
  const dest = join(OUT, `${name}.mp3`);
  const destWav = join(OUT, `${name}.wav`);
  if (existsSync(dest) || existsSync(destWav)) { console.log(`skip ${name} (exists)`); continue; }
  const dir = join(root, 'tools', 'music', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'audio_request.json'), JSON.stringify({
    lines: [],
    bgm: { mode: 'generate', prompt },
  }, null, 2));
  console.log(`\n=== ${name}: generating...`);
  try {
    execFileSync('node', [join(MEDIA, 'audio.mjs'), '--request', './audio_request.json', '--hyperframes', '.', '--out', './audio_meta.json', '--only', 'bgm'], { cwd: dir, stdio: 'inherit' });
    execFileSync('node', [join(MEDIA, 'wait-bgm.mjs'), '--audio-meta', './audio_meta.json', '--hyperframes', '.', '--timeout-ms', '900000', '--interval-ms', '5000'], { cwd: dir, stdio: 'inherit' });
  } catch (e) {
    console.error(`${name}: engine error — ${e.message}`);
    continue;
  }
  // find the produced track (assets/bgm/track.wav per engine contract)
  const bgmDir = join(dir, 'assets', 'bgm');
  let produced = null;
  if (existsSync(bgmDir)) {
    const f = readdirSync(bgmDir).find(f => f.endsWith('.wav') || f.endsWith('.mp3'));
    if (f) produced = join(bgmDir, f);
  }
  if (!produced) { console.error(`${name}: no track produced`); continue; }
  if (ffmpeg && produced.endsWith('.wav')) {
    execSync(`ffmpeg -y -loglevel error -i "${produced}" -codec:a libmp3lame -q:a 4 "${dest}"`);
    console.log(`${name}: -> ${dest}`);
  } else {
    copyFileSync(produced, produced.endsWith('.mp3') ? dest : destWav);
    console.log(`${name}: copied raw`);
  }
}
console.log('\nmusic pass done');
