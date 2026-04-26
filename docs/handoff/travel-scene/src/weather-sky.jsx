// weather-sky.jsx — weather overlays (rain, snow, clouds, sun/moon, lightning)
// Kurosawa-style storms: when it rains, it POURS — dense streaks, dark sky,
// flashing lightning, blowing wind direction.

// ── Sun / moon disc with glow ──
function SkyAccent({ kind, x, y, t }) {
  if (kind === "rainy" || kind === "snowy") return null;
  const isMoon = kind === "night";
  const pulse = 1 + Math.sin(t * 0.6) * 0.04;
  return (
    <g transform={`translate(${x} ${y}) scale(${pulse})`}>
      {/* outer glow */}
      <circle r="22" fill={isMoon ? "#d8d8e8" : "#fff5d0"} opacity="0.18" />
      <circle r="14" fill={isMoon ? "#e0e0f0" : "#fde8a0"} opacity="0.4" />
      {/* disc */}
      <circle r="9" fill={isMoon ? "#f0f0f8" : "#fff0c8"} stroke={isMoon ? "#a0a0b0" : "#e8b850"} strokeWidth="0.6" />
      {isMoon && (
        <>
          <circle cx="-3" cy="-2" r="1.4" fill="#c0c0d0" opacity="0.5" />
          <circle cx="2" cy="3" r="1" fill="#c0c0d0" opacity="0.4" />
        </>
      )}
    </g>
  );
}

// ── Drifting clouds — small puffs even on sunny days, stacks on cloudy/rainy ──
function CloudPuff({ x, y, scale = 1, opacity = 0.85 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      <ellipse cx="-10" cy="0" rx="8" ry="5" fill="#f0f0f0" />
      <ellipse cx="0" cy="-3" rx="11" ry="6.5" fill="#f0f0f0" />
      <ellipse cx="10" cy="0" rx="8" ry="5" fill="#f0f0f0" />
      <ellipse cx="-3" cy="2" rx="10" ry="4" fill="#f0f0f0" />
      {/* shadow underside */}
      <ellipse cx="0" cy="3" rx="14" ry="2" fill="#3a3a3a" opacity="0.18" />
    </g>
  );
}

function CloudLayer({ kind, t, w, skyH }) {
  // count + density per kind
  let count = 2, baseOp = 0.7, scale = 1;
  if (kind === "sunny")  { count = 2; baseOp = 0.5; scale = 0.7; }
  if (kind === "partly") { count = 4; baseOp = 0.75; scale = 1; }
  if (kind === "cloudy") { count = 7; baseOp = 0.9;  scale = 1.2; }
  if (kind === "rainy")  { count = 9; baseOp = 0.95; scale = 1.5; }
  if (kind === "snowy")  { count = 8; baseOp = 0.92; scale = 1.3; }

  const driftSpeed = (kind === "rainy" || kind === "snowy") ? 18 : 6;
  const isStorm = kind === "rainy";

  const clouds = Array.from({ length: count }).map((_, i) => {
    const seed = i * 17;
    const baseX = ((seed * 47) % (w + 200)) - 100;
    const x = (baseX - t * driftSpeed) % (w + 200);
    const fx = x < -100 ? x + (w + 200) : x;
    const y = 30 + (seed % 5) * 18;
    const sc = scale * (0.7 + ((seed * 7) % 50) / 100);
    const op = isStorm ? baseOp * 0.85 : baseOp * (0.7 + ((seed * 11) % 30) / 100);
    return (
      <g key={i}>
        <CloudPuff x={fx} y={y} scale={sc} opacity={op} />
        {/* storm clouds get a darker version */}
        {isStorm && (
          <g transform={`translate(${fx} ${y + 1}) scale(${sc * 1.05})`} opacity="0.6">
            <ellipse cx="0" cy="0" rx="14" ry="6" fill="#2a3548" />
          </g>
        )}
      </g>
    );
  });

  return <g>{clouds}</g>;
}

// ── Rain — Kurosawa style. Dense diagonal streaks, blowing left (matches
//    westward travel + winds typically out of the west). Some splashes on ground.
function RainOverlay({ t, w, h, groundY }) {
  const drops = [];
  const COUNT = 140;
  const ANGLE = 18; // degrees from vertical
  const speed = 600;
  for (let i = 0; i < COUNT; i++) {
    const seed = i * 13;
    const x0 = (seed * 31) % w;
    const y0 = ((seed * 47 + t * speed) % (h + 80)) - 40;
    const len = 14 + (seed % 8);
    drops.push(
      <line key={i}
            x1={x0} y1={y0}
            x2={x0 + len * Math.sin((ANGLE * Math.PI) / 180)}
            y2={y0 + len * Math.cos((ANGLE * Math.PI) / 180)}
            stroke="#b8c8d8" strokeWidth="0.7" opacity="0.55" />
    );
  }
  // splash dots on ground
  const splashes = [];
  for (let i = 0; i < 30; i++) {
    const seed = i * 19;
    const x = ((seed * 23 + t * 30) % w);
    const y = groundY + 2 + (seed % 5);
    splashes.push(
      <ellipse key={i} cx={x} cy={y} rx="1.2" ry="0.4"
               fill="#b8c8d8" opacity="0.6" />
    );
  }
  return <g>{drops}{splashes}</g>;
}

// ── Lightning flash — fires at unpredictable intervals ──
function LightningFlash({ t, w, h }) {
  // fire flash for 0.2s every ~5-8s
  const period = 6;
  const cycle = (t % period) / period;
  const isFlashing = cycle > 0.92 && cycle < 0.98;
  const subFlash = cycle > 0.95 && cycle < 0.96;
  if (!isFlashing) return null;
  // bolt path
  const startX = w * 0.3 + (Math.sin(t) * w * 0.4);
  return (
    <g>
      {/* whole-screen flash */}
      <rect x="0" y="0" width={w} height={h} fill="#fff" opacity={subFlash ? 0.4 : 0.18} />
      {/* bolt */}
      <path d={`M ${startX} 0 L ${startX - 8} 60 L ${startX + 4} 70 L ${startX - 12} 130 L ${startX - 4} 140 L ${startX - 18} 180`}
            stroke="#fff" strokeWidth="2.5" fill="none" strokeLinejoin="miter" opacity="0.95" />
      <path d={`M ${startX} 0 L ${startX - 8} 60 L ${startX + 4} 70 L ${startX - 12} 130 L ${startX - 4} 140 L ${startX - 18} 180`}
            stroke="#e8e0ff" strokeWidth="0.8" fill="none" />
    </g>
  );
}

// ── Snow — drifting flakes, gentler than rain ──
function SnowOverlay({ t, w, h, groundY }) {
  const flakes = [];
  for (let i = 0; i < 80; i++) {
    const seed = i * 11;
    const x0 = (seed * 31) % w;
    const drift = Math.sin((t + seed * 0.3) * 0.5) * 18;
    const y0 = ((seed * 47 + t * 80) % (h + 40)) - 20;
    const r = 0.8 + (seed % 3) * 0.3;
    flakes.push(
      <circle key={i}
              cx={x0 + drift}
              cy={y0}
              r={r}
              fill="#f8f8ff"
              opacity={0.65 + (seed % 4) * 0.08} />
    );
  }
  // accumulating snow on ground
  return (
    <g>
      {flakes}
      {/* snow blanket on ground */}
      <path
        d={`M 0 ${groundY + 2} ${Array.from({ length: 60 }).map((_, i) => {
          const x = (i / 60) * w;
          const wobble = Math.sin(i * 1.7) * 0.5;
          return `L ${x} ${groundY + 1 + wobble}`;
        }).join(" ")} L ${w} ${groundY + 4} L 0 ${groundY + 4} Z`}
        fill="#f0f4f8" opacity="0.85"
      />
    </g>
  );
}

// ── Storm darkening overlay ──
function StormVignette({ kind, w, h }) {
  if (kind !== "rainy") return null;
  return (
    <rect x="0" y="0" width={w} height={h} fill="#1a2030" opacity="0.32" />
  );
}

Object.assign(window, { SkyAccent, CloudLayer, CloudPuff, RainOverlay, SnowOverlay, LightningFlash, StormVignette });
