// landmark-art-frame.jsx
// Shared chrome for all landmark artworks: paper grain, watercolor edges,
// vignette, and a consistent SVG viewport. Each landmark art component
// fills the inner <g> of a LandmarkArtFrame.
//
// Period-engraving / watercolor vibe:
//   • warm parchment ground (varies by panel theme)
//   • soft fractalNoise overlay (paper grain)
//   • subtle blur+threshold edge for watercolor bleed on dark inks
//   • black ink linework, restrained palette
//
// The frame is sized to drop into the LandmarkStage `art-placeholder`:
// flex: 1, min-height: 60px, dashed border. Our SVG fills 100% of that
// container and uses preserveAspectRatio="xMidYMid slice" so it crops
// gracefully at narrow widths.

const LMK_VIEW_W = 480;
const LMK_VIEW_H = 200;

// Period palette — desaturated, warm. Used by all landmark art.
const LMK = {
  // sky / parchment grounds (per theme)
  parchment:    "#e8d9b8",
  parchmentSh:  "#cfbe98",   // shadow side of parchment
  paperWarm:    "#f0deb6",
  paperCool:    "#dfdfd0",   // for HBC / cooler posts
  paperGold:    "#f5e4b6",   // for end-of-trail
  // ink + earth
  ink:          "#2a1a08",
  inkSoft:      "#4a3320",
  earth:        "#8a6a3a",
  earthDark:    "#5a3a1a",
  earthLight:   "#b89a6a",
  // greens
  sage:         "#7a8458",
  sageDark:     "#4a5638",
  sageLight:    "#a3a878",
  // blues (sky / water)
  skyHi:        "#cfd8d0",
  skyLo:        "#e2d8b8",
  water:        "#7a96a0",
  // accents
  rust:         "#a83a18",
  brick:        "#8a4a28",
  white:        "#f0e6c8",
  redFlag:      "#a8281a",
};

// ── Filter defs — drop one of these into <defs> and reference by id ──
function LandmarkFilters({ id = "lmk" }) {
  return (
    <defs>
      {/* Paper grain — fractalNoise screened over content */}
      <filter id={`${id}-grain`} x="0%" y="0%" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
        <feColorMatrix values="0 0 0 0 0.18  0 0 0 0 0.12  0 0 0 0 0.06  0 0 0 0.18 0" />
        <feComposite in2="SourceGraphic" operator="in" />
      </filter>
      {/* Watercolor bleed — slight blur + displacement on dark linework */}
      <filter id={`${id}-bleed`} x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="5" result="t" />
        <feDisplacementMap in="SourceGraphic" in2="t" scale="1.4" />
      </filter>
      {/* Soft hatching pattern — for ground shadows */}
      <pattern id={`${id}-hatch`} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="3" stroke={LMK.ink} strokeWidth="0.4" opacity="0.5" />
      </pattern>
      {/* Diffuse sun glow */}
      <radialGradient id={`${id}-sunglow`} cx="80%" cy="22%" r="50%">
        <stop offset="0%" stopColor="#f6e9c0" stopOpacity="0.65" />
        <stop offset="40%" stopColor="#f6e9c0" stopOpacity="0.18" />
        <stop offset="100%" stopColor="#f6e9c0" stopOpacity="0" />
      </radialGradient>
      {/* Vignette — darkens edges */}
      <radialGradient id={`${id}-vignette`} cx="50%" cy="50%" r="65%">
        <stop offset="60%" stopColor="rgba(0,0,0,0)" />
        <stop offset="100%" stopColor="rgba(40,20,8,0.35)" />
      </radialGradient>
    </defs>
  );
}

// ── Shared paper background — used by every landmark ──
function PaperGround({ tone = "warm", filterId = "lmk" }) {
  const base =
    tone === "cool" ? LMK.paperCool :
    tone === "gold" ? LMK.paperGold :
    LMK.paperWarm;
  const sky =
    tone === "cool" ? "#dde2d8" :
    tone === "gold" ? "#f4e0b0" :
    "#e8d6a8";
  return (
    <g>
      {/* sky band — softer, lighter */}
      <rect x="0" y="0" width={LMK_VIEW_W} height={LMK_VIEW_H * 0.62} fill={sky} />
      {/* ground band — warmer earth */}
      <rect x="0" y={LMK_VIEW_H * 0.62} width={LMK_VIEW_W} height={LMK_VIEW_H * 0.38} fill={base} />
      {/* sun glow */}
      <rect x="0" y="0" width={LMK_VIEW_W} height={LMK_VIEW_H} fill={`url(#${filterId}-sunglow)`} />
    </g>
  );
}

// ── Paper grain overlay — drop on top of everything ──
function PaperGrain({ filterId = "lmk", opacity = 0.5 }) {
  return (
    <rect
      x="0" y="0" width={LMK_VIEW_W} height={LMK_VIEW_H}
      fill="black"
      filter={`url(#${filterId}-grain)`}
      opacity={opacity}
      pointerEvents="none"
    />
  );
}

// ── Vignette overlay ──
function Vignette({ filterId = "lmk" }) {
  return (
    <rect
      x="0" y="0" width={LMK_VIEW_W} height={LMK_VIEW_H}
      fill={`url(#${filterId}-vignette)`}
      pointerEvents="none"
    />
  );
}

// ── LandmarkArtFrame — outer wrapper. Children render inside the SVG
// after the paper background and before the grain/vignette overlays. ──
function LandmarkArtFrame({
  tone = "warm",
  filterId = "lmk",
  abandoned = false,
  children,
}) {
  return (
    <div style={{
      width: "100%", height: "100%", minHeight: 0, position: "relative",
      borderRadius: 2, overflow: "hidden",
      filter: abandoned ? "saturate(0.35) brightness(0.92)" : "none",
    }}>
      <svg
        viewBox={`0 0 ${LMK_VIEW_W} ${LMK_VIEW_H}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <LandmarkFilters id={filterId} />
        <PaperGround tone={tone} filterId={filterId} />
        {children}
        <PaperGrain filterId={filterId} />
        <Vignette filterId={filterId} />
      </svg>
    </div>
  );
}

Object.assign(window, {
  LMK, LMK_VIEW_W, LMK_VIEW_H,
  LandmarkFilters, PaperGround, PaperGrain, Vignette, LandmarkArtFrame,
});
