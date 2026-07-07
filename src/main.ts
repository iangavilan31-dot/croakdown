// CROAKDOWN boot + loop. Phase routing, hitstop clock, BGM state, input dispatch.

import { newGame, startRun, updateWave, updateBuild, Game, applyStatPick, afterCeremony, openShop, buyCard, rollShop, resetLoadout } from './game';
import { draw, loadAtlas } from './render';
import { sampleInput, padAnyPressed, padConnected } from './input';
import { juice, decayJuice, updateParticles, updateFloaters } from './juice';
import { initAudio, resumeAudio, updateAudio, sfx, playBgm } from './audio';
import { rerollCost } from './sim';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

function resize() {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
}
window.addEventListener('resize', resize);
resize();

const g: Game = newGame();
(window as any).__game = g; // QA hook: headless probes read phase/wave/state

loadAtlas();

let audioStarted = false;
function ensureAudio() {
  if (audioStarted) return;
  audioStarted = true;
  initAudio();
  resumeAudio();
}
window.addEventListener('pointerdown', ensureAudio, { once: false });
window.addEventListener('keydown', ensureAudio, { once: false });

// shop keyboard handling needs raw keys (edge events are consumed by sampleInput)
const shopKeys: string[] = [];
window.addEventListener('keydown', (e) => { shopKeys.push(e.code); });

let last = performance.now();

function frame(now: number) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  const inputs = sampleInput(g.p2Mode);
  const keysHit = shopKeys.splice(0);

  // hitstop: freeze the sim, keep drawing (juice reads real time for shake decay)
  if (juice.hitstopFrames > 0) {
    juice.hitstopFrames--;
    draw(ctx, g, canvas.width, canvas.height);
    return;
  }

  g.time += dt;
  decayJuice(dt);
  updateParticles(dt);
  updateFloaters(dt);
  updateAudio(dt);
  g.heartFlash = Math.max(0, g.heartFlash - dt);

  // world dusk lerp (build=0, wave=1) — feat #3 world-state transition
  const targetDusk = g.phase === 'wave' ? 1 : 0;
  g.worldDusk += (targetDusk - g.worldDusk) * Math.min(1, dt * 2.5);

  switch (g.phase) {
    case 'title': {
      playBgm('menu');
      g.titleT += dt;
      if (inputs[0].confirm || inputs[1].confirm || keysHit.includes('Enter')) {
        g.phase = 'frogpick';
        g.frogPickStage = 0;
        sfx('pick');
      }
      break;
    }
    case 'frogpick': {
      const stage = g.frogPickStage;
      const move = (pi: number, dir: number) => {
        g.frogPickSel[pi] = (g.frogPickSel[pi] + dir + 2) % 2;
        sfx('cycle');
      };
      if (stage === 0) {
        if (keysHit.includes('KeyA') || keysHit.includes('ArrowLeft')) move(0, -1);
        if (keysHit.includes('KeyD') || keysHit.includes('ArrowRight')) move(0, 1);
        if (inputs[0].confirm) { g.frogPickStage = 1; sfx('pick'); }
      } else if (stage === 1) {
        // P2 join: gamepad button, or Enter for keyboard P2; Space skips (solo)
        if (padAnyPressed()) { g.players = 2; g.p2Mode = 'pad'; }
        if (keysHit.includes('Enter')) { g.players = 2; g.p2Mode = 'keys'; }
        if (g.players === 2) {
          if (keysHit.includes('ArrowLeft')) move(1, -1);
          if (keysHit.includes('ArrowRight')) move(1, 1);
          if (inputs[1].confirm || keysHit.includes('NumpadEnter')) { g.frogPickStage = 2; sfx('pick'); }
        }
        if (keysHit.includes('Space')) { g.players = g.players === 2 ? 2 : 1; g.frogPickStage = 2; sfx('pick'); }
      } else {
        if (keysHit.includes('KeyA') || keysHit.includes('ArrowLeft')) { g.frogPickDanger = Math.max(0, g.frogPickDanger - 1); sfx('cycle'); }
        if (keysHit.includes('KeyD') || keysHit.includes('ArrowRight')) { g.frogPickDanger = Math.min(3, g.frogPickDanger + 1); sfx('cycle'); }
        if (inputs[0].confirm) {
          resetLoadout();
          startRun(g);
          sfx('waveStart');
        }
      }
      break;
    }
    case 'build': {
      playBgm('build');
      updateBuild(g, dt, inputs);
      break;
    }
    case 'wave': {
      playBgm(g.bossRef ? (g.wave >= 20 ? 'boss3' : g.wave >= 15 ? 'boss2' : 'boss1') : 'wave');
      updateWave(g, dt, inputs);
      break;
    }
    case 'levelup': {
      const choices = g.levelupChoices[0];
      if (!choices) { openShop(g); break; }
      let pick = -1;
      if (keysHit.includes('Digit1')) pick = 0;
      if (keysHit.includes('Digit2')) pick = 1;
      if (keysHit.includes('Digit3')) pick = 2;
      if (pick >= 0 && choices[pick]) {
        applyStatPick(g, choices[pick] as any);
        g.levelupChoices.shift();
        if (!g.levelupChoices.length) openShop(g);
      }
      break;
    }
    case 'shop': {
      playBgm('build');
      for (const k of keysHit) {
        if (k === 'Digit1') buyCard(g, 0, 0);
        if (k === 'Digit2') buyCard(g, 1, 0);
        if (k === 'Digit3') buyCard(g, 2, 0);
        if (k === 'Digit4') buyCard(g, 3, 0);
        if (k === 'KeyL') { const c = g.shopCards[0]; if (c) { c.locked = !c.locked; sfx('cycle'); } }
        if (k === 'KeyR') {
          const cost = rerollCost(g.wave, g.rerolls);
          if (g.essence >= cost) { g.essence -= cost; g.rerolls++; g.shopCards = g.shopCards.filter(c => c.locked && !c.sold); rollShop(g); sfx('cycle'); }
          else sfx('deny');
        }
        if (k === 'Enter' || k === 'Escape') { g.phase = 'build'; sfx('ready'); }
      }
      break;
    }
    case 'ceremony': {
      playBgm('ceremony');
      g.ceremonyT += dt;
      if (g.ceremonyT > 2.4 && !g.ceremonyRevealed) {
        g.ceremonyRevealed = true;
        sfx('lotusReveal');
        // the ceremony item is FREE (boss reward) — apply to frog 0's stats via shop path
        if (g.ceremonyItem) {
          const f = g.frogs[0];
          f.items.push(g.ceremonyItem.id);
          // reuse item application
          const m = g.ceremonyItem.mod;
          if (m.dmg) f.stats.dmg += m.dmg;
          if (m.hp) { f.stats.hp += m.hp; f.maxHp += m.hp; f.hp += m.hp; }
          if (m.speed) f.stats.speed += m.speed;
          if (m.rate) f.stats.rate += m.rate;
          if (m.magnet) f.stats.magnet += m.magnet;
          if (m.towerDps) f.stats.towerDps += m.towerDps;
          if (m.essenceGain) f.stats.essenceGain += m.essenceGain;
        }
      } else if (g.ceremonyT < 0.1) sfx('lotus');
      if (g.ceremonyT > 4.2 || (g.ceremonyRevealed && (inputs[0].confirm || keysHit.includes('Enter')))) {
        afterCeremony(g);
      }
      break;
    }
    case 'gameover': case 'victory': {
      if (g.phase === 'gameover') g.gameoverT += dt; else g.victoryT += dt;
      const t = g.phase === 'gameover' ? g.gameoverT : g.victoryT;
      if (t > 1.2 && (inputs[0].confirm || keysHit.includes('Enter'))) {
        const fresh = newGame();
        Object.assign(g, fresh);
        (window as any).__game = g;
      }
      break;
    }
  }

  draw(ctx, g, canvas.width, canvas.height);
}
requestAnimationFrame(frame);
