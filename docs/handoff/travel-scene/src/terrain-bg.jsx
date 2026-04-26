// terrain-bg.jsx — parallax background layers per terrain biome.
// 3 layers: far (horizon silhouettes), mid (rolling hills/trees/dunes), near (foreground tufts/rocks).
// All draw in profile, painted style. `scrollX` shifts each layer at different rates for parallax.

const SKY = {
  prairie:   { day: ["#6da7d4", "#b3d4e8", "#d8e4ee"], dusk: ["#d4824a", "#e8a878", "#f3d4a0"], night: ["#1a1a3a", "#2a2a4a", "#3a3a5a"] },
  mountains: { day: ["#7a98b8", "#a8c0d4", "#cfd8e0"], dusk: ["#a86848", "#c89878", "#d8b8a0"], night: ["#1a1a30", "#2a2a40", "#3a3a50"] },
  forest:    { day: ["#5a8a7a", "#9ab8a8", "#c8d8d0"], dusk: ["#945830", "#b88060", "#d4a888"], night: ["#0f1a14", "#1a2a20", "#2a3a30"] },
  desert:    { day: ["#e8b878", "#d99e5a", "#b88450"], dusk: ["#c84818", "#e87838", "#f5a868"], night: ["#2a1a3a", "#3a2a4a", "#4a3a5a"] },
  river:     { day: ["#8aa8c8", "#b8c8d8", "#d8e0e8"], dusk: ["#8a6878", "#b8889a", "#d4a0b0"], night: ["#1a2a3a", "#2a3a4a", "#3a4a5a"] },
};

// Sky gradient as <linearGradient> defs
function SkyGradient({ id, terrain, timeOfDay }) {
  const stops = SKY[terrain]?.[timeOfDay] ?? SKY.prairie.day;
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={stops[0]} />
      <stop offset="60%" stopColor={stops[1]} />
      <stop offset="100%" stopColor={stops[2]} />
    </linearGradient>
  );
}

// ── Far layer: horizon silhouettes (mountains, distant tree line, dunes) ──
function FarLayer({ terrain, scrollX, w, horizonY }) {
  const x = -((scrollX * 0.15) % 600);
  const tile = (offset) => {
    const tx = x + offset;
    if (terrain === "mountains") {
      return (
        <g transform={`translate(${tx} ${horizonY})`} key={offset}>
          <path d="M 0 0 L 60 -34 L 100 -10 L 140 -42 L 200 -8 L 260 -28 L 320 -4 L 380 -36 L 460 -10 L 540 -32 L 600 0 Z"
                fill="#5a6a7a" stroke="#2a3a4a" strokeWidth="0.8" />
          {/* snowcaps */}
          <path d="M 130 -38 L 140 -42 L 150 -38 Z M 370 -32 L 380 -36 L 390 -32 Z M 530 -28 L 540 -32 L 550 -28 Z"
                fill="#e8e8f0" />
        </g>
      );
    }
    if (terrain === "forest") {
      return (
        <g transform={`translate(${tx} ${horizonY})`} key={offset}>
          {/* dense conifer ridge */}
          <path d="M 0 0 L 0 -12 L 600 -12 L 600 0 Z" fill="#2a3a28" />
          {Array.from({ length: 60 }).map((_, i) => (
            <path key={i} d={`M ${i * 10} -12 l 4 -8 l 4 8 Z`} fill="#1a2a18" />
          ))}
        </g>
      );
    }
    if (terrain === "desert") {
      return (
        <g transform={`translate(${tx} ${horizonY})`} key={offset}>
          {/* mesas */}
          <path d="M 0 0 L 0 -8 L 80 -8 L 80 -22 L 160 -22 L 160 -10 L 240 -10 L 240 -28 L 340 -28 L 340 -14 L 420 -14 L 420 -20 L 520 -20 L 520 -6 L 600 -6 L 600 0 Z"
                fill="#9a5838" stroke="#5a2818" strokeWidth="0.7" />
        </g>
      );
    }
    if (terrain === "river") {
      return (
        <g transform={`translate(${tx} ${horizonY})`} key={offset}>
          <path d="M 0 0 L 0 -10 Q 100 -16 200 -10 Q 300 -6 400 -12 Q 500 -16 600 -8 L 600 0 Z"
                fill="#6a8aa8" stroke="#3a5a78" strokeWidth="0.6" opacity="0.85" />
        </g>
      );
    }
    // prairie: gentle low hills
    return (
      <g transform={`translate(${tx} ${horizonY})`} key={offset}>
        <path d="M 0 0 Q 80 -6 160 -3 Q 240 -8 320 -2 Q 400 -7 480 -3 Q 560 -6 600 -1 L 600 0 Z"
              fill="#8a9a6a" stroke="#5a6a3a" strokeWidth="0.5" opacity="0.8" />
      </g>
    );
  };
  return <g>{[0, 600].map(tile)}</g>;
}

// ── Mid layer: rolling hills, mid trees, scattered objects ──
function MidLayer({ terrain, scrollX, w, horizonY, groundY }) {
  const x = -((scrollX * 0.4) % 400);
  const midY = horizonY + (groundY - horizonY) * 0.45;
  const tile = (offset) => {
    const tx = x + offset;
    if (terrain === "mountains") {
      return (
        <g transform={`translate(${tx} ${midY})`} key={offset}>
          <path d="M 0 0 Q 80 -20 160 -8 Q 240 -24 320 -10 Q 400 -22 400 0 L 0 0 Z"
                fill="#6e5a45" stroke="#3a2818" strokeWidth="0.7" />
          {/* pine clumps */}
          {[40, 100, 180, 260, 340].map((px, i) => (
            <g key={i} transform={`translate(${px} -2)`}>
              <path d="M 0 0 l -3 -7 l 3 -2 l -2 -5 l 2 -2 l 2 2 l -2 5 l 3 2 l -3 7 Z"
                    fill="#2a3a28" stroke="#1a2a18" strokeWidth="0.4" />
            </g>
          ))}
        </g>
      );
    }
    if (terrain === "forest") {
      return (
        <g transform={`translate(${tx} ${midY})`} key={offset}>
          {[20, 60, 100, 140, 180, 220, 260, 300, 340, 380].map((px, i) => (
            <g key={i} transform={`translate(${px} 0)`}>
              {/* trunk */}
              <rect x="-1" y="-2" width="2" height="4" fill="#3a2418" />
              {/* foliage */}
              <ellipse cx="0" cy="-7" rx="6" ry="9" fill="#3a5a3a" stroke="#1a2a1a" strokeWidth="0.4" />
              <path d="M -4 -10 q 4 -2 8 0" stroke="#1a2a1a" strokeWidth="0.3" fill="none" />
            </g>
          ))}
        </g>
      );
    }
    if (terrain === "desert") {
      return (
        <g transform={`translate(${tx} ${midY})`} key={offset}>
          {/* dunes */}
          <path d="M 0 0 Q 80 -12 160 -2 Q 240 -14 320 -4 Q 400 -10 400 0 L 0 0 Z"
                fill="#c8884a" stroke="#7a4818" strokeWidth="0.5" />
          {/* cacti */}
          {[60, 180, 280].map((px, i) => (
            <g key={i} transform={`translate(${px} -1)`}>
              <path d="M 0 0 L 0 -10 M -2 -7 L -2 -10 M 2 -8 L 2 -11"
                    stroke="#3a5a28" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            </g>
          ))}
        </g>
      );
    }
    if (terrain === "river") {
      return (
        <g transform={`translate(${tx} ${midY})`} key={offset}>
          {/* near bank with reeds */}
          <path d="M 0 0 Q 100 -4 200 0 Q 300 -3 400 0 L 400 8 L 0 8 Z"
                fill="#6a7a4a" stroke="#3a4a2a" strokeWidth="0.5" />
          {[40, 90, 140, 200, 260, 320, 360].map((px, i) => (
            <line key={i} x1={px} y1="0" x2={px + 1} y2="-5" stroke="#3a4a2a" strokeWidth="0.5" />
          ))}
        </g>
      );
    }
    // prairie: low rolling tufts
    return (
      <g transform={`translate(${tx} ${midY})`} key={offset}>
        <path d="M 0 0 Q 60 -4 120 0 Q 180 -3 240 0 Q 300 -4 360 0 Q 400 -2 400 0 L 0 0 Z"
              fill="#9a8a4a" stroke="#5a4818" strokeWidth="0.4" />
        {/* sparse grass clumps — wide & low, not spike-like */}
        {[40, 110, 180, 260, 330].map((px, i) => (
          <g key={i} transform={`translate(${px} 0)`}>
            <ellipse cx="0" cy="-1" rx="6" ry="1.2" fill="#7a6a3a" opacity="0.7" />
            <path d="M -3 -1 q 1 -2 2 -1 m 1 0 q 1 -2 2 -1"
                  stroke="#5a4818" strokeWidth="0.4" fill="none" opacity="0.6" />
          </g>
        ))}
      </g>
    );
  };
  return <g>{[0, 400].map(tile)}</g>;
}

// ── Near layer: foreground ground, tufts/rocks the wagon walks past ──
function NearLayer({ terrain, scrollX, w, groundY }) {
  const x = -((scrollX * 0.85) % 200);
  const tile = (offset) => {
    const tx = x + offset;
    return (
      <g transform={`translate(${tx} ${groundY})`} key={offset}>
        {terrain === "prairie" && (
          <g stroke="#4a3818" strokeWidth="0.5" fill="none" strokeLinecap="round">
            {[10, 35, 70, 110, 140, 175].map((px, i) => (
              <path key={i} d={`M ${px} 4 q 1 -3 2 0 m -1 0 q -1 -3 0 -5 m 0 0 q 1 -2 2 -1`} />
            ))}
          </g>
        )}
        {terrain === "mountains" && (
          <g fill="#5a4a3a" stroke="#1a0e08" strokeWidth="0.5">
            <ellipse cx="30" cy="3" rx="8" ry="2" />
            <ellipse cx="100" cy="2" rx="5" ry="1.4" />
            <ellipse cx="160" cy="3" rx="7" ry="1.8" />
          </g>
        )}
        {terrain === "forest" && (
          <g>
            {[20, 80, 140].map((px, i) => (
              <g key={i} transform={`translate(${px} 0)`}>
                <ellipse cx="0" cy="2" rx="4" ry="1" fill="#3a2818" />
                <path d="M -2 2 l 1 -3 m 2 3 l 0 -3 m 1 3 l 1 -2"
                      stroke="#5a4828" strokeWidth="0.5" />
              </g>
            ))}
          </g>
        )}
        {terrain === "desert" && (
          <g>
            <ellipse cx="40" cy="3" rx="3" ry="1" fill="#8a5828" />
            <ellipse cx="120" cy="3" rx="5" ry="1.2" fill="#a86838" />
            {/* small skull */}
            <g transform="translate(150 1)">
              <ellipse cx="0" cy="0" rx="2" ry="1.2" fill="#e8d8b8" stroke="#3a1a08" strokeWidth="0.3" />
              <circle cx="-0.6" cy="0" r="0.3" fill="#3a1a08" />
              <circle cx="0.6" cy="0" r="0.3" fill="#3a1a08" />
            </g>
          </g>
        )}
        {terrain === "river" && (
          <g>
            <path d="M 0 0 Q 50 -2 100 0 Q 150 2 200 0 L 200 8 L 0 8 Z"
                  fill="#4a8bc9" opacity="0.6" />
            <path d="M 0 0 Q 50 -2 100 0 Q 150 2 200 0" stroke="#7aa8d4" strokeWidth="0.5" fill="none" />
          </g>
        )}
      </g>
    );
  };
  return <g>{[0, 200, 400].map(tile)}</g>;
}

// ── Ground band (foreground earth color) ──
const GROUND_FILL = {
  prairie:   ["#b8a05a", "#7a6a2a"],
  mountains: ["#6e5a45", "#3a2818"],
  forest:    ["#4a5d3a", "#2e3a23"],
  desert:    ["#c9874a", "#7a4818"],
  river:     ["#7a8a5a", "#3a4a2a"],
};

function GroundBand({ terrain, groundY, h, w }) {
  const fills = GROUND_FILL[terrain] ?? GROUND_FILL.prairie;
  return (
    <g>
      <defs>
        <linearGradient id={`grnd-${terrain}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fills[0]} />
          <stop offset="100%" stopColor={fills[1]} />
        </linearGradient>
      </defs>
      <rect x="0" y={groundY} width={w} height={h} fill={`url(#grnd-${terrain})`} />
      {/* horizon shadow */}
      <rect x="0" y={groundY} width={w} height="8"
            fill="url(#shadow-fade)" opacity="0.4" />
    </g>
  );
}

Object.assign(window, { SkyGradient, FarLayer, MidLayer, NearLayer, GroundBand, SKY, GROUND_FILL });
