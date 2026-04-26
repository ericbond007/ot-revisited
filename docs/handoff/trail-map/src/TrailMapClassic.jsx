/* global React */

// Shared landmark catalog (subset of the codebase's full LANDMARKS array, in order).
window.OT_LANDMARKS = [
  { id: 'independence',     name: 'Independence',       glyph: '🏠', kind: 'start',  mile: 0    },
  { id: 'kansas_river',     name: 'Kansas R. Crossing', glyph: '🌊', kind: 'river',  mile: 102  },
  { id: 'big_blue_river',   name: 'Big Blue R.',        glyph: '🌊', kind: 'river',  mile: 187  },
  { id: 'ft_kearny',        name: 'Ft. Kearny',         glyph: '🏰', kind: 'fort',   mile: 304  },
  { id: 'ash_hollow',       name: 'Ash Hollow',         glyph: '🌳', kind: 'land',   mile: 460  },
  { id: 'courthouse_rock',  name: 'Courthouse Rock',    glyph: '🏛️', kind: 'land',   mile: 555  },
  { id: 'chimney_rock',     name: 'Chimney Rock',       glyph: '🗼', kind: 'land',   mile: 580  },
  { id: 'scotts_bluff',     name: 'Scotts Bluff',       glyph: '🏔️', kind: 'land',   mile: 605  },
  { id: 'ft_laramie',       name: 'Ft. Laramie',        glyph: '🏰', kind: 'fort',   mile: 650  },
  { id: 'independence_rock',name: 'Independence Rock',  glyph: '🗿', kind: 'land',   mile: 838  },
  { id: 'devils_gate',      name: "Devil's Gate",       glyph: '⛰️', kind: 'land',   mile: 843  },
  { id: 'south_pass',       name: 'South Pass',         glyph: '⛰️', kind: 'land',   mile: 932  },
  { id: 'ft_bridger',       name: 'Ft. Bridger',        glyph: '🏰', kind: 'fort',   mile: 1070 },
  { id: 'soda_springs',     name: 'Soda Springs',       glyph: '💧', kind: 'land',   mile: 1185 },
  { id: 'ft_hall',          name: 'Ft. Hall',           glyph: '🏰', kind: 'fort',   mile: 1288 },
  { id: 'ft_boise',         name: 'Ft. Boise',          glyph: '🏰', kind: 'fort',   mile: 1530 },
  { id: 'blue_mountains',   name: 'Blue Mountains',     glyph: '🏔️', kind: 'land',   mile: 1640 },
  { id: 'the_dalles',       name: 'The Dalles',         glyph: '🏞️', kind: 'land',   mile: 1840 },
  { id: 'oregon_city',      name: 'Oregon City',        glyph: '🏁', kind: 'end',    mile: 2000 },
];

// ============================================================================
// CLASSIC: parchment strip, dashed trail, emoji dots. (Port of TrailMap.svelte.)
// ============================================================================
function TrailMapClassic({ landmarks, currentMileage = 580, totalMileage = 2000 }) {
  const lms = landmarks || window.OT_LANDMARKS;
  const last = lms.findLast ? lms.findLast(l => l.mile <= currentMileage) : [...lms].reverse().find(l => l.mile <= currentMileage);
  const next = lms.find(l => l.mile > currentMileage);
  const seg = last && next ? { from: last, to: next } : null;
  const segPct = seg ? Math.round(((currentMileage - seg.from.mile) / (seg.to.mile - seg.from.mile)) * 100) : 0;
  const segMi  = seg ? currentMileage - seg.from.mile : 0;
  const segTotal = seg ? seg.to.mile - seg.from.mile : 0;

  const fillColor = (k) => k === 'river' ? 'var(--c-river-pale)' : k === 'end' ? 'var(--c-parchment-end)' : k === 'fort' ? 'var(--c-parchment-trade)' : 'var(--c-parchment-visited)';
  const strokeColor = (k) => k === 'river' ? '#2f5a8a' : k === 'end' ? '#7a5a10' : 'var(--c-rust)';

  return (
    <div style={{ background: 'var(--c-parchment)', border: '2px solid var(--c-border)', borderRadius: 3, padding: '14px 14px 18px', color: 'var(--c-ink)', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 12, letterSpacing: '0.08em', marginBottom: 10 }}>
        <span style={{ color: 'var(--c-rust-dark)', fontWeight: 700, textTransform: 'uppercase' }}>{seg ? `${seg.from.name} → ${seg.to.name}` : 'On the trail'}</span>
        <span style={{ color: 'var(--c-wood)', fontStyle: 'italic' }}>{seg ? `${segMi} / ${segTotal} mi this leg` : ''}</span>
      </div>
      <div style={{ position: 'relative', height: 72, marginTop: 8 }}>
        <div style={{ position: 'absolute', top: '50%', left: '3%', right: '3%', height: 2, background: 'repeating-linear-gradient(to right, var(--c-rust) 0 6px, transparent 6px 12px)' }} />
        {lms.map((l, i) => {
          const x = 3 + (l.mile / totalMileage) * 94;
          const passed = l.mile <= currentMileage;
          return (
            <div key={l.id} style={{
              position: 'absolute', top: '50%', left: x + '%',
              transform: 'translate(-50%, -50%)',
              width: 24, height: 24, borderRadius: '50%',
              border: `2px solid ${strokeColor(l.kind)}`,
              background: fillColor(l.kind),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
              opacity: passed ? 0.65 : 1, filter: 'saturate(0.85)',
              zIndex: 2,
            }} title={l.name}>{l.glyph}</div>
          );
        })}
        {seg && (
          <div style={{
            position: 'absolute',
            left: (3 + (currentMileage / totalMileage) * 94) + '%',
            top: '38%',
            transform: 'translate(-50%, -50%)',
            fontSize: 18, zIndex: 3,
            filter: 'drop-shadow(0 1px 0 rgba(0,0,0,0.2))',
            animation: 'wagonbob 1.8s ease-in-out infinite',
          }}>🐂🛖</div>
        )}
      </div>
      <div style={{ marginTop: 8, fontSize: 10, letterSpacing: '0.15em', color: 'var(--c-rust-dark)', fontWeight: 700, textTransform: 'uppercase' }}>
        Ahead · {next ? `${next.glyph} ${next.name}` : '🏁 Oregon City'} · {seg ? `${segPct}% to next` : ''}
      </div>
    </div>
  );
}

window.TrailMapClassic = TrailMapClassic;
