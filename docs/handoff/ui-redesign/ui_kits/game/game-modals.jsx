// ============================================================================
// game-modals.jsx — the play-screen modals added since the last handoff.
// All share one parchment modal shell on the OT.IO design system.
// Exposed on window for index.html to toggle via the Tweaks panel.
// ============================================================================

// Shared shell — parchment card, double rule, soft drop, ink text.
function GameModal({ pill, pillIcon, title, accent = 'var(--c-rust)', children, onClose, maxWidth = 520 }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(42,29,12,0.80)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, animation: 'fadein 0.2s linear' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--of-paper-soft)', border: '3px double var(--of-ink-soft)', borderRadius: 3,
          padding: 24, maxWidth, width: '90%', maxHeight: '86vh', overflowY: 'auto', color: 'var(--of-ink)',
          boxShadow: 'inset 0 0 0 1px rgba(255,245,220,0.30), 0 3px 7px rgba(74,46,21,0.18), 0 14px 44px rgba(42,29,12,0.35)',
          animation: 'modalpop 0.3s cubic-bezier(0.2,0.9,0.3,1.1)',
        }}
      >
        {pill && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4em', background: 'var(--of-paper)', border: '1.5px solid var(--of-ink-soft)', padding: '0.25em 0.8em', borderRadius: 20, fontFamily: "'IM Fell English SC', Georgia, serif", fontSize: 13, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--of-ink-soft)', marginBottom: 10 }}>
            {pillIcon && <span style={{ fontSize: '1.1em' }}>{pillIcon}</span>}{pill}
          </div>
        )}
        <h2 style={{ fontFamily: 'Rye, Georgia, serif', color: accent, margin: '0 0 12px', fontSize: 28, letterSpacing: '0.03em' }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

const mFlavor = { fontFamily: 'IM Fell English, Georgia, serif', fontStyle: 'italic', color: 'var(--of-ink)', fontSize: 17, lineHeight: 1.55, margin: '0 0 16px' };
const mEyebrow = { fontFamily: "'IM Fell English SC', Georgia, serif", fontSize: 13, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--of-ink-soft)', marginBottom: 8 };
function ChoiceBtn({ icon, label, sub, primary, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '0.8em', width: '100%', padding: '0.8em 1em',
      background: 'var(--of-paper)', color: 'var(--of-ink)',
      border: '2px solid ' + (primary ? 'var(--of-rust)' : 'var(--of-ink-soft)'),
      borderRadius: 2, fontFamily: 'IM Fell English, Georgia, serif', fontWeight: 700, fontSize: 16, textAlign: 'left', cursor: 'pointer',
      boxShadow: 'inset 0 1px 0 rgba(255,245,220,0.55), inset 0 -2px 0 rgba(0,0,0,0.12), 0 2px 3px rgba(74,46,21,0.18)',
    }}>
      {icon && <span style={{ fontSize: '1.2em' }}>{icon}</span>}
      <span style={{ flex: 1 }}>{label}{sub && <span style={{ display: 'block', fontWeight: 400, fontStyle: 'italic', fontSize: 13, color: 'var(--of-ink-soft)' }}>{sub}</span>}</span>
    </button>
  );
}

// ── Mud-abandon: shed heavy items to free a stuck wagon ──────────────────────
function MudAbandonModal({ onClose }) {
  const rows = [
    ['🛞', 'Spare wheel', '40 lb'], ['🪵', 'Spare axle', '35 lb'],
    ['📚', 'Family library', '60 lb'], ['🪑', 'Oak chest', '80 lb'],
  ];
  return (
    <GameModal pill="Bogged down" pillIcon="🐂" title="Sunk to the Axles" accent="var(--of-bad)" onClose={onClose}>
      <p style={mFlavor}>Spring rains have turned the bottomland to soup. The wagon won't budge until you lighten the load by <strong>150 lb</strong>. Choose what to leave to the mud.</p>
      <div style={mEyebrow}>Heavy goods · shed to free the wagon</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map(([g, k, w]) => (
          <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.6em 0.8em', background: 'var(--of-paper)', border: '2px solid var(--of-ink-soft)', borderRadius: 2, cursor: 'pointer', fontFamily: 'IM Fell English, Georgia, serif', fontSize: 16, boxShadow: 'inset 0 1px 0 rgba(255,245,220,0.5)' }}>
            <input type="checkbox" />
            <span style={{ fontSize: '1.2em' }}>{g}</span>
            <span style={{ flex: 1, fontWeight: 700 }}>{k}</span>
            <span style={{ fontFamily: 'Special Elite, monospace', color: 'var(--of-ink-soft)' }}>{w}</span>
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 14, fontFamily: 'Special Elite, monospace', fontSize: 14 }}>
        <span style={{ color: 'var(--of-ink-soft)' }}>Shed so far</span>
        <span style={{ color: 'var(--of-bad)', fontWeight: 700 }}>0 / 150 lb</span>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <ChoiceBtn icon="🪣" label="Leave these behind" primary onClick={onClose} />
      </div>
    </GameModal>
  );
}

// ── Company dissent: the train votes on a contested decision ─────────────────
function CompanyDissentModal({ onClose }) {
  return (
    <GameModal pill="Company dissent" pillIcon="🗳️" title="A Vote at the Fork" onClose={onClose}>
      <p style={mFlavor}>The Holt and Vance families want to take the southern cutoff to save a week. The Cranes call it reckless. As wagon-master, the company looks to you.</p>
      <div style={mEyebrow}>Where the families stand</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 16, fontFamily: 'IM Fell English, Georgia, serif', fontSize: 15 }}>
        {[['Holt party', 'for the cutoff', 'var(--of-good)'], ['Vance party', 'for the cutoff', 'var(--of-good)'], ['Crane party', 'against — too dry', 'var(--of-bad)']].map(([n, v, c]) => (
          <div key={n} style={{ display: 'flex', justifyContent: 'space-between' }}><span><strong>{n}</strong></span><span style={{ color: c, fontFamily: 'Special Elite, monospace', fontSize: 13 }}>{v}</span></div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ChoiceBtn icon="🌵" label="Take the southern cutoff" sub="Faster, drier — the Cranes may peel off" primary onClick={onClose} />
        <ChoiceBtn icon="🏞️" label="Hold to the river road" sub="Slower, safer water — keeps the company whole" onClick={onClose} />
      </div>
    </GameModal>
  );
}

// ── Party member detail ──────────────────────────────────────────────────────
function PartyMemberModal({ onClose }) {
  const stats = [['Health', '78 / 100', 'var(--of-warn)'], ['Morale', '64 / 100', 'var(--of-warn)'], ['Fatigue', 'Rested', 'var(--of-good)']];
  return (
    <GameModal pill="Banker · age 38" pillIcon="👨" title="Ezra Whitfield" maxWidth={460} onClose={onClose}>
      <p style={mFlavor}>Wagon-master of the company. A Cincinnati banker who sold everything for the promise of Willamette farmland.</p>
      <div style={mEyebrow}>Condition</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {stats.map(([k, v, c]) => (
          <div key={k}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Special Elite, monospace', fontSize: 13, marginBottom: 3 }}><span style={{ color: 'var(--of-ink-soft)' }}>{k}</span><span style={{ color: c, fontWeight: 700 }}>{v}</span></div>
          </div>
        ))}
      </div>
      <div style={mEyebrow}>Ailments</div>
      <p style={{ ...mFlavor, margin: 0 }}>A touch of trail-foot — slow but mending. No fever.</p>
    </GameModal>
  );
}

// ── Newspaper (flavor) ───────────────────────────────────────────────────────
function NewspaperModal({ onClose }) {
  return (
    <GameModal title="The Frontier Gazette" maxWidth={560} accent="var(--of-ink)" onClose={onClose}>
      <div style={{ textAlign: 'center', borderTop: '3px double var(--of-ink-soft)', borderBottom: '3px double var(--of-ink-soft)', padding: '6px 0', marginBottom: 14, fontFamily: "'IM Fell English SC', Georgia, serif", fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--of-ink-soft)' }}>
        Independence, Mo. · June 1848 · Price 3¢
      </div>
      <h3 style={{ fontFamily: 'Rye, Georgia, serif', fontSize: 22, color: 'var(--of-ink)', margin: '0 0 8px', textAlign: 'center' }}>Gold Rumors Stir the Territories</h3>
      <p style={{ fontFamily: 'IM Fell English, Georgia, serif', fontSize: 16, lineHeight: 1.6, color: 'var(--of-ink)', columnCount: 2, columnGap: 20, margin: 0 }}>
        Reports arrive of yellow metal pulled from a millrace in the Sacramento valley. Outfitters at the Missouri landings report brisk trade in shovels and pans. Emigrant trains are advised the season is short — the high passes close by October, and the wise company does not dawdle at the forts.
      </p>
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}><ChoiceBtn label="Fold the paper away" primary onClick={onClose} /></div>
    </GameModal>
  );
}

// ── Letter from home (flavor) ────────────────────────────────────────────────
function LetterModal({ onClose }) {
  return (
    <GameModal pill="A letter from home" pillIcon="✉️" title="From Cousin Adeline" maxWidth={480} onClose={onClose}>
      <div style={{ background: 'var(--of-paper)', border: '1.5px solid var(--of-ink-soft)', borderRadius: 2, padding: '16px 18px', fontFamily: 'IM Fell English, Georgia, serif', fontSize: 16, lineHeight: 1.7, color: 'var(--of-ink)', boxShadow: 'inset 0 1px 0 rgba(255,245,220,0.5)' }}>
        <p style={{ margin: '0 0 12px', fontStyle: 'italic' }}>Dearest Ezra,</p>
        <p style={{ margin: '0 0 12px' }}>The maples have turned and your mother asks after you each Sunday. We pray the oxen are sound and the children well. Write when you reach the Platte — Mr. Hollis carries the mail as far as Kearny.</p>
        <p style={{ margin: 0, textAlign: 'right', fontStyle: 'italic' }}>Yours, Adeline</p>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}><ChoiceBtn label="Tuck it in the journal" primary onClick={onClose} /></div>
    </GameModal>
  );
}

Object.assign(window, { GameModal, MudAbandonModal, CompanyDissentModal, PartyMemberModal, NewspaperModal, LetterModal });
