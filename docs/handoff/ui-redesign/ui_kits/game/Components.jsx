/* global React */
const { useState } = React;

function Eyebrow({ children, color, style }) {
  return (
    <div style={{
      fontSize: 11,
      letterSpacing: '0.18em',
      fontWeight: 700,
      color: color || 'var(--c-wood)',
      textTransform: 'uppercase',
      ...style,
    }}>{children}</div>
  );
}

function Logo({ size = 28 }) {
  return (
    <div style={{ fontFamily: 'Rye, Georgia, serif', fontSize: size, color: 'var(--c-rust)', letterSpacing: '0.06em', fontWeight: 900, lineHeight: 1 }}>
      OT<span style={{ color: 'var(--c-tan-bright)' }}>.</span>IO
    </div>
  );
}

function StatBar({ label, value, max, color, suffix }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--c-wood)', letterSpacing: '0.05em', marginBottom: 3, textTransform: 'uppercase' }}>
        <span>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{value}{suffix || ''}</span>
      </div>
      <div style={{ height: 8, background: 'var(--c-bg-raised)', border: '1px solid var(--c-ink)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', background: color, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

function TopBar({ day, date, pace, rations }) {
  return (
    <div style={{ background: 'var(--c-panel)', border: '2px solid var(--c-wood)', borderRadius: 3, padding: '8px 14px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 22px' }}>
      <Logo size={20} />
      <div style={{ width: 1, height: 22, background: 'var(--c-border)' }} />
      {[
        ['📅', 'DAY', day],
        ['🗓️', 'DATE', date],
        ['🐂', 'PACE', pace + ' ▾', true],
        ['🍖', 'RATIONS', rations + ' ▾', true],
      ].map(([icon, k, v, em]) => (
        <div key={k} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, fontSize: 14, color: 'var(--c-tan)' }}>
          <span style={{ fontSize: '1.1em' }}>{icon}</span>
          <span style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--c-wood)', fontWeight: 700 }}>{k}</span>
          <span style={{ color: em ? 'var(--c-tan-bright)' : 'var(--c-tan)', fontWeight: em ? 700 : 400 }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

function ActionBar({ contextual, onAction }) {
  const Btn = ({ icon, label, primary, disabled, hint, onClick }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={hint}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.4em',
        padding: '0.5em 0.9em',
        background: 'var(--of-rust)',
        color: 'var(--of-paper-soft)',
        border: '2px solid var(--of-rust-dark)',
        borderRadius: 2,
        fontFamily: 'Rye, Georgia, serif',
        fontWeight: 700,
        textTransform: 'uppercase',
        fontSize: '0.9em',
        letterSpacing: '0.05em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        boxShadow: primary
          ? 'var(--of-btn-emboss-strong), 0 0 14px rgba(148,52,14,0.45)'
          : 'var(--of-btn-emboss-strong)',
        animation: primary ? 'pulse 1.6s ease-in-out infinite' : 'none',
      }}>
      <span style={{ fontSize: '1.2em' }}>{icon}</span>{label}
    </button>
  );
  const isRiver = contextual === 'ford';
  return (
    <div style={{
      background: 'var(--c-panel)',
      border: '2px solid ' + (isRiver ? 'var(--c-river)' : 'var(--c-wood)'),
      borderRadius: 3,
      padding: 12,
      display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
    }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
        <div style={{ display: 'flex', flexDirection: 'column', border: '2px solid var(--of-ink-soft)', borderRadius: 2, overflow: 'hidden', boxShadow: 'var(--of-btn-emboss)' }}>
          <button style={{ background: 'var(--of-paper)', color: 'var(--of-ink)', border: 'none', padding: '0.1em 0.4em', fontSize: '0.7em', cursor: 'pointer' }}>▲</button>
          <div style={{ background: 'var(--of-paper-deep)', color: 'var(--of-ink)', padding: '0.1em 0.6em', fontFamily: 'Special Elite, monospace', textAlign: 'center', fontSize: 13, fontWeight: 700 }}>3</div>
          <button style={{ background: 'var(--of-paper)', color: 'var(--of-ink)', border: 'none', padding: '0.1em 0.4em', fontSize: '0.7em', cursor: 'pointer' }}>▼</button>
        </div>
        <Btn icon="🚶" label={isRiver ? 'Ford first' : 'Travel 3d'} disabled={isRiver} hint={isRiver ? 'Ford the river first' : ''} onClick={() => onAction && onAction('travel')} />
      </div>
      <Btn icon="🏕️" label="Rest" onClick={() => onAction && onAction('rest')} />
      <Btn icon="🏹" label="Hunt" onClick={() => onAction && onAction('hunt')} />
      <Btn icon="🏛️" label="Visit" disabled hint="Only when stopped at a fort" />
      {isRiver && <Btn icon="🛶" label="Ford" primary onClick={() => onAction && onAction('ford')} />}
    </div>
  );
}

function PartyPanel() {
  const members = [
    { glyph: '👨', name: 'Ezra', role: 'banker', hp: 78, leader: true },
    { glyph: '👩', name: 'Mary', role: 'doctor', hp: 92 },
    { glyph: '👦', name: 'Tom',  role: 'farmer', hp: 88 },
    { glyph: '✝',  name: 'Amos', role: 'scout',  hp: 0, dead: 'cholera' },
  ];
  return (
    <div style={{ background: 'var(--c-panel)', border: '2px solid var(--c-wood)', borderRadius: 3, padding: '11px 14px', cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <Eyebrow color="var(--c-rust)">Party</Eyebrow>
        <span style={{ color: 'var(--c-wood)', fontSize: 13 }}>▸</span>
      </div>
      {members.map(m => (
        <div key={m.name} style={{ fontSize: 13, marginBottom: 6, color: m.dead ? 'var(--c-wood)' : 'var(--c-tan)' }}>
          <div><span style={{ marginRight: 6 }}>{m.glyph}</span><strong>{m.name}</strong>{m.leader && <span style={{ color: 'var(--c-rust)' }}> *</span>} <span style={{ color: 'var(--c-wood)', fontSize: '0.9em' }}>({m.role})</span></div>
          <div style={{ color: 'var(--c-wood)', fontSize: 11, marginLeft: 22 }}>{m.dead ? `✝ dead (${m.dead})` : `HP ${m.hp}/100 · ${m.hp > 70 ? 'ok' : 'weary'}`}</div>
        </div>
      ))}
      <div style={{ marginTop: 4 }}>
        <StatBar label="Morale" value={64} max={100} color="var(--c-warn)" />
      </div>
    </div>
  );
}

function InventoryPanel() {
  const lines = [
    ['🍖', 'Meat', '124 lb', 'var(--c-good)'],
    ['🌾', 'Feed', '42 lb',  'var(--c-warn)'],
    ['💊', 'Medicine', '×3', 'var(--c-tan)'],
    ['🎯', 'Ammo', '34',     'var(--c-tan)'],
    ['🛠️', 'Spare wheel', '×1', 'var(--c-tan)'],
  ];
  return (
    <div style={{ background: 'var(--c-panel)', border: '2px solid var(--c-wood)', borderRadius: 3, padding: '11px 14px', cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <Eyebrow color="var(--c-rust)">Inventory</Eyebrow>
        <span style={{ color: 'var(--c-wood)', fontSize: 13 }}>▸</span>
      </div>
      {lines.map(([g, k, v, c]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--c-tan)', marginBottom: 4 }}>
          <span><span style={{ marginRight: 6 }}>{g}</span>{k}</span>
          <span style={{ color: c, fontWeight: 700, fontFamily: 'Special Elite, monospace' }}>{v}</span>
        </div>
      ))}
      <div style={{ marginTop: 8 }}>
        <StatBar label="Weight" value={2140} max={2500} color="var(--c-warn)" suffix=" lb" />
      </div>
    </div>
  );
}

function WagonTrainPanel() {
  const wagons = [
    { name: 'Holt party', souls: 4, status: 'with you', tone: 'var(--c-good)' },
    { name: 'Vance party', souls: 3, status: 'lagging', tone: 'var(--c-warn)' },
    { name: 'Crane party', souls: 5, status: 'ahead', tone: 'var(--c-tan)' },
  ];
  return (
    <div style={{ background: 'var(--c-panel)', border: '2px solid var(--c-wood)', borderRadius: 3, padding: '11px 14px', cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <Eyebrow color="var(--c-rust)">Wagon train</Eyebrow>
        <span style={{ color: 'var(--c-wood)', fontSize: 13 }}>▸</span>
      </div>
      {wagons.map((w) => (
        <div key={w.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 13, color: 'var(--c-tan)', marginBottom: 5 }}>
          <span><span style={{ marginRight: 6 }}>🛞</span><strong>{w.name}</strong> <span style={{ color: 'var(--c-wood)', fontSize: '0.9em' }}>· {w.souls} souls</span></span>
          <span style={{ color: w.tone, fontSize: 11, fontFamily: 'Special Elite, monospace' }}>{w.status}</span>
        </div>
      ))}
      <p style={{ fontFamily: 'IM Fell English, Georgia, serif', fontStyle: 'italic', color: 'var(--c-wood)', fontSize: 12, margin: '6px 0 0' }}>
        Three families travel with Ezra's company.
      </p>
    </div>
  );
}

function WagonPanel() {
  return (
    <div style={{ background: 'var(--c-panel)', border: '2px solid var(--c-wood)', borderRadius: 3, padding: '11px 14px', cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <Eyebrow color="var(--c-rust)">Wagon &amp; Oxen</Eyebrow>
        <span style={{ color: 'var(--c-wood)', fontSize: 13 }}>▸</span>
      </div>
      <StatBar label="Wagon" value={81} max={100} color="var(--c-good)" />
      <div style={{ height: 8 }} />
      <StatBar label="Oxen fatigue" value={62} max={100} color="var(--c-warn)" />
      <div style={{ fontSize: 11, color: 'var(--c-wood)', marginTop: 6, fontStyle: 'italic' }}>4 oxen · 2 yoked · 1 lame</div>
    </div>
  );
}

function EventModal({ onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,29,12,0.80)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, animation: 'fadein 0.2s linear' }}>
      <div style={{ background: 'var(--of-paper-soft)', border: '3px double var(--of-ink-soft)', borderRadius: 3, padding: 24, maxWidth: 520, width: '90%', color: 'var(--of-ink)', boxShadow: 'inset 0 0 0 1px rgba(255,245,220,0.30), 0 3px 7px rgba(74,46,21,0.18), 0 14px 44px rgba(42,29,12,0.35)', animation: 'modalpop 0.3s cubic-bezier(0.2,0.9,0.3,1.1)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4em', background: 'var(--of-paper)', border: '1.5px solid var(--of-ink-soft)', padding: '0.25em 0.8em', borderRadius: 20, fontFamily: "'IM Fell English SC', Georgia, serif", fontSize: 13, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--of-ink-soft)', marginBottom: 10 }}>
          <span style={{ fontSize: '1.1em' }}>🌩️</span>Weather
        </div>
        <h2 style={{ fontFamily: 'Rye, Georgia, serif', color: 'var(--of-rust)', margin: '0 0 12px', fontSize: 28, letterSpacing: '0.03em' }}>A Sudden Hailstorm</h2>
        <p style={{ fontFamily: 'IM Fell English, Georgia, serif', fontStyle: 'italic', color: 'var(--of-ink)', fontSize: 17, lineHeight: 1.55, margin: '0 0 18px' }}>
          Hailstones the size of musket balls crack against the canvas overhead. The oxen bolt for cover and the children huddle beneath the wagon bed.
        </p>
        <Eyebrow style={{ marginBottom: 8 }}>What do you do?</Eyebrow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            ['🐂', 'Push through — keep moving', true],
            ['⛺', 'Pitch camp until it passes', false],
            ['🛠️', 'Brace the canvas with rope and plank', false],
          ].map(([g, t, primary], i) => (
            <button key={i} onClick={onClose} style={{
              display: 'flex', alignItems: 'center', gap: '0.8em',
              width: '100%', padding: '0.8em 1em',
              background: 'var(--of-paper)', color: 'var(--of-ink)',
              border: '2px solid ' + (primary ? 'var(--of-rust)' : 'var(--of-ink-soft)'),
              borderRadius: 2, fontFamily: 'IM Fell English, Georgia, serif', fontWeight: 700, fontSize: 16, textAlign: 'left', cursor: 'pointer',
              boxShadow: 'inset 0 1px 0 rgba(255,245,220,0.55), inset 0 -2px 0 rgba(0,0,0,0.12), 0 2px 3px rgba(74,46,21,0.18)',
              animation: `choicein 0.3s ease-out ${i * 0.06}s both`,
            }}>
              <span style={{ fontSize: '1.2em' }}>{g}</span>
              <span style={{ flex: 1 }}>{t}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Eyebrow, Logo, StatBar, TopBar, ActionBar, PartyPanel, InventoryPanel, WagonPanel, WagonTrainPanel, EventModal });
