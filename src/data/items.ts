// Shop items — Brotato-style, but every item VISIBLY changes gameplay (weapon
// mods, launch mods, kit amplifiers), never bare +5%. DUO items only shine in
// co-op and say so on the card.

export type Rarity = 'common' | 'rare' | 'epic';
export type ItemId =
  | 'whetstone' | 'widerjaw' | 'longhilt' | 'heavysap' | 'echoedge'
  | 'bogpiston' | 'splatterhouse' | 'pinballgut'
  | 'thirdlung' | 'oiledhips' | 'wakeripper'
  | 'barbedtip' | 'elasticgland' | 'lightninggland'
  | 'seismicplates' | 'trophyline' | 'nightcap'
  | 'fireflyjar' | 'lilyheart' | 'mudarmor'
  | 'tandembell' | 'longleash' | 'bloodpact';

export interface ItemData {
  id: ItemId;
  name: string;
  desc: string;            // shown on the card — plain words, visible effect
  rarity: Rarity;
  cost: number;            // base; shop scales by wave
  duo?: boolean;           // labeled DUO in the shop
  kit?: 'warden' | 'snapper' | 'morel';  // kit-amp items only offered to that frog
  max?: number;            // stack cap (default 1)
}

export const ITEMS: Record<ItemId, ItemData> = {
  // ---- swing ----
  whetstone: { id: 'whetstone', name: 'Whetstone Fang', desc: 'Swings hit +25% harder. Blade gleams.', rarity: 'common', cost: 12, max: 3 },
  widerjaw: { id: 'widerjaw', name: 'Wider Jaw', desc: 'Swing arc +20%. The smear grows.', rarity: 'common', cost: 12, max: 2 },
  longhilt: { id: 'longhilt', name: 'Long Hilt', desc: 'Reach +25%. The blade grows.', rarity: 'rare', cost: 22, max: 2 },
  heavysap: { id: 'heavysap', name: 'Heavy Sap', desc: 'Heavies charge 30% faster and bite +1 hitstop frame.', rarity: 'rare', cost: 24 },
  echoedge: { id: 'echoedge', name: 'Echo Edge', desc: 'Chain finishers hurl a cutting crescent.', rarity: 'epic', cost: 44 },
  // ---- launch / knockback ----
  bogpiston: { id: 'bogpiston', name: 'Bog Piston', desc: 'Knockback +30%. Enemies FLY.', rarity: 'common', cost: 12, max: 3 },
  splatterhouse: { id: 'splatterhouse', name: 'Splatterhouse', desc: 'Wall-splats burst, hurting nearby enemies.', rarity: 'rare', cost: 26 },
  pinballgut: { id: 'pinballgut', name: 'Pinball Gut', desc: 'Tumbling enemies bounce harder and hit +50%.', rarity: 'epic', cost: 40 },
  // ---- dash ----
  thirdlung: { id: 'thirdlung', name: 'Third Lung', desc: '+1 dash charge.', rarity: 'common', cost: 15 },
  oiledhips: { id: 'oiledhips', name: 'Oiled Hips', desc: 'Dashes recharge 25% faster.', rarity: 'common', cost: 12, max: 2 },
  wakeripper: { id: 'wakeripper', name: 'Wake Ripper', desc: 'Your dash wake cuts enemies (8 dmg).', rarity: 'rare', cost: 24 },
  // ---- tongue ----
  barbedtip: { id: 'barbedtip', name: 'Barbed Tip', desc: 'Tongue grabs bite for 10 dmg.', rarity: 'common', cost: 12 },
  elasticgland: { id: 'elasticgland', name: 'Elastic Gland', desc: 'Tongue reach +40%.', rarity: 'rare', cost: 22 },
  lightninggland: { id: 'lightninggland', name: 'Lightning Gland', desc: 'Pulled enemies zap 3 neighbors.', rarity: 'epic', cost: 42 },
  // ---- kit amplifiers ----
  seismicplates: { id: 'seismicplates', name: 'Seismic Plates', desc: 'Bog Slam leaves a crater that slows.', rarity: 'epic', cost: 40, kit: 'warden' },
  trophyline: { id: 'trophyline', name: 'Trophy Line', desc: 'Yeeted enemies explode on impact.', rarity: 'epic', cost: 40, kit: 'snapper' },
  nightcap: { id: 'nightcap', name: 'Night Cap', desc: 'Decoy taunts wider and bursts harder.', rarity: 'epic', cost: 40, kit: 'morel' },
  // ---- economy / survival ----
  fireflyjar: { id: 'fireflyjar', name: 'Firefly Jar', desc: 'Coins fly to you from across the pond.', rarity: 'common', cost: 10 },
  lilyheart: { id: 'lilyheart', name: 'Lily Heart', desc: '+25 max HP and heal 25 now.', rarity: 'rare', cost: 25, max: 3 },
  mudarmor: { id: 'mudarmor', name: 'Mud Armor', desc: 'Take 15% less damage. Wear the bog.', rarity: 'rare', cost: 26, max: 2 },
  // ---- DUO (do nothing solo — say it proudly) ----
  tandembell: { id: 'tandembell', name: 'Tandem Bell', desc: 'DUO: +20% damage while near your partner.', rarity: 'rare', cost: 20, duo: true },
  longleash: { id: 'longleash', name: 'Long Leash', desc: 'DUO: partner-yank works at any range, half cooldown.', rarity: 'rare', cost: 20, duo: true },
  bloodpact: { id: 'bloodpact', name: 'Blood Pact', desc: 'DUO: one shared health pool, +30 max HP.', rarity: 'epic', cost: 45, duo: true },
};

export const RARITY_WEIGHTS: Record<Rarity, (wave: number) => number> = {
  common: (w) => Math.max(2, 10 - w * 0.5),
  rare: (w) => 3 + w * 0.35,
  epic: (w) => Math.max(0, w - 3) * 0.45,
};
export const REROLL_BASE = 4;
export const SHOP_SLOTS = 4;
