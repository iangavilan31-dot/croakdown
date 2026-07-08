// Image asset loader. Preloads sprites/backdrop; render reads them by key.
// Pixel art: callers draw with imageSmoothingEnabled=false.

const KEYS = {
  frog: '/art/batch01/frog_base.png',
  frogBlink: '/art/batch01/frog_blink.png',
  frogCroak: '/art/batch01/frog_croak.png',
  frogJump: '/art/batch01/frog_jump.png',
  sludgeling: '/art/batch01/blobbit_base.png',
  blobbitHit: '/art/batch01/blobbit_hit.png',
  blobbitPop: '/art/batch01/blobbit_pop.png',
  backdrop: '/art/arena_backdrop.png',
} as const;

export type AssetKey = keyof typeof KEYS;

const images: Partial<Record<AssetKey, HTMLImageElement>> = {};
let loaded = 0;
const total = Object.keys(KEYS).length;

export function loadAssets(): void {
  for (const [key, url] of Object.entries(KEYS) as [AssetKey, string][]) {
    const im = new Image();
    im.onload = () => { images[key] = im; loaded++; };
    im.onerror = () => { loaded++; }; // missing asset: renderer falls back to graybox
    im.src = url;
  }
}

export function img(key: AssetKey): HTMLImageElement | null {
  return images[key] ?? null;
}

export function assetsReady(): boolean {
  return loaded >= total;
}
