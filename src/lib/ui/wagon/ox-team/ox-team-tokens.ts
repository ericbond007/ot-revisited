// Ox-team illustration palette — local hex constants, not promoted
// to CSS vars. Pied red-and-white to match historical working oxen
// (American milking shorthorn / Devon types — what most emigrants
// drove). Mule variant uses a single grey-brown for the body and
// distinct ear/snout palette.
//
// Refreshed 2026-04-26 from the new travel-scene handoff (#158): ink
// shifted to match wagon ink, added sun/shadow body shades + pole
// wood, leaner pied palette overall.

// Pied ox.
export const OX_INK        = '#3a1a08';   // outline + key shadows (matches wagon ink)
export const OX_RED        = '#8a3a18';   // primary red ("rust" in palette)
export const OX_RED_LT     = '#a85428';   // sun-side highlight
export const OX_RED_DK     = '#5a2410';   // shadow-side
export const OX_WHITE      = '#efe4c8';   // pied white (parchment-tinted)
export const OX_WHITE_SH   = '#cbbb95';   // white shadow
export const OX_HORN       = '#d8c49a';   // horn keratin
export const OX_HORN_TIP   = '#2a1004';   // dark horn tip + outline
export const OX_PINK       = '#c0907a';   // muzzle
export const OX_HOOF       = '#1a0a04';   // dark hoof tips

// Mule (kept from prior design — new handoff doesn't include a mule
// variant, so the existing fallback rendering still owns these).
export const MULE_BODY      = '#7a6248';
export const MULE_BODY_DARK = '#5a4830';
export const MULE_BELLY     = '#9a8a70';
export const MULE_MANE      = '#3a2a1a';

// Yoke and tackle.
export const YOKE_WOOD      = '#8a5a2a';   // matches wagon wood
export const YOKE_DARK      = '#5a3a1a';
export const CHAIN_INK      = '#2a1a08';
export const POLE_WOOD      = '#7a4a20';

// Animation tunables.
/** Spacing between successive pairs along the team (ox-local units).
 *  Bumped 22 → 24 in the new handoff to give pairs more breathing room
 *  as the per-pair lockstep was reduced (see PAIR_PHASE_OFFSET). */
export const PAIR_SPACE = 24;
/** Per-pair gait phase offset so trailing pairs walk slightly out of
 *  step. Reduced 0.13 → 0.05 in the new handoff — the prior offset was
 *  too desynced and broke the "yoked together" read. */
export const PAIR_PHASE_OFFSET = 0.05;
/** Maximum leg-swing angle in degrees (mule fallback only — new ox
 *  legs use their own internal `baseSwing` constant). */
export const LEG_SWING_DEG = 22;
/** Within-pair lateral offset — the "far" ox sits slightly back+up
 *  so the two animals read as a pair, not stacked. */
export const FAR_OX_DX = 1.5;
export const FAR_OX_DY = -0.6;
