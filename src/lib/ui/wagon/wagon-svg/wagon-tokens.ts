// Wagon illustration constants — local hex literals, NOT CSS variables.
// The wagon SVGs use a separate, more saturated palette than the UI chrome.
// Don't promote these to theme.css — they belong to the illustration layer.

export const W_INK         = '#3a1a08';
export const W_WOOD        = '#8a5a2a';
export const W_WOOD_DARK   = '#5a3a1a';
export const W_WOOD_LIGHT  = '#a87040';
export const W_CANVAS      = '#f5e6c8';
export const W_CANVAS_DIRTY = '#d8c89a';
export const W_CANVAS_PATCH = '#a89060';
export const W_IRON        = '#1a0e04';
export const W_RUST        = '#c96a2a';

// Damage mapping: wagon health (0..100) → which damage layers are visible.
// Five canvas states (pristine/patch/tear/big-rip/shredded), three dirt
// states (clean/streaked/grimy), one missing-plank index, two wheel
// breakage flags. These thresholds are committed visual logic per the
// design brief — don't reinterpret.
export interface WagonDamage {
  canvas: 0 | 1 | 2 | 3 | 4;
  dirt: 0 | 1 | 2;
  /** -1 = no missing plank; otherwise the plank index. */
  plank: number;
  wheelBack: boolean;
  wheelFront: boolean;
}

export function healthToDamage(health: number): WagonDamage {
  let canvas: WagonDamage['canvas'] = 0;
  if (health < 80) canvas = 1;
  if (health < 60) canvas = 2;
  if (health < 40) canvas = 3;
  if (health < 20) canvas = 4;

  let dirt: WagonDamage['dirt'] = 0;
  if (health < 70) dirt = 1;
  if (health < 30) dirt = 2;

  const plank = health < 35 ? 1 : -1;
  const wheelBack = health < 25;
  const wheelFront = health < 12;

  return { canvas, dirt, plank, wheelBack, wheelFront };
}

/** Common addon flags. Wagon components gate addon rendering off these. */
export interface WagonAddons {
  driver?: boolean;
  /** Number of water kegs (0–2). Bound to the wagon model, not inventory. */
  kegs?: number;
  /** Number of chickens; if > 0, a coop is rendered. */
  coop?: number;
}
