// Audio graph — layered synth SFX (transient + body + bass), round-robin pitch variance,
// duck bus on heavy events, BGM loader (public/audio/bgm/, graceful silence if missing).
// Weapon identities per design/9 Audio/Audio Direction.md. Sword = wet slice + bass thunk.

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

export function getSfxVolume() { return sfxVol; }
export function setSfxVolume(v: number) {
  sfxVol = Math.max(0, Math.min(1, Math.round(v * 10) / 10));
  if (master) master.gain.value = sfxVol;
}
export function getMusicVolume() { return bgmVol; }
export function setMusicVolume(v: number) {
  bgmVol = Math.max(0, Math.min(1, Math.round(v * 10) / 10));
  if (currentBgm) currentBgm.volume = bgmVol;
  if (musicBus && ctx) musicBus.gain.setTargetAtTime(bgmVol, ctx.currentTime, 0.1);
}

export function updateAudio(dt: number) {
  if (duckT > 0 && duckBus && ctx) {
    duckT -= dt;
    duckBus.gain.setTargetAtTime(duckT > 0 ? 0.35 : 1, ctx.currentTime, 0.05);
  }
  // procedural music scheduler (lookahead ~0.2s so timing survives frame jitter)
  if (musicOn && ctx && musicBus) {
    while (nextNoteTime < ctx.currentTime + 0.2) {
      scheduleStep(musicStep, nextNoteTime);
      nextNoteTime += SECS_PER_STEP;
      musicStep = (musicStep + 1) % 32;
    }
  }
}
function duck() { duckT = 0.18; }

function osc(type: OscillatorType, freq: number, dur: number, vol: number, pitchEnd?: number) {
  if (!ctx || !duckBus) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, ctx.currentTime);
  if (pitchEnd) o.frequency.exponentialRampToValueAtTime(Math.max(20, pitchEnd), ctx.currentTime + dur);
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  o.connect(g); g.connect(duckBus);
  o.start(); o.stop(ctx.currentTime + dur);
}
function noise(dur: number, vol: number, filterFreq: number, hp = false) {
  if (!ctx || !duckBus) return;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = hp ? 'highpass' : 'lowpass'; f.frequency.value = filterFreq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  src.connect(f); f.connect(g); g.connect(duckBus);
  src.start();
}
// round-robin pitch variance ±6%
function vary(freq: number) { return freq * (0.94 + Math.random() * 0.12); }

export type SfxName =
  | 'swing' | 'swingHeavy' | 'sliceLight' | 'sliceHeavy' | 'clink' | 'reflect'
  | 'kill' | 'gib' | 'splat' | 'launch'
  | 'tongueOut' | 'tongueSnap' | 'dash' | 'hop'
  | 'hurt' | 'death' | 'pip' | 'spawn' | 'flop' | 'pop' | 'nibble'
  | 'pick' | 'cycle' | 'ready';

const sfxCooldowns = new Map<SfxName, number>();

export function sfx(name: SfxName) {
  if (!ctx || ctx.state !== 'running') return;
  const now = performance.now();
  const cd: Partial<Record<SfxName, number>> = {
    sliceLight: 30, kill: 45, pip: 25, hop: 90, nibble: 60, spawn: 50, launch: 40,
  };
  const c = cd[name] ?? 0;
  if (c) {
    const last = sfxCooldowns.get(name) ?? 0;
    if (now - last < c) return;
    sfxCooldowns.set(name, now);
  }
  switch (name) {
    // sword identity: wet slice (mid noise) + bass thunk (sine drop)
    case 'swing': noise(0.07, 0.06, 3200, true); break;                                  // air woosh
    case 'swingHeavy': noise(0.16, 0.09, 1800, true); osc('sine', 90, 0.16, 0.06, 60); break;
    case 'sliceLight': noise(0.05, 0.14, 2200); osc('triangle', vary(170), 0.06, 0.12, 80); osc('sine', vary(95), 0.09, 0.16, 45); break;
    case 'sliceHeavy': noise(0.09, 0.2, 1500); osc('triangle', vary(140), 0.09, 0.16, 60); osc('sine', vary(70), 0.16, 0.28, 32); duck(); break;
    case 'clink': osc('square', vary(1300), 0.04, 0.07, 950); noise(0.03, 0.05, 4000, true); break; // armored absorb
    case 'reflect': osc('square', vary(700), 0.08, 0.1, 300); break;
    case 'kill': noise(0.12, 0.2, 900); osc('sine', vary(130), 0.18, 0.24, 38); break;
    case 'gib': noise(0.2, 0.26, 700); osc('sine', vary(85), 0.26, 0.3, 28); duck(); break;
    case 'splat': noise(0.14, 0.24, 500); osc('sine', vary(60), 0.2, 0.3, 25); duck(); break; // wall splat
    case 'launch': noise(0.09, 0.1, 2600, true); osc('sine', vary(220), 0.1, 0.08, 440); break;
    case 'tongueOut': osc('square', vary(320), 0.06, 0.08, 190); break;
    case 'tongueSnap': osc('square', vary(210), 0.05, 0.12, 520); noise(0.04, 0.08, 1400); break; // elastic wet snap
    case 'dash': noise(0.08, 0.08, 2400, true); break;
    case 'hop': noise(0.03, 0.025, 900); break;
    case 'hurt': osc('sawtooth', vary(200), 0.14, 0.2, 70); noise(0.1, 0.12, 1200); duck(); break;
    case 'death': osc('sine', 200, 0.9, 0.3, 40); noise(0.4, 0.2, 500); duck(); break;
    case 'pip': osc('sine', vary(880), 0.05, 0.04, 1320); break;
    case 'spawn': noise(0.12, 0.06, 700); break;
    case 'flop': osc('sine', vary(75), 0.18, 0.24, 30); noise(0.12, 0.16, 420); break;   // gloopa slam
    case 'pop': osc('sine', vary(300), 0.08, 0.14, 90); noise(0.06, 0.1, 900); break;    // blobbit squish
    case 'nibble': osc('sawtooth', vary(240), 0.06, 0.07, 110); break;
    case 'pick': osc('sine', 520, 0.12, 0.15, 780); break;
    case 'cycle': osc('square', vary(440), 0.04, 0.06); break;
    case 'ready': osc('sine', vary(440), 0.08, 0.08, 550); break;
  }
}

// ---------- BGM (drop-in tracks; silent until present) ----------
export type BgmName = 'wave';
const BGM_FILES: Record<BgmName, string> = { wave: '/audio/bgm/wave.mp3' };
let currentBgm: HTMLAudioElement | null = null;
let currentName: BgmName | null = null;
let bgmVol = 0.4;
const bgmCache = new Map<BgmName, HTMLAudioElement | 'missing'>();

export function playBgm(name: BgmName) {
  if (currentName === name) return;
  currentName = name;
  const cached = bgmCache.get(name);
  if (cached === 'missing') return;
  if (cached) { startTrack(cached); return; }
  const a = new Audio(BGM_FILES[name]);
  a.loop = true; a.volume = 0;
  a.addEventListener('canplaythrough', () => { bgmCache.set(name, a); if (currentName === name) startTrack(a); }, { once: true });
  a.addEventListener('error', () => bgmCache.set(name, 'missing'), { once: true });
  a.load();
}
function startTrack(a: HTMLAudioElement) {
  currentBgm = a;
  a.currentTime = 0; a.volume = 0;
  a.play().catch(() => {});
  const fade = setInterval(() => {
    if (currentBgm !== a) { clearInterval(fade); return; }
    a.volume = Math.min(bgmVol, a.volume + 0.04);
    if (a.volume >= bgmVol) clearInterval(fade);
  }, 60);
}

// ---------- procedural ambient music bed (synthesized, no assets) ----------
// A quiet, dreamlike nighttime swamp (Audio Direction): a slow detuned drone
// under a filter LFO, a soft heartbeat sub for forward motion, and sparse
// pentatonic "bioluminescent" chimes. Scheduled with a lookahead clock so the
// music stays in time regardless of render frame rate. Works headless.
let musicBus: GainNode | null = null;
let musicOn = false;
let nextNoteTime = 0;
let musicStep = 0;
const BPM = 58;                               // slow, meditative
const SECS_PER_STEP = 60 / BPM / 2;           // eighth-note grid
// warm D-minor pentatonic (D F A C, two octaves) — sits under the golden lotus glow
const SCALE = [146.83, 174.61, 220.0, 261.63, 293.66, 349.23, 440.0];

export function startMusic() {
  if (!ctx || musicOn || !master) return;
  musicOn = true;
  musicBus = ctx.createGain();
  musicBus.gain.value = 0;
  musicBus.connect(master);
  musicBus.gain.setTargetAtTime(bgmVol, ctx.currentTime, 2.5);  // slow fade-in
  // drone: detuned saws through a lowpass that breathes on a slow LFO
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = 4;
  lp.connect(musicBus);
  const lfo = ctx.createOscillator(); const lfoG = ctx.createGain();
  lfo.frequency.value = 0.05; lfoG.gain.value = 200;
  lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start();
  for (const [f, det] of [[73.42, -5], [73.42, 6], [110.0, 0]] as [number, number][]) {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
    g.gain.value = 0.045;
    o.connect(g); g.connect(lp); o.start();
  }
  nextNoteTime = ctx.currentTime + 0.15;
  musicStep = 0;
}

function scheduleStep(s: number, t: number) {
  if (!ctx || !musicBus) return;
  // heartbeat sub on the downbeat (every 8 steps) — slow pulse of forward motion
  if (s % 8 === 0) {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(58, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.4);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.11, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.55);
  }
  // sparse chimes: a soft triangle bell + glassy octave overtone, long tail
  if (Math.random() < 0.24) {
    const base = SCALE[(Math.random() * SCALE.length) | 0] * (Math.random() < 0.25 ? 2 : 1);
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = base;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.06, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 1.7);
    const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
    o2.type = 'sine'; o2.frequency.value = base * 2;
    g2.gain.setValueAtTime(0.0001, t);
    g2.gain.linearRampToValueAtTime(0.022, t + 0.02);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    o2.connect(g2); g2.connect(musicBus); o2.start(t); o2.stop(t + 1.3);
  }
}
