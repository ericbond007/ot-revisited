/* global React */

// ============================================================================
// TERRAIN: SVG bird's-eye view of the current leg with biome bands and ridges.
// Lookahead-focused — shows ~600 mi window centered on the wagon.
// ============================================================================
function TrailMapTerrain({ landmarks, currentMileage = 580, totalMileage = 2000 }) {
  const lms = landmarks || window.OT_LANDMARKS;
  // Window: 200 mi behind, 400 mi ahead
  const winStart = Math.max(0, currentMileage - 200);
  const winEnd = Math.min(totalMileage, currentMileage + 400);
  const winLen = winEnd - winStart;
  const visible = lms.filter(l => l.mile >= winStart && l.mile <= winEnd);

  // SVG coords: 600 wide × 220 tall.
  const W = 600, H = 220;
  const x = (mi) => 20 + ((mi - winStart) / winLen) * (W - 40);

  // Trail meanders gently — y position based on landmark kind
  const yFor = (mi, kind) => {
    const base = H / 2;
    const wobble = Math.sin((mi / winLen) * Math.PI * 3) * 18;
    if (kind === 'river') return base + 28;
    if (kind === 'fort') return base - 4;
    return base + wobble * 0.6;
  };

  // Biome based on absolute miles
  const biomeAt = (mi) => {
    if (mi < 300) return { fill: '#a8b885', label: 'PRAIRIE' };       // green
    if (mi < 700) return { fill: '#c8b878', label: 'PLAINS' };        // ochre
    if (mi < 1000) return { fill: '#9a8870', label: 'HIGH PLAINS' };  // greybrown
    if (mi < 1300) return { fill: '#8c8278', label: 'MOUNTAINS' };    // grey
    if (mi < 1600) return { fill: '#b8a070', label: 'DESERT BASIN' }; // tan
    if (mi < 1850) return { fill: '#7a8868', label: 'BLUE MTS' };     // dark green
    return { fill: '#85a085', label: 'CASCADES' };
  };

  // Build biome bands across the visible window
  const bandStops = [];
  let mi = winStart;
  while (mi < winEnd) {
    const b = biomeAt(mi);
    const next = Math.min(winEnd, [300, 700, 1000, 1300, 1600, 1850, totalMileage + 1].find(m => m > mi));
    bandStops.push({ from: mi, to: next, ...b });
    mi = next;
  }

  // Build trail path as a smooth wavy curve
  const path = (() => {
    const pts = [];
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const m = winStart + (winLen * i) / steps;
      const yWobble = Math.sin((m / 80)) * 14 + Math.cos((m / 130)) * 8;
      pts.push([x(m), H / 2 + yWobble]);
    }
    return pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ');
  })();

  const wagonX = x(currentMileage);
  const wagonY = H / 2 + Math.sin((currentMileage / 80)) * 14 + Math.cos((currentMileage / 130)) * 8;

  // Stroke + fill helpers
  const lmStroke = (k) => k === 'river' ? '#2f5a8a' : k === 'end' ? '#7a5a10' : 'var(--c-ink)';
  const lmFill = (k) => k === 'river' ? '#d6e2ec' : k === 'end' ? '#f5e0a8' : '#f5e6c8';

  return (
    <div style={{ background: 'var(--c-bg)', border: '2px solid var(--c-wood)', borderRadius: 3, padding: 12, color: 'var(--c-tan)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 12, letterSpacing: '0.08em', marginBottom: 8 }}>
        <span style={{ color: 'var(--c-rust)', fontWeight: 700, textTransform: 'uppercase' }}>Region · {biomeAt(currentMileage).label}</span>
        <span style={{ color: 'var(--c-wood)', fontStyle: 'italic' }}>±300 mi window · {currentMileage} / {totalMileage} mi</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 2, background: '#3a3020' }}>
        <defs>
          <filter id="paperGrain"><feTurbulence baseFrequency="0.9" numOctaves="2" /><feColorMatrix values="0 0 0 0 0.15  0 0 0 0 0.10  0 0 0 0 0.05  0 0 0 0.18 0"/></filter>
          <pattern id="contour" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
            <path d="M 0 7 Q 3.5 4 7 7 T 14 7" stroke="rgba(58,26,8,0.18)" fill="none" strokeWidth="0.7"/>
          </pattern>
        </defs>

        {/* biome bands */}
        {bandStops.map((b, i) => (
          <g key={i}>
            <rect x={x(b.from)} y={0} width={x(b.to) - x(b.from)} height={H} fill={b.fill} />
            <text x={x(b.from) + 6} y={16} fontFamily="Special Elite, monospace" fontSize="9" letterSpacing="2" fill="rgba(58,26,8,0.55)">{b.label}</text>
          </g>
        ))}
        <rect x={0} y={0} width={W} height={H} fill="url(#contour)" />
        <rect x={0} y={0} width={W} height={H} filter="url(#paperGrain)" opacity="0.6" />

        {/* ridgelines hint mountain bands */}
        {bandStops.filter(b => b.label.includes('MTS') || b.label.includes('MOUNTAINS') || b.label.includes('CASCADES')).map((b, i) => {
          const segs = [];
          for (let mx = x(b.from); mx < x(b.to); mx += 18) {
            const peakY = 60 + Math.sin(mx * 0.3) * 6;
            segs.push(`M ${mx} ${peakY + 10} L ${mx + 9} ${peakY} L ${mx + 18} ${peakY + 10}`);
          }
          return <path key={'r' + i} d={segs.join(' ')} stroke="rgba(58,26,8,0.5)" strokeWidth="1.2" fill="none" />;
        })}

        {/* river crossings as horizontal flowing lines */}
        {visible.filter(l => l.kind === 'river').map(l => (
          <g key={'rv' + l.id}>
            <path d={`M ${x(l.mile)} 30 Q ${x(l.mile) + 8} ${H/2} ${x(l.mile) - 6} ${H - 30}`} stroke="#4a8bc9" strokeWidth="3" fill="none" opacity="0.85" />
            <path d={`M ${x(l.mile)} 30 Q ${x(l.mile) + 8} ${H/2} ${x(l.mile) - 6} ${H - 30}`} stroke="#d6e2ec" strokeWidth="1" fill="none" />
          </g>
        ))}

        {/* trail path */}
        <path d={path} stroke="rgba(58,26,8,0.35)" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d={path} stroke="var(--c-rust)" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeDasharray="6 5" />

        {/* landmarks */}
        {visible.map(l => {
          const lx = x(l.mile);
          const ly = yFor(l.mile, l.kind);
          const passed = l.mile <= currentMileage;
          return (
            <g key={l.id} opacity={passed ? 0.7 : 1}>
              <circle cx={lx} cy={ly} r={11} fill={lmFill(l.kind)} stroke={lmStroke(l.kind)} strokeWidth="2" />
              <text x={lx} y={ly + 4} textAnchor="middle" fontSize="13">{l.glyph}</text>
              <text x={lx} y={ly + 26} textAnchor="middle" fontFamily="Special Elite, monospace" fontSize="9" fill="var(--c-ink)" stroke="rgba(232,217,184,0.7)" strokeWidth="2.5" paintOrder="stroke">{l.name}</text>
            </g>
          );
        })}

        {/* wagon */}
        <g transform={`translate(${wagonX}, ${wagonY})`}>
          <circle r="13" fill="rgba(0,0,0,0.25)" />
          <text textAnchor="middle" y="5" fontSize="18" style={{ filter: 'drop-shadow(0 1px 0 rgba(0,0,0,0.4))' }}>🐂🛖</text>
        </g>

        {/* compass rose */}
        <g transform={`translate(${W - 38}, 38)`} fontFamily="Rye, Georgia, serif" fill="var(--c-ink)">
          <circle r="18" fill="rgba(232,217,184,0.85)" stroke="var(--c-ink)" strokeWidth="1.5" />
          <path d="M 0 -14 L 3 0 L 0 14 L -3 0 Z" fill="var(--c-rust-dark)" />
          <text x="0" y="-20" textAnchor="middle" fontSize="9">N</text>
        </g>
      </svg>
      <div style={{ marginTop: 6, fontSize: 10, letterSpacing: '0.15em', color: 'var(--c-rust)', fontWeight: 700, textTransform: 'uppercase' }}>
        Ahead · {(() => { const n = lms.find(l => l.mile > currentMileage); return n ? `${n.glyph} ${n.name} · ${n.mile - currentMileage} mi` : '🏁 Oregon City'; })()}
      </div>
    </div>
  );
}

window.TrailMapTerrain = TrailMapTerrain;
