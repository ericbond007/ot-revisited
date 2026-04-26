// Ox-team illustration palette — local hex constants, not promoted
// to CSS vars. Pied red-and-white to match historical working oxen
// (American milking shorthorn / Devon types — what most emigrants
// drove). Mule variant uses a single grey-brown for the body and
// distinct ear/snout palette.

// Pied ox.
export const OX_RED        = '#8a3a18';   // back patches
export const OX_WHITE      = '#efe4c8';   // belly, face blaze
export const OX_RED_DARK   = '#5a2810';   // shadow on red areas
export const OX_HOOF       = '#2a1408';   // dark hoof tips
export const OX_HORN       = '#c8a878';   // horn ivory
export const OX_HORN_TIP   = '#5a3818';   // dark horn tip + outline
export const OX_INK        = '#1a0e04';   // outline + key shadows

// Mule.
export const MULE_BODY      = '#7a6248';
export const MULE_BODY_DARK = '#5a4830';
export const MULE_BELLY     = '#9a8a70';
export const MULE_MANE      = '#3a2a1a';

// Yoke and tackle.
export const YOKE_WOOD      = '#7a5a2a';
export const YOKE_WOOD_DARK = '#3a2818';
export const CHAIN_IRON     = '#1a0e04';
export const CHAIN_HIGHLIGHT = '#5a4838';

// Animation tunables.
/** Spacing between successive pairs along the team (ox-local units). */
export const PAIR_SPACE = 22;
/** Per-pair gait phase offset so trailing pairs walk slightly out of
 *  step. Brief specifies +0.13. */
export const PAIR_PHASE_OFFSET = 0.13;
/** Maximum leg-swing angle in degrees. */
export const LEG_SWING_DEG = 22;
/** Within-pair lateral offset — the "far" ox sits slightly back+up
 *  so the two animals read as a pair, not stacked. */
export const FAR_OX_DX = 1.5;
export const FAR_OX_DY = -0.4;
