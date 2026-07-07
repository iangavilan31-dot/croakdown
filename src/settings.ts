// CROAKDOWN player settings — localStorage-backed: music/SFX volume, screen shake.
// Applied at boot; saved on every change from the pause settings screen.

import { setMusicVolume, setSfxVolume, getMusicVolume, getSfxVolume } from './audio';
import { juice } from './juice';

const KEY = 'croakdown.settings.v1';

export function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    if (typeof s.music === 'number') setMusicVolume(s.music);
    if (typeof s.sfx === 'number') setSfxVolume(s.sfx);
    if (typeof s.shake === 'number') juice.shakeSlider = Math.max(0, Math.min(1.5, s.shake));
  } catch { /* fresh defaults */ }
}

export function saveSettings() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      music: getMusicVolume(), sfx: getSfxVolume(), shake: juice.shakeSlider,
    }));
  } catch { /* storage unavailable: settings live for the session only */ }
}
