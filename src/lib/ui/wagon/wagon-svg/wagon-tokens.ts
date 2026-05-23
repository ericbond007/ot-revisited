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
  /** Dev-only: swap the SVG driver for the Blender-rendered cowboy PNG. */
  useBlenderDriver?: boolean;
  /** Dev-only: swap the SVG/FLUX wagon body for the Blender-rendered
   *  prairie-schooner body PNG with animated wheel frame overlays. */
  useBlenderBody?: boolean;
  /** Dev-only: swap the per-ox SingleOx composer for an animated team
   *  PNG cycling through Blender-rendered ox-team-frames. */
  useBlenderTeam?: boolean;
  /** Dev-only: hide the wheel-frame overlay so the body PNG is shown
   *  alone (used to debug wheel-residue baked into the body render). */
  showWheels?: boolean;
  /** Dev-only: hide the SVG ground-shadow ellipse under the wagon. */
  showGroundShadow?: boolean;
  /** Dev-only: nudge the driver in wagon-local SVG units. */
  driverDx?: number;
  driverDy?: number;
  /** Dev-only: scale factor for the Blender driver sprite. 1 = default. */
  driverScale?: number;
  /** Number of water kegs (0–2). Bound to the wagon model, not inventory. */
  kegs?: number;
  /** Number of chickens; if > 0, a coop is rendered. */
  coop?: number;
  /**
   * If > 0, a covered milk pail is slung beneath the wagon between the
   * axles (period-correct wagon-churned butter). See doc 08 §5.
   */
  butterChurn?: number;
  /**
   * If > 0, a milk cow (or small cluster of cows) is rendered tied
   * behind the wagon. The cow figure itself is a placeholder until a
   * dedicated MilkCow.svelte exists; the wagon component just exposes
   * the anchor coords here.
   */
  milkCow?: number;
  /**
   * If true, the bed is rendered painted (Colonial Blue 1840s schooner).
   * Default false = bare unfinished wood (also period-correct, many
   * wagons left unpainted to save weight + cost).
   */
  painted?: boolean;
  /**
   * If false, suppresses the rear-axle tar bucket. Defaults true: every
   * operational wagon carried one. Provided as an override (e.g. for a
   * "broke down" silhouette).
   */
  tarBucket?: boolean;
}
