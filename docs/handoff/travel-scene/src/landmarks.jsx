// landmarks.jsx — distant landmark silhouettes that appear on the horizon
// as the wagon approaches. From the actual game's LANDMARKS list.
//
// Each landmark has: id, label, terrain it lives in, and a render function
// that draws its silhouette at a given (x, baseY).
//
// They're rendered ABOVE the FarLayer but BEHIND the MidLayer — distant but
// recognizable.

const LANDMARK_INK = "#3a2818";
const LANDMARK_FILL = "#5a4a3a";
const LANDMARK_LIGHT = "#7a6a4a";

// ── Chimney Rock — distinctive spire on a conical base ──
function ChimneyRock({ x, baseY, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${baseY}) scale(${scale})`}>
      {/* low conical mound base */}
      <path d="M -34 0 L -22 -12 L 22 -12 L 34 0 Z"
            fill={LANDMARK_FILL} stroke={LANDMARK_INK} strokeWidth="0.6" />
      {/* spire — wider so it doesn't read as lollipop stem */}
      <path d="M -6 -12 L -4 -38 L 4 -38 L 6 -12 Z"
            fill={LANDMARK_LIGHT} stroke={LANDMARK_INK} strokeWidth="0.6" />
      {/* spire shadow side */}
      <path d="M -6 -12 L -4 -38 L 0 -38 L 0 -12 Z" fill={LANDMARK_FILL} opacity="0.7" />
    </g>
  );
}

// ── Courthouse & Jail Rocks — pair of squarish bluffs ──
function CourthouseRock({ x, baseY, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${baseY}) scale(${scale})`}>
      {/* main mass */}
      <path d="M -38 0 L -32 -28 L -20 -34 L 8 -34 L 20 -30 L 28 -22 L 38 -18 L 42 0 Z"
            fill={LANDMARK_FILL} stroke={LANDMARK_INK} strokeWidth="0.6" />
      {/* second smaller mass to right (jail rock) */}
      <path d="M 36 -8 L 42 -22 L 56 -22 L 60 -10 L 60 0 L 36 0 Z"
            fill={LANDMARK_LIGHT} stroke={LANDMARK_INK} strokeWidth="0.6" />
      {/* strata lines */}
      <path d="M -32 -22 L 8 -22 M -28 -14 L 30 -14"
            stroke={LANDMARK_INK} strokeWidth="0.3" fill="none" opacity="0.5" />
    </g>
  );
}

// ── Scotts Bluff — long ridgeline with castle-like crenellations ──
function ScottsBluff({ x, baseY, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${baseY}) scale(${scale})`}>
      <path d="M -60 0 L -52 -18 L -40 -22 L -28 -32 L -10 -36 L 12 -38 L 30 -32 L 48 -28 L 60 -22 L 68 -10 L 68 0 Z"
            fill={LANDMARK_FILL} stroke={LANDMARK_INK} strokeWidth="0.6" />
      <path d="M -28 -32 L -22 -38 L -16 -36 M 8 -38 L 14 -42 L 22 -38"
            fill={LANDMARK_LIGHT} stroke={LANDMARK_INK} strokeWidth="0.5" />
      <path d="M -50 -16 L 60 -16" stroke={LANDMARK_INK} strokeWidth="0.3" opacity="0.5" />
    </g>
  );
}

// ── Independence Rock — low dome ──
function IndependenceRock({ x, baseY, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${baseY}) scale(${scale})`}>
      <path d="M -42 0 C -42 -16, -28 -26, 0 -26 C 28 -26, 42 -16, 42 0 Z"
            fill={LANDMARK_FILL} stroke={LANDMARK_INK} strokeWidth="0.6" />
      <path d="M -32 -8 C -20 -14, 20 -14, 32 -8" stroke={LANDMARK_INK} strokeWidth="0.3" fill="none" opacity="0.5" />
    </g>
  );
}

// ── Fort silhouette — palisade walls, flag, gate (for Kearny / Laramie / Hall / Boise / Bridger) ──
function Fort({ x, baseY, scale = 1, label = "Fort" }) {
  return (
    <g transform={`translate(${x} ${baseY}) scale(${scale})`}>
      {/* palisade base */}
      <rect x="-30" y="-14" width="60" height="14" fill="#7a5a3a" stroke={LANDMARK_INK} strokeWidth="0.6" />
      {/* picket spikes */}
      <g stroke={LANDMARK_INK} strokeWidth="0.3" fill="#7a5a3a">
        {Array.from({length: 12}, (_, i) => {
          const x = -30 + i * 5;
          return <path key={i} d={`M ${x} -14 l 2.5 -3 l 2.5 3 z`} fill="#7a5a3a" />;
        })}
      </g>
      {/* corner blockhouses */}
      <rect x="-32" y="-18" width="6" height="18" fill="#6a4a2a" stroke={LANDMARK_INK} strokeWidth="0.5" />
      <rect x="26" y="-18" width="6" height="18" fill="#6a4a2a" stroke={LANDMARK_INK} strokeWidth="0.5" />
      {/* flag pole + flag */}
      <line x1="0" y1="-14" x2="0" y2="-26" stroke={LANDMARK_INK} strokeWidth="0.5" />
      <path d="M 0 -26 L 8 -24 L 8 -22 L 0 -20 Z" fill="#a83a2a" stroke={LANDMARK_INK} strokeWidth="0.3" />
      {/* gate */}
      <rect x="-3" y="-10" width="6" height="10" fill="#3a2818" />
    </g>
  );
}

// ── Mountain pass / South Pass — broad saddle between two peaks ──
function MountainPass({ x, baseY, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${baseY}) scale(${scale})`}>
      <path d="M -70 0 L -50 -32 L -30 -20 L -10 -42 L 10 -40 L 30 -22 L 50 -34 L 70 0 Z"
            fill="#6a7a8a" stroke={LANDMARK_INK} strokeWidth="0.6" />
      <path d="M -52 -28 L -50 -32 L -48 -28 M 8 -36 L 10 -42 L 12 -36 M 48 -30 L 50 -34 L 52 -30"
            fill="#e8e8f0" />
    </g>
  );
}

// ── River crossing landmark — wagons forded; mark with a ferry/post ──
function FerryPost({ x, baseY, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${baseY}) scale(${scale})`}>
      {/* posts */}
      <rect x="-12" y="-18" width="2" height="18" fill="#3a2818" />
      <rect x="10" y="-18" width="2" height="18" fill="#3a2818" />
      {/* sign */}
      <rect x="-14" y="-22" width="28" height="6" fill="#a8884a" stroke={LANDMARK_INK} strokeWidth="0.4" />
      {/* ferry rope */}
      <line x1="-11" y1="-16" x2="11" y2="-16" stroke="#3a2818" strokeWidth="0.4" />
    </g>
  );
}

// ── Generic distant tree clump — for forest landmarks ──
function TreeClump({ x, baseY, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${baseY}) scale(${scale})`}>
      <path d="M -16 0 L -14 -18 L -8 -22 L 0 -28 L 8 -22 L 14 -18 L 16 0 Z"
            fill="#3a4a3a" stroke={LANDMARK_INK} strokeWidth="0.5" />
      <path d="M -2 0 L -2 -10 L 2 -10 L 2 0" fill="#3a2818" />
    </g>
  );
}

// ── Trail-end: Willamette Valley arch / sign ──
function ValleyArch({ x, baseY, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${baseY}) scale(${scale})`}>
      {/* arch posts */}
      <rect x="-22" y="-30" width="4" height="30" fill="#5a3a1a" stroke={LANDMARK_INK} strokeWidth="0.4" />
      <rect x="18" y="-30" width="4" height="30" fill="#5a3a1a" stroke={LANDMARK_INK} strokeWidth="0.4" />
      {/* crossbeam */}
      <rect x="-26" y="-34" width="52" height="6" fill="#7a5a2a" stroke={LANDMARK_INK} strokeWidth="0.4" />
      {/* hanging sign */}
      <rect x="-14" y="-26" width="28" height="10" fill="#c8a868" stroke={LANDMARK_INK} strokeWidth="0.4" />
      {/* trees flanking */}
      <path d="M -36 0 L -34 -16 L -28 -20 L -22 -16 L -20 0 Z" fill="#3a4a3a" stroke={LANDMARK_INK} strokeWidth="0.4" />
      <path d="M 20 0 L 22 -16 L 28 -20 L 34 -16 L 36 0 Z" fill="#3a4a3a" stroke={LANDMARK_INK} strokeWidth="0.4" />
    </g>
  );
}

// ── Landmark catalog — keyed to terrain biomes ──
const LANDMARK_CATALOG = {
  prairie:   [ChimneyRock, CourthouseRock, Fort],
  mountains: [MountainPass, ScottsBluff, IndependenceRock],
  forest:    [TreeClump, Fort, ValleyArch],
  desert:    [IndependenceRock, FerryPost, ScottsBluff],
  river:     [FerryPost, Fort, TreeClump],
};

// ── DistantLandmark — picks one from the terrain's catalog by index ──
function DistantLandmark({ terrain, index = 0, x, baseY, scale = 1 }) {
  const list = LANDMARK_CATALOG[terrain] ?? LANDMARK_CATALOG.prairie;
  const Icon = list[index % list.length];
  return <Icon x={x} baseY={baseY} scale={scale} />;
}

// ── LandmarkLayer — multiple landmarks drifting at parallax slower than mid ──
function LandmarkLayer({ terrain, scrollX, w, horizonY, groundY }) {
  const x = -((scrollX * 0.25) % 1200);
  const list = LANDMARK_CATALOG[terrain] ?? LANDMARK_CATALOG.prairie;
  // Landmarks sit ON the horizon line so they look distant.
  const baseY = horizonY + 8;
  // Place 2 landmarks per 1200-px tile, well-spaced
  const tile = (offset) => {
    const tx = x + offset;
    return (
      <g key={offset} opacity="0.55">
        <g transform={`translate(${tx + 280} 0)`}>
          <DistantLandmark terrain={terrain} index={0} x={0} baseY={baseY} scale={0.55} />
        </g>
        <g transform={`translate(${tx + 820} 0)`}>
          <DistantLandmark terrain={terrain} index={1} x={0} baseY={baseY + 2} scale={0.45} />
        </g>
      </g>
    );
  };
  return <g>{[0, 1200, 2400].map(tile)}</g>;
}

// expose
Object.assign(window, {
  ChimneyRock, CourthouseRock, ScottsBluff, IndependenceRock,
  Fort, MountainPass, FerryPost, TreeClump, ValleyArch,
  DistantLandmark, LandmarkLayer, LANDMARK_CATALOG,
});
