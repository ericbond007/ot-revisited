/* global React */

// ============================================================================
// LANDMARK ICONS — base primitives & palette
// ============================================================================
// All 38 landmark icons are 24×24 viewBox watercolor SVGs.
// Two families:
//   STOPS      — circular hybrid badge (W_HybridBadge) around bespoke art
//   PASS-BYS   — bare silhouette on parchment, no badge
// Palette and badge primitive lifted from grouping-watercolor.jsx so the
// final set sits in the same visual register as the chosen direction.
// ============================================================================

const LI = {
  ink:        "#2a1a08",
  inkSoft:    "#4a3320",
  rust:       "#a83a18",
  rustDark:   "#7a2a10",
  earth:      "#8a6a3a",
  earthLight: "#b89a6a",
  paperWarm:  "#f0deb6",
  parchment:  "#e8d9b8",
  parchCool:  "#dfe2d8",
  parchGold:  "#f5e4b6",
  sage:       "#7a8458",
  sageDark:   "#4a5a38",
  water:      "#7a96a0",
  waterDark:  "#5a7080",
  redFlag:    "#a8281a",
  navyFlag:   "#1a3a6a",
  greenFlag:  "#2a5a3a",
  white:      "#f0e6c8",
  brick:      "#8a4a28",
  brickDark:  "#5a2a18",
  goldFlag:   "#c9a04a",
  bone:       "#d8c8a0",
  shadow:     "rgba(42, 26, 8, 0.22)",
};

// ── BADGE ─────────────────────────────────────────────────────────────────
// Tones: warm (default parchment), cool (river/HBC), gold (end-of-trail/start)
function HybridBadge({ children, tone = "warm", id = "hb" }) {
  const fill =
    tone === "cool" ? LI.parchCool :
    tone === "gold" ? LI.parchGold :
    LI.parchment;
  const cid = `${id}-${Math.random().toString(36).slice(2, 7)}`;
  return (
    <g>
      <defs>
        <clipPath id={cid}>
          <circle cx="12" cy="12" r="10.5" />
        </clipPath>
      </defs>
      <circle cx="12" cy="12" r="11" fill={fill} stroke={LI.ink} strokeWidth="1.1" />
      <g clipPath={`url(#${cid})`}>
        <rect x="1" y="1" width="22" height="11" fill={LI.paperWarm} opacity="0.55" />
        <rect x="1" y="12" width="22" height="11" fill={fill} opacity="0.7" />
        {children}
      </g>
      <circle cx="12" cy="12" r="10" fill="none" stroke={LI.ink} strokeWidth="0.4" opacity="0.6" />
    </g>
  );
}

// ── Wrap helper for any svg child set: <Icon size={32}><Comp/></Icon>
function Icon({ size = 24, children }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ display: "block" }}>
      {children}
    </svg>
  );
}

Object.assign(window, { LI, HybridBadge, Icon });
