// CROAKDOWN audio — Web Audio SFX engine (layered synth, round-robin pitch variance,
// duck bus on big hits) + BGM loader (real tracks from public/audio/bgm/, graceful silence
// until the music pass lands). BRIEF §7.6.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let duckBus: GainNode | null = null;
let duckT = 0;
let sfxVol = 0.5;

export function initAudio() {
  if (ctx) return;
  ctx = new AudioContext({ latencyHint: 'interactive' });
  master = ctx.createGain();
  master.gain.value = sfxVol;
  duckBus = ctx.createGain();
  duckBus.connect(master);
  master.connect(ctx.destination);
}

export function resumeAudio() { ctx?.resume(); }

// ---------- player volume (settings screen) ----------
export function getSfxVolume() { return sfxVol; }
export function setSfxVolume(v: number) {
  sfxVol = Math.max(0, Math.min(1, Math.round(v * 10) / 10));
  if (master) master.gain.value = sfxVol;
}
export function getMusicVolume() { return bgmVol; }
export function setMusicVolume(v: number) {
  bgmVol = Math.max(0, Math.min(1, Math.round(v * 10) / 10));
  if (currentBgm) currentBgm.volume = bgmVol;
}

export function updateAudio(dt: number) {
  if (duckT > 0 && duckBus && ctx) {
    duckT -= dt;
    duckBus.gain.setTargetAtTime(duckT > 0 ? 0.35 : 1, ctx.currentTime, 0.05);
  }
}

function duck() { duckT = 0.18; }

// ---------- tiny synth helpers ----------
function osc(type: OscillatorType, freq: number, dur: number, vol: number, pitchEnd?: number, dest?: AudioNode) {
  if (!ctx || !duckBus) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, ctx.currentTime);
  if (pitchEnd) o.frequency.exponentialRampToValueAtTime(Math.max(20, pitchEnd), ctx.currentTime + dur);
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  o.connect(g); g.connect(dest ?? duckBus);
  o.start(); o.stop(ctx.currentTime + dur);
}

function noise(dur: number, vol: number, filterFreq: number, dest?: AudioNode) {
  if (!ctx || !duckBus) return;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = filterFreq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  src.connect(f); f.connect(g); g.connect(dest ?? duckBus);
  src.start();
}

// round-robin pitch variance (research: small ranges, ±5-8%)
function vary(freq: number) { return freq * (0.94 + Math.random() * 0.13); }

// ---------- SFX table ----------
export type SfxName =
  | 'tongue' | 'spit' | 'hit' | 'kill' | 'clink' | 'burst' | 'bite'
  | 'dash' | 'hurt' | 'down' | 'revive' | 'pip' | 'buy' | 'deny' | 'pick' | 'cycle'
  | 'grow' | 'attune' | 'towerDie' | 'heartHit' | 'espit'
  | 'waveStart' | 'bossIntro' | 'bossPhase' | 'bossDie' | 'gameover' | 'victory'
  | 'lotus' | 'lotusReveal' | 'ready';

const sfxCooldowns = new Map<SfxName, number>();

export function sfx(name: SfxName) {
  if (!ctx || ctx.state !== 'running') return;
  // rate-limit spammy ones
  const now = performance.now();
  const cd = { hit: 30, kill: 45, pip: 25, bite: 60, tongue: 40, spit: 40 }[name as string] ?? 0;
  if (cd) {
    const last = sfxCooldowns.get(name) ?? 0;
    if (now - last < cd) return;
    sfxCooldowns.set(name, now);
  }
  switch (name) {
    case 'tongue': osc('square', vary(340), 0.06, 0.08, 180); break;
    case 'spit': osc('sine', vary(520), 0.09, 0.1, 260); break;
    case 'hit': noise(0.05, 0.12, 1800); osc('triangle', vary(180), 0.05, 0.1, 90); break;
    case 'kill': noise(0.12, 0.2, 900); osc('sine', vary(140), 0.16, 0.22, 40); break; // bass layer = perceived power
    case 'clink': osc('square', vary(1200), 0.04, 0.06, 900); break;
    case 'burst': noise(0.2, 0.25, 700); osc('sine', vary(90), 0.25, 0.3, 30); duck(); break;
    case 'bite': osc('sawtooth', vary(240), 0.07, 0.09, 110); break;
    case 'dash': noise(0.08, 0.08, 2400); break;
    case 'hurt': osc('sawtooth', vary(200), 0.14, 0.2, 70); noise(0.1, 0.12, 1200); break;
    case 'down': osc('sine', 220, 0.5, 0.3, 45); duck(); break;
    case 'revive': osc('sine', 330, 0.3, 0.2, 660); osc('sine', 440, 0.4, 0.15, 880); break;
    case 'pip': osc('sine', vary(880), 0.06, 0.05, 1320); break;
    case 'buy': osc('sine', 660, 0.1, 0.15, 990); osc('sine', 880, 0.16, 0.1, 1320); break;
    case 'deny': osc('square', 140, 0.12, 0.12, 100); break;
    case 'pick': osc('sine', 520, 0.12, 0.15, 780); break;
    case 'cycle': osc('square', vary(440), 0.04, 0.06); break;
    case 'grow': osc('sine', 220, 0.35, 0.2, 550); noise(0.25, 0.08, 600); break;
    case 'attune': osc('sine', 330, 0.3, 0.18, 495); osc('sine', 495, 0.4, 0.12, 742); break;
    case 'towerDie': noise(0.3, 0.25, 500); osc('sine', 120, 0.35, 0.25, 35); duck(); break;
    case 'heartHit': osc('sine', 110, 0.4, 0.35, 55); noise(0.2, 0.2, 400); duck(); break;
    case 'espit': osc('square', vary(300), 0.08, 0.06, 180); break;
    case 'waveStart': osc('sine', 165, 0.6, 0.25, 82); osc('sine', 220, 0.5, 0.15, 110); break;
    case 'bossIntro': osc('sawtooth', 65, 1.2, 0.35, 32); noise(0.8, 0.2, 300); duck(); break;
    case 'bossPhase': osc('sawtooth', 90, 0.8, 0.3, 45); noise(0.5, 0.25, 500); duck(); break;
    case 'bossDie': noise(0.8, 0.35, 600); osc('sine', 70, 1.0, 0.4, 25); duck(); break;
    case 'gameover': osc('sine', 220, 1.5, 0.3, 55); break;
    case 'victory': for (let i = 0; i < 4; i++) setTimeout(() => osc('sine', [523, 659, 784, 1047][i], 0.4, 0.2), i * 130); break;
    case 'lotus': osc('sine', 262, 0.8, 0.15, 524); break;
    case 'lotusReveal': for (let i = 0; i < 3; i++) setTimeout(() => osc('sine', [659, 831, 988][i], 0.5, 0.2), i * 110); break;
    case 'ready': osc('sine', vary(440), 0.08, 0.08, 550); break;
  }
}

// ---------- BGM: real tracks, drop-in folder (music pass fills these) ----------
export type BgmName = 'menu' | 'build' | 'wave' | 'boss1' | 'boss2' | 'boss3' | 'ceremony';
const BGM_FILES: Record<BgmName, string> = {
  menu: '/audio/bgm/menu.mp3',
  build: '/audio/bgm/build.mp3',
  wave: '/audio/bgm/wave.mp3',
  boss1: '/audio/bgm/boss1.mp3',
  boss2: '/audio/bgm/boss2.mp3',
  boss3: '/audio/bgm/boss3.mp3',
  ceremony: '/audio/bgm/ceremony.mp3',
};

let currentBgm: HTMLAudioElement | null = null;
let currentName: BgmName | null = null;
let bgmVol = 0.55;
const bgmCache = new Map<BgmName, HTMLAudioElement | 'missing'>();

export function playBgm(name: BgmName) {
  if (currentName === name) return;
  const prev = currentBgm;
  if (prev) fadeOut(prev);
  currentName = name;
  currentBgm = null;
  const cached = bgmCache.get(name);
  if (cached === 'missing') return;
  if (cached) { startTrack(cached); return; }
  const tryLoad = (url: string, next?: string) => {
    const a = new Audio(url);
    a.loop = name !== 'ceremony';
    a.volume = 0;
    a.addEventListener('canplaythrough', () => { bgmCache.set(name, a); if (currentName === name) startTrack(a); }, { once: true });
    a.addEventListener('error', () => {
      if (next) tryLoad(next);
      else bgmCache.set(name, 'missing'); // silent until the music pass lands
    }, { once: true });
    a.load();
  };
  tryLoad(BGM_FILES[name], BGM_FILES[name].replace('.mp3', '.wav'));
}

function startTrack(a: HTMLAudioElement) {
  currentBgm = a;
  a.currentTime = 0;
  a.volume = 0;
  a.play().catch(() => {});
  const fade = setInterval(() => {
    if (currentBgm !== a) { clearInterval(fade); return; }
    a.volume = Math.min(bgmVol, a.volume + 0.05);
    if (a.volume >= bgmVol) clearInterval(fade);
  }, 60);
}

function fadeOut(a: HTMLAudioElement) {
  const fade = setInterval(() => {
    a.volume = Math.max(0, a.volume - 0.08);
    if (a.volume <= 0) { a.pause(); clearInterval(fade); }
  }, 50);
}
