/* global React */

// ============================================================================
// STAT ICONS — 8 glyphs replacing emoji in ICON.stats
// ============================================================================
// All 8 stat icons are 24×24 viewBox watercolor SVGs designed for 16-px
// inline rendering beside typography (top-bar readout, party-row mini).
// Same wash + ink vocabulary as the landmark icons.
//
// Three glyphs preserve the silhouette of existing OT.IO art:
//   PACE     — simplified from OxHead in explorations/travel-scene/ox-team.jsx
//   RATIONS  — drumstick matching 🍖 emoji directly
//   CASH     — folded notes matching 💵 emoji
//
// The other five are drawn fresh in the same register.
// ============================================================================

const SI = {
  ink:        "#2a1a08",
  paperWarm:  "#efe4c8",
  parchment:  "#e8d9b8",
  rust:       "#c96a2a",
  rustDeep:   "#a85a3a",
  meat:       "#a85a3a",
  meatLight:  "#c96a2a",
  bone:       "#efe4c8",
  pied:       "#a85a3a",
  hide:       "#efe4c8",
  hornCream:  "#d8c49a",
  sun:        "#f0c658",
  woodAccent: "#8a3a1a",
  squeeze:    "#e8c89a",
  heart:      "#c94a2a",
  highlight:  "#f0deb6",
  sage:       "#7a8a4a",
  sageDeep:   "#5a6a3a",
  river:      "#4a8bc9",
  riverDeep:  "#2a5a8a",
  muzzle:     "#c0907a",
  pipedEar:   "#b8845a",
};

// ── DAY — sun w/ 8 rays ────────────────────────────────────────────────────
export function DayIcon({ size = 16, title }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role={title ? "img" : "presentation"}>
      {title && <title>{title}</title>}
      <circle cx="12" cy="12" r="4.4" fill={SI.sun} opacity="0.92" />
      <circle cx="12" cy="12" r="4.4" fill="none" stroke={SI.ink} strokeWidth="1.1" />
      <g stroke={SI.ink} strokeWidth="1.4" strokeLinecap="round">
        <line x1="12" y1="3" x2="12" y2="6" />
        <line x1="12" y1="18" x2="12" y2="21" />
        <line x1="3" y1="12" x2="6" y2="12" />
        <line x1="18" y1="12" x2="21" y2="12" />
        <line x1="5.6" y1="5.6" x2="7.5" y2="7.5" />
        <line x1="16.5" y1="16.5" x2="18.4" y2="18.4" />
        <line x1="5.6" y1="18.4" x2="7.5" y2="16.5" />
        <line x1="16.5" y1="7.5" x2="18.4" y2="5.6" />
      </g>
    </svg>
  );
}

// ── DATE — calendar w/ rust today-dot ──────────────────────────────────────
export function DateIcon({ size = 16, title }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role={title ? "img" : "presentation"}>
      {title && <title>{title}</title>}
      <rect x="4" y="6" width="16" height="14" rx="1" fill={SI.parchment} />
      <rect x="4" y="6" width="16" height="3.5" fill={SI.rust} opacity="0.85" />
      <rect x="4" y="6" width="16" height="14" rx="1" fill="none" stroke={SI.ink} strokeWidth="1.1" />
      <line x1="4" y1="9.5" x2="20" y2="9.5" stroke={SI.ink} strokeWidth="1" />
      <line x1="8" y1="3.5" x2="8" y2="7.5" stroke={SI.ink} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="16" y1="3.5" x2="16" y2="7.5" stroke={SI.ink} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8"  cy="13" r="0.7" fill={SI.ink} />
      <circle cx="12" cy="13" r="0.7" fill={SI.ink} />
      <circle cx="16" cy="13" r="0.7" fill={SI.ink} />
      <circle cx="8"  cy="17" r="0.7" fill={SI.ink} />
      <circle cx="12" cy="17" r="1.3" fill={SI.rust} />
      <circle cx="12" cy="17" r="1.3" fill="none" stroke={SI.ink} strokeWidth="0.6" />
    </svg>
  );
}

// ── PACE — ox head, simplified from OxHead ────────────────────────────────
// Long flat profile facing left, single forward-curving horn, big leaf ear,
// pied rust crown patch over cream body, cream muzzle.
export function PaceIcon({ size = 16, title }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role={title ? "img" : "presentation"}>
      {title && <title>{title}</title>}
      {/* ear (back) */}
      <path d="M 16 7.5 Q 19 7 19.5 9.5 Q 19 11 17 10.5 Z" fill={SI.pipedEar} opacity="0.9" />
      <path d="M 16 7.5 Q 19 7 19.5 9.5 Q 19 11 17 10.5 Z" fill="none" stroke={SI.ink} strokeWidth="0.9" strokeLinejoin="round" />
      {/* head silhouette */}
      <path d="M 17 7  Q 16 6 14 6.5  Q 11 7 8 8.5  Q 5 10 4 12  Q 4 13.5 5 14  L 7 14.5  Q 8 16 10 16.5  Q 13 17 15 16.5  Q 17 16 17.5 14.5  Q 18 13 17.8 11  Q 17.5 9 17 7 Z" fill={SI.hide} />
      {/* pied rust crown patch */}
      <path d="M 17 7  Q 16 6 14 6.5  Q 11 7 8.5 8  Q 8 9 9 10  Q 12 9.5 15 10  Q 17 10.5 17.8 11  Q 17.5 9 17 7 Z" fill={SI.pied} opacity="0.9" />
      {/* head ink outline */}
      <path d="M 17 7  Q 16 6 14 6.5  Q 11 7 8 8.5  Q 5 10 4 12  Q 4 13.5 5 14  L 7 14.5  Q 8 16 10 16.5  Q 13 17 15 16.5  Q 17 16 17.5 14.5  Q 18 13 17.8 11  Q 17.5 9 17 7 Z" fill="none" stroke={SI.ink} strokeWidth="1.1" strokeLinejoin="round" />
      {/* crown patch ink edge */}
      <path d="M 8.5 8.2 Q 12 9 17.5 10.6" fill="none" stroke={SI.ink} strokeWidth="0.7" opacity="0.75" />
      {/* muzzle */}
      <path d="M 4 12  Q 4 13.5 5 14  L 7 14.5  Q 7.5 13.5 7 12.5  Q 5.5 12 4 12 Z" fill={SI.muzzle} />
      <path d="M 4 12  Q 4 13.5 5 14  L 7 14.5  Q 7.5 13.5 7 12.5  Q 5.5 12 4 12 Z" fill="none" stroke={SI.ink} strokeWidth="0.9" strokeLinejoin="round" />
      <ellipse cx="5.4" cy="13.2" rx="0.5" ry="0.35" fill={SI.ink} />
      <ellipse cx="9" cy="11.4" rx="0.5" ry="0.4" fill={SI.ink} />
      {/* horn — forward-and-up curve */}
      <path d="M 16.5 6.8  Q 14.5 5.5 13.2 4.2" fill="none" stroke={SI.hornCream} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M 16.5 6.8  Q 14.5 5.5 13.2 4.2" fill="none" stroke={SI.ink} strokeWidth="0.6" strokeLinecap="round" opacity="0.6" />
      <circle cx="13.1" cy="4.1" r="0.35" fill="#2a1004" />
    </svg>
  );
}

// ── RATIONS — drumstick (matches 🍖 emoji directly) ────────────────────────
export function RationsIcon({ size = 16, title }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role={title ? "img" : "presentation"}>
      {title && <title>{title}</title>}
      {/* meat ball */}
      <circle cx="15.5" cy="15.5" r="5.2" fill={SI.meat} opacity="0.95" />
      <ellipse cx="14" cy="14" rx="2.4" ry="1.8" fill={SI.meatLight} opacity="0.55" transform="rotate(-30 14 14)" />
      <circle cx="15.5" cy="15.5" r="5.2" fill="none" stroke={SI.ink} strokeWidth="1.1" />
      {/* bone shaft */}
      <path d="M 11.5 12 L 6 6.5 L 4.5 8 L 9.5 14 Z" fill={SI.bone} />
      <path d="M 11.5 12 L 6 6.5 L 4.5 8 L 9.5 14 Z" fill="none" stroke={SI.ink} strokeWidth="1.1" strokeLinejoin="round" />
      {/* bone knob — double lobe */}
      <circle cx="5.2" cy="5.6" r="1.6" fill={SI.bone} />
      <circle cx="3.8" cy="7"   r="1.6" fill={SI.bone} />
      <circle cx="5.2" cy="5.6" r="1.6" fill="none" stroke={SI.ink} strokeWidth="1.1" />
      <circle cx="3.8" cy="7"   r="1.6" fill="none" stroke={SI.ink} strokeWidth="1.1" />
      {/* meat-meets-bone seam */}
      <path d="M 10.2 12.6 Q 11.5 13 12 14" fill="none" stroke={SI.ink} strokeWidth="0.6" opacity="0.5" />
      <line x1="5.5" y1="7.5" x2="10.5" y2="13" stroke={SI.ink} strokeWidth="0.5" opacity="0.3" />
    </svg>
  );
}

// ── MORALE — concertina (period-correct 1840s instrument) ──────────────────
export function MoraleIcon({ size = 16, title }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role={title ? "img" : "presentation"}>
      {title && <title>{title}</title>}
      {/* bellows */}
      <path d="M 9 7.5 Q 12 6.5 15 7.5 L 15 16.5 Q 12 17.5 9 16.5 Z" fill={SI.squeeze} />
      <path d="M 9 7.5 Q 12 6.5 15 7.5 L 15 16.5 Q 12 17.5 9 16.5 Z" fill="none" stroke={SI.ink} strokeWidth="1.1" strokeLinejoin="round" />
      {/* side boxes */}
      <path d="M 5 9 L 9 7 L 9 17 L 5 15 Z" fill={SI.woodAccent} opacity="0.92" />
      <path d="M 5 9 L 9 7 L 9 17 L 5 15 Z" fill="none" stroke={SI.ink} strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M 19 9 L 15 7 L 15 17 L 19 15 Z" fill={SI.woodAccent} opacity="0.92" />
      <path d="M 19 9 L 15 7 L 15 17 L 19 15 Z" fill="none" stroke={SI.ink} strokeWidth="1.1" strokeLinejoin="round" />
      {/* bellows folds */}
      <line x1="11" y1="9" x2="11" y2="15" stroke={SI.ink} strokeWidth="0.6" />
      <line x1="13" y1="9" x2="13" y2="15" stroke={SI.ink} strokeWidth="0.6" />
      {/* buttons */}
      <circle cx="6.6"  cy="10.6" r="0.55" fill={SI.squeeze} />
      <circle cx="6.6"  cy="13"   r="0.55" fill={SI.squeeze} />
      <circle cx="17.4" cy="10.6" r="0.55" fill={SI.squeeze} />
      <circle cx="17.4" cy="13"   r="0.55" fill={SI.squeeze} />
    </svg>
  );
}

// ── HEALTH — heart ─────────────────────────────────────────────────────────
export function HealthIcon({ size = 16, title }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role={title ? "img" : "presentation"}>
      {title && <title>{title}</title>}
      <path d="M 12 20.5 C 4 14 4 6.5 8 4.5 C 10 3.5 12 5.5 12 6.5 C 12 5.5 14 3.5 16 4.5 C 20 6.5 20 14 12 20.5 Z" fill={SI.heart} opacity="0.92" />
      <path d="M 9 7 Q 7.5 9 8.5 11.5" fill="none" stroke={SI.highlight} strokeWidth="0.9" opacity="0.6" strokeLinecap="round" />
      <path d="M 12 20.5 C 4 14 4 6.5 8 4.5 C 10 3.5 12 5.5 12 6.5 C 12 5.5 14 3.5 16 4.5 C 20 6.5 20 14 12 20.5 Z" fill="none" stroke={SI.ink} strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

// ── CASH — folded banknotes (matches 💵 emoji silhouette) ──────────────────
export function CashIcon({ size = 16, title }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role={title ? "img" : "presentation"}>
      {title && <title>{title}</title>}
      <rect x="4.5" y="9" width="16" height="9" rx="0.6" fill={SI.sageDeep} opacity="0.55" />
      <path d="M 3.5 8  L 19.5 7  L 20 16  L 4 17 Z" fill={SI.sage} opacity="0.95" />
      <path d="M 3.5 8  L 19.5 7  L 19.7 7.6  L 3.6 8.6 Z" fill={SI.sageDeep} opacity="0.7" />
      <path d="M 3.5 8  L 19.5 7  L 20 16  L 4 17 Z" fill="none" stroke={SI.ink} strokeWidth="1.1" strokeLinejoin="round" />
      <ellipse cx="11.7" cy="12" rx="3" ry="2" fill="none" stroke={SI.ink} strokeWidth="0.8" opacity="0.85" />
      <text x="11.7" y="13.2" textAnchor="middle" fontFamily="serif" fontWeight="700" fontSize="3.6" fill={SI.ink}>$</text>
      <circle cx="6"    cy="9.6"  r="0.7" fill="none" stroke={SI.ink} strokeWidth="0.5" />
      <circle cx="17.5" cy="14.5" r="0.7" fill="none" stroke={SI.ink} strokeWidth="0.5" />
    </svg>
  );
}

// ── WATER — droplet w/ depth wash ──────────────────────────────────────────
export function WaterIcon({ size = 16, title }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role={title ? "img" : "presentation"}>
      {title && <title>{title}</title>}
      <path d="M 12 3 C 12 3 5 11 5 16 C 5 19.5 8 22 12 22 C 16 22 19 19.5 19 16 C 19 11 12 3 12 3 Z" fill={SI.river} opacity="0.88" />
      <path d="M 7 14 Q 12 18 17 14 Q 17 19 12 21 Q 7 19 7 14 Z" fill={SI.riverDeep} opacity="0.4" />
      <path d="M 9 17 Q 9 19 11 19" stroke={SI.parchment} strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.85" />
      <path d="M 12 3 C 12 3 5 11 5 16 C 5 19.5 8 22 12 22 C 16 22 19 19.5 19 16 C 19 11 12 3 12 3 Z" fill="none" stroke={SI.ink} strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

// ── DISPATCHER ─────────────────────────────────────────────────────────────
// In Svelte, mirror this as StatIcon.svelte using whatever switch pattern
// LandmarkIcon.svelte uses. The kind keys must match these exactly.
export const STAT_ICON_KINDS = [
  "day", "date", "pace", "rations",
  "morale", "health", "cash", "water",
] as const;

export const STAT_ICONS = {
  day: DayIcon,
  date: DateIcon,
  pace: PaceIcon,
  rations: RationsIcon,
  morale: MoraleIcon,
  health: HealthIcon,
  cash: CashIcon,
  water: WaterIcon,
};
