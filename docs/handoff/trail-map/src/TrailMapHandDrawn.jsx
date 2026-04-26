/* global React */

// ============================================================================
// HAND-DRAWN: full-territory pen-and-ink overview map. The route winds across
// a stylized continent, the wagon is a tiny ink silhouette walking the line.
// ============================================================================
function TrailMapHandDrawn({ landmarks, currentMileage = 580, totalMileage = 2000 }) {
  const lms = landmarks || window.OT_LANDMARKS;

  const W = 760, H = 240;
  // The route is hand-laid: a path from Independence (right side, MO) to Oregon City (left).
  // We assign each landmark an absolute (x,y) on the parchment.
  const route = {
    independence:      [690, 175],
    kansas_river:      [630, 165],
    big_blue_river:    [580, 155],
    ft_kearny:         [520, 145],
    ash_hollow:        [470, 135],
    courthouse_rock:   [445, 122],
    chimney_rock:      [430, 116],
    scotts_bluff:      [415, 112],
    ft_laramie:        [395, 104],
    independence_rock: [340, 95 ],
    devils_gate:       [332, 92 ],
    south_pass:        [300, 86 ],
    ft_bridger:        [275, 100],
    soda_springs:      [240, 88 ],
    ft_hall:           [215, 85 ],
    ft_boise:          [165, 92 ],
    blue_mountains:    [128, 88 ],
    the_dalles:        [85,  100],
    oregon_city:       [55,  130],
  };
  // Build a smooth path through these points
  const orderedPts = lms.map(l => route[l.id]).filter(Boolean);
  const pathD = orderedPts.map((p, i) => i === 0 ? `M ${p[0]} ${p[1]}` : `Q ${(orderedPts[i-1][0] + p[0]) / 2 + 4} ${(orderedPts[i-1][1] + p[1]) / 2 - 6} ${p[0]} ${p[1]}`).join(' ');

  // Wagon position: interpolate along route by mileage
  const wagonPos = (() => {
    let prev = lms[0], next = lms[1];
    for (let i = 0; i < lms.length - 1; i++) {
      if (lms[i].mile <= currentMileage && lms[i+1].mile >= currentMileage) {
        prev = lms[i]; next = lms[i+1]; break;
      }
    }
    const t = (currentMileage - prev.mile) / (next.mile - prev.mile || 1);
    const a = route[prev.id], b = route[next.id];
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - 4];
  })();

  return (
    <div style={{ background: 'var(--c-parchment)', border: '3px solid var(--c-rust-dark)', borderRadius: 3, padding: '12px 14px', color: 'var(--c-ink)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 12, letterSpacing: '0.08em', marginBottom: 8 }}>
        <span style={{ fontFamily: 'Rye, Georgia, serif', color: 'var(--c-rust-dark)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>The Oregon Trail</span>
        <span style={{ color: 'var(--c-wood)', fontStyle: 'italic' }}>{currentMileage} / {totalMileage} mi · 1848</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <filter id="ink"><feTurbulence baseFrequency="2" numOctaves="2" /><feDisplacementMap in="SourceGraphic" scale="0.8" /></filter>
          <pattern id="paper" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
            <rect width="200" height="200" fill="#e8d9b8"/>
            <circle cx="40" cy="60" r="0.5" fill="rgba(58,26,8,0.18)"/>
            <circle cx="120" cy="30" r="0.4" fill="rgba(58,26,8,0.15)"/>
            <circle cx="170" cy="140" r="0.5" fill="rgba(58,26,8,0.2)"/>
            <circle cx="80" cy="170" r="0.3" fill="rgba(58,26,8,0.15)"/>
          </pattern>
        </defs>
        <rect x="0" y="0" width={W} height={H} fill="url(#paper)" />
        {/* age stains */}
        <ellipse cx="120" cy="200" rx="80" ry="20" fill="rgba(122,90,30,0.15)" />
        <ellipse cx="600" cy="40" rx="100" ry="22" fill="rgba(122,90,30,0.12)" />

        {/* sketched coastline at far left (Pacific) */}
        <path d="M 28 60 Q 22 90 30 130 Q 18 160 32 200" stroke="var(--c-ink)" strokeWidth="1.4" fill="none" />
        <path d="M 24 70 Q 20 95 28 135 Q 14 165 28 205" stroke="rgba(58,26,8,0.4)" strokeWidth="0.8" fill="none" />
        {/* hatched water at left */}
        {Array.from({ length: 6 }).map((_, i) => (
          <path key={'w' + i} d={`M 4 ${50 + i * 30} q 5 ${i % 2 ? -3 : 3} 10 0 q 5 ${i % 2 ? 3 : -3} 10 0`} stroke="#2f5a8a" strokeWidth="0.7" fill="none" opacity="0.7" />
        ))}

        {/* sketched mountain ranges */}
        {[
          [110, 78], [128, 70], [150, 75], [175, 68], [200, 80],
          [310, 60], [330, 55], [345, 70],
          [420, 88], [440, 80], [460, 90],
        ].map(([cx, cy], i) => (
          <g key={'mt' + i}>
            <path d={`M ${cx - 14} ${cy + 14} L ${cx} ${cy} L ${cx + 14} ${cy + 14}`} stroke="var(--c-ink)" strokeWidth="1.4" fill="none" />
            <path d={`M ${cx - 6} ${cy + 8} L ${cx} ${cy + 4} L ${cx + 6} ${cy + 8}`} stroke="var(--c-ink)" strokeWidth="0.8" fill="none" />
          </g>
        ))}

        {/* tree clusters in the prairie */}
        {[[600, 200], [560, 195], [535, 190], [85, 180], [105, 185]].map(([cx, cy], i) => (
          <g key={'tr' + i} stroke="rgba(58,80,40,0.7)" strokeWidth="0.9" fill="none">
            <path d={`M ${cx} ${cy} l 0 -6 m 0 0 l -3 -3 m 0 6 l 6 -6 m -3 6 l 3 -3`} />
          </g>
        ))}

        {/* state outlines (suggestion only) */}
        <path d="M 480 200 L 580 195 L 660 200 L 700 220" stroke="rgba(58,26,8,0.3)" strokeWidth="0.8" strokeDasharray="3 4" fill="none" />
        <text x="600" y="217" fontFamily="IM Fell English SC, Georgia, serif" fontSize="9" letterSpacing="3" fill="rgba(58,26,8,0.55)">MISSOURI</text>
        <text x="370" y="218" fontFamily="IM Fell English SC, Georgia, serif" fontSize="9" letterSpacing="3" fill="rgba(58,26,8,0.55)">NEBRASKA</text>
        <text x="130" y="218" fontFamily="IM Fell English SC, Georgia, serif" fontSize="9" letterSpacing="3" fill="rgba(58,26,8,0.55)">OREGON</text>

        {/* the trail itself */}
        <path d={pathD} stroke="rgba(58,26,8,0.6)" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d={pathD} stroke="var(--c-rust-dark)" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeDasharray="3 4" />

        {/* landmarks as ink-stamped dots with name labels */}
        {lms.map(l => {
          const p = route[l.id]; if (!p) return null;
          const passed = l.mile <= currentMileage;
          const labelLeft = p[0] > W * 0.5;
          return (
            <g key={l.id} opacity={passed ? 0.65 : 1}>
              <circle cx={p[0]} cy={p[1]} r={4.5} fill={l.kind === 'river' ? '#4a8bc9' : l.kind === 'end' ? '#c9962a' : 'var(--c-rust-dark)'} stroke="var(--c-ink)" strokeWidth="1.2" />
              <text x={labelLeft ? p[0] + 8 : p[0] - 8} y={p[1] + 3} fontFamily="IM Fell English, Georgia, serif" fontSize="10" fontStyle="italic" fill="var(--c-ink)" textAnchor={labelLeft ? 'start' : 'end'} stroke="rgba(232,217,184,0.85)" strokeWidth="2.5" paintOrder="stroke">{l.name}</text>
            </g>
          );
        })}

        {/* wagon silhouette */}
        <g transform={`translate(${wagonPos[0]}, ${wagonPos[1]})`}>
          <ellipse cx="0" cy="6" rx="9" ry="1.6" fill="rgba(0,0,0,0.25)" />
          <path d="M -7 -2 Q 0 -8 7 -2 L 7 4 L -7 4 Z" fill="#f5e6c8" stroke="var(--c-ink)" strokeWidth="1" />
          <circle cx="-4" cy="5" r="1.6" fill="var(--c-ink)" />
          <circle cx="4" cy="5" r="1.6" fill="var(--c-ink)" />
        </g>

        {/* compass rose */}
        <g transform="translate(700, 50)" fontFamily="Rye, Georgia, serif" fill="var(--c-ink)">
          <circle r="22" fill="rgba(245,230,200,0.6)" stroke="var(--c-rust-dark)" strokeWidth="1.4" />
          <circle r="14" fill="none" stroke="var(--c-ink)" strokeWidth="0.7" />
          <path d="M 0 -18 L 4 0 L 0 18 L -4 0 Z" fill="var(--c-rust-dark)" stroke="var(--c-ink)" strokeWidth="0.6" />
          <path d="M -18 0 L 0 4 L 18 0 L 0 -4 Z" fill="rgba(245,230,200,0.7)" stroke="var(--c-ink)" strokeWidth="0.6" />
          <text x="0" y="-24" textAnchor="middle" fontSize="9">N</text>
          <text x="24" y="3" fontSize="9">E</text>
          <text x="-24" y="3" textAnchor="end" fontSize="9">W</text>
          <text x="0" y="32" textAnchor="middle" fontSize="9">S</text>
        </g>

        {/* cartouche label */}
        <g transform="translate(160, 36)">
          <rect x="-58" y="-14" width="116" height="28" fill="rgba(245,230,200,0.7)" stroke="var(--c-rust-dark)" strokeWidth="1" />
          <text x="0" y="-2" textAnchor="middle" fontFamily="Rye, Georgia, serif" fontSize="11" letterSpacing="2" fill="var(--c-rust-dark)">OREGON TERRITORY</text>
          <text x="0" y="9" textAnchor="middle" fontFamily="IM Fell English, Georgia, serif" fontSize="8" fontStyle="italic" fill="var(--c-ink)">surveyed 1845</text>
        </g>
      </svg>
      <div style={{ marginTop: 6, fontSize: 10, letterSpacing: '0.15em', color: 'var(--c-rust-dark)', fontWeight: 700, textTransform: 'uppercase' }}>
        Ahead · {(() => { const n = lms.find(l => l.mile > currentMileage); return n ? `${n.glyph} ${n.name} · ${n.mile - currentMileage} mi` : '🏁 Oregon City'; })()}
      </div>
    </div>
  );
}

window.TrailMapHandDrawn = TrailMapHandDrawn;
