<script lang="ts">
  // Party panel — 3-col grid per row (avatar | text+bar | status badge)
  // plus a sparkline header, morale ribbon, and mini-stats footer.
  // Visual contract is docs/handoff/components/src/party-panel.html.
  //
  // Avatar SVGs are composed inline from the member's profession + sex
  // (face skin + shirt color) plus a hat/bonnet layer per profession.
  // Status overlays come from the member's condition: ill rows shake,
  // low-HP hearts pulse, fever droplets drip.
  import type { GameState, PartyMember } from '$lib/game/types';
  import { ITEMS } from '$lib/game/content/items';
  import { foodConsumedToday } from '$lib/game/systems/consumption';
  import { ICON } from '$lib/data/icon-dictionary';
  let { state, onopen }: { state: GameState; onopen?: () => void } = $props();

  // Derived headline counts.
  const aliveCount = $derived(state.party.filter((m) => !m.dead).length);
  const totalCount = $derived(state.party.length);
  const liveOxenCount = $derived(state.oxen.filter((o) => o.health > 0).length);

  // Morale sparkline — last 7 values, padded left from the leftmost
  // value if the rolling history is shorter.
  const sparkPoints = $derived.by(() => {
    const hist = state.moraleHistory && state.moraleHistory.length > 0
      ? state.moraleHistory
      : [state.morale];
    const padded = hist.length >= 7
      ? hist.slice(-7)
      : [...Array(7 - hist.length).fill(hist[0]), ...hist];
    // Map 0..100 morale onto a 14px-tall band, inverted (svg y grows down).
    return padded.map((m, i) => `${i * 8},${Math.round(14 - (m / 100) * 12) - 1}`).join(' ');
  });
  const sparkPrev = $derived.by(() => {
    const hist = state.moraleHistory ?? [];
    return hist.length >= 2 ? hist[hist.length - 2] : state.morale;
  });
  const moraleTrend = $derived(
    state.morale > sparkPrev ? 'up' : state.morale < sparkPrev ? 'down' : 'flat'
  );

  // Food days remaining — same calc as InventoryPanel; covers staples
  // (foodDrawOrder) only, not coffee/tea/sugar.
  const foodLb = $derived.by(() => {
    let s = 0;
    for (const [id, qty] of Object.entries(state.inventory)) {
      const meta = ITEMS[id];
      if (!meta || !qty) continue;
      if (typeof meta.foodDrawOrder !== 'number') continue;
      s += meta.weightLbPerUnit * qty;
    }
    return Math.round(s);
  });
  const dailyFoodLb = $derived(foodConsumedToday(state));
  const foodDays = $derived(dailyFoodLb > 0 ? Math.floor(foodLb / dailyFoodLb) : 0);

  const PACE_LABEL: Record<GameState['pace'], string> = {
    slow: 'SLOW', moderate: 'MED', fast: 'FAST', grueling: 'GRUEL'
  };

  // ---- Per-member visual helpers ----

  // True if the member has any non-cosmetic, debilitating condition.
  // Drives the rust-dashed avatar ring + ill-shake row animation.
  function isIll(m: PartyMember): boolean {
    return !m.dead && m.conditions.length > 0;
  }
  function illLabel(m: PartyMember): string | null {
    if (!isIll(m)) return null;
    return m.conditions[0].id.toUpperCase().replace(/_/g, ' ');
  }

  // Skin tone — adults are a touch darker than kids, dead is moot.
  function skinFill(_m: PartyMember): string {
    return '#e8c89a';
  }
  // Shirt color per profession. Falls back to wood-brown for unprofessioned
  // members and children.
  function shirtFill(m: PartyMember): string {
    if (m.kind === 'child') return '#6a7a4a';
    switch (m.profession) {
      case 'banker':       return '#8a5a2a';
      case 'doctor':       return '#5a3a1a';
      case 'farmer':       return '#6a8a3a';
      case 'carpenter':    return '#6a4a2a';
      case 'blacksmith':   return '#3a2a1a';
      case 'hunter':       return '#5a4a2a';
      case 'teamster':     return '#7a5a2a';
      case 'merchant':     return '#5a3a4a';
      case 'whore':        return '#a83a5a';
      case 'scout':        return '#4a5a3a';
      case 'preacher':     return '#1a1a1a';
      case 'indian_trader':return '#7a4a2a';
      case 'gunsmith':     return '#3a3a2a';
      default:             return '#5a3a1a';
    }
  }
  // True if the row should show a profession badge (top-right corner).
  function profBadge(m: PartyMember): 'doctor' | 'scout' | 'preacher' | 'hunter' | null {
    if (m.dead || m.kind === 'child') return null;
    if (m.profession === 'doctor') return 'doctor';
    if (m.profession === 'scout') return 'scout';
    if (m.profession === 'preacher') return 'preacher';
    if (m.profession === 'hunter') return 'hunter';
    return null;
  }

  // HP gradient endpoints — sage when healthy, rust when ill.
  function hpFillStart(m: PartyMember): string { return isIll(m) ? '#a83a2a' : '#6a9a4a'; }
  function hpFillEnd(m: PartyMember): string   { return isIll(m) ? '#e85a4a' : '#8bb96a'; }
  function hpTextColor(m: PartyMember): string { return isIll(m) ? '#e85a4a' : '#8bb96a'; }
  function hpRingColor(m: PartyMember): string { return isIll(m) ? '#e85a4a' : '#8bb96a'; }
  // Low HP makes the heart pulse + flips its fill to alarm red.
  function heartPulses(m: PartyMember): boolean { return !m.dead && m.health < 40; }
  function heartFill(m: PartyMember): string {
    if (heartPulses(m)) return '#e85a4a';
    return isIll(m) ? '#e85a4a' : '#8bb96a';
  }
</script>

<button type="button" class="panel party-panel" onclick={onopen} title="Click for party details">
  <!-- Header: alive-count + 7-day morale sparkline -->
  <div class="pp-head">
    <h4>PARTY · {aliveCount} of {totalCount} alive</h4>
    <svg class="sparkline" width="48" height="14" viewBox="0 0 48 14" aria-hidden="true">
      <polyline fill="none" stroke="#f5c96a" stroke-width="1.2" points={sparkPoints} />
      <circle cx="48" r="1.6" cy={Math.round(14 - (state.morale / 100) * 12) - 1} fill="#f5c96a" class="spark" />
    </svg>
  </div>

  <!-- Roster -->
  <div class="roster">
    {#each state.party as m}
      <div class="party-row" class:ill-shake={isIll(m)} class:dead={m.dead}>
        <!-- Avatar -->
        <svg class="avatar" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          {#if m.dead}
            <path d="M5 22 L5 12 Q5 8 12 8 Q19 8 19 12 L19 22 Z" fill="#5a3a1a" stroke="#3a1a08" stroke-width="0.7" />
            <text x="12" y="17" text-anchor="middle" font-size="7" fill="#3a1a08" font-family="'Special Elite',monospace" font-weight="700">RIP</text>
          {:else}
            <!-- Status ring: solid sage when healthy, dashed rust when ill -->
            {#if isIll(m)}
              <circle cx="12" cy="12" r="11" fill="none" stroke={hpRingColor(m)} stroke-width="1.5" stroke-dasharray="2 1.5" />
            {:else}
              <circle cx="12" cy="12" r="11" fill="none" stroke={hpRingColor(m)} stroke-width="1.5" opacity="0.85" />
            {/if}
            <!-- Head -->
            <circle cx="12" cy={m.kind === 'child' ? 10 : 9} r={m.kind === 'child' ? 3 : 3.2} fill={skinFill(m)} />
            <!-- Shoulders -->
            <path d={m.kind === 'child' ? 'M6 21 Q12 15 18 21' : 'M5 21 Q12 14 19 21'} fill={shirtFill(m)} />
            <!-- Headwear by profession -->
            {#if m.profession === 'banker' || m.profession === 'merchant' || m.profession === 'preacher'}
              <path d="M4 7 L20 7 L18 6 L6 6 Z" fill="#3a1a08" />
              <ellipse cx="12" cy="6.5" rx="4" ry="1.5" fill="#3a1a08" />
            {:else if m.sex === 'female' && m.kind !== 'child'}
              <path d="M7 7 Q12 3 17 7 L17 9 Q12 6 7 9 Z" fill="#c96a2a" />
            {:else if m.profession === 'scout' || m.profession === 'hunter'}
              <path d="M5 8 Q12 4 19 8 L18 10 L6 10 Z" fill="#4a5a3a" />
            {/if}
            <!-- Profession badge in upper right -->
            {#if profBadge(m) === 'doctor'}
              <g transform="translate(18 2)">
                <rect x="-2" y="-0.7" width="4" height="1.4" fill="#e85a4a" />
                <rect x="-0.7" y="-2" width="1.4" height="4" fill="#e85a4a" />
              </g>
            {:else if profBadge(m) === 'scout'}
              <g transform="translate(18 2)">
                <circle cx="-1" cy="0" r="1.4" fill="none" stroke="#4a5a3a" stroke-width="0.8" />
                <circle cx="1" cy="0" r="1.4" fill="none" stroke="#4a5a3a" stroke-width="0.8" />
              </g>
            {:else if profBadge(m) === 'preacher'}
              <g transform="translate(18 2)">
                <rect x="-0.4" y="-2" width="0.8" height="4" fill="#3a1a08" />
                <rect x="-1.5" y="-0.4" width="3" height="0.8" fill="#3a1a08" />
              </g>
            {:else if profBadge(m) === 'hunter'}
              <g transform="translate(18 2)">
                <line x1="-2" y1="-2" x2="2" y2="2" stroke="#3a1a08" stroke-width="0.9" />
                <path d="M-2 -2 L0 -2 L-2 0 Z" fill="#3a1a08" />
              </g>
            {/if}
            <!-- Fever droplets when ill -->
            {#if isIll(m)}
              <ellipse cx="8" cy="6" rx="0.8" ry="1.4" fill="#4a8bc9" class="drip" style="animation-delay:0s" />
              <ellipse cx="16" cy="6" rx="0.8" ry="1.4" fill="#4a8bc9" class="drip" style="animation-delay:0.6s" />
            {/if}
          {/if}
        </svg>

        <!-- Name + profession + HP bar (or death line) -->
        <div class="row-text">
          {#if m.dead}
            <strong class="name dead-name">{m.name}</strong>
            <span class="prof">{m.profession ?? (m.kind === 'child' ? 'child' : 'adult')}</span>
            <div class="death-line">✝ day {m.deathDay ?? '?'} · {m.deathCause ?? 'unknown'}</div>
          {:else}
            <strong class="name">{m.name}</strong>
            {#if m.isLeader}<span class="leader" title="Party leader">{ICON.status.leader}</span>{/if}
            <span class="prof">{m.profession ?? (m.kind === 'child' ? `child age ${m.age}` : 'adult')}</span>
            {#if illLabel(m)}<span class="ill-tag">{illLabel(m)}</span>{/if}
            <div class="hp-row">
              <svg class="heart" class:pulse={heartPulses(m)} width="14" height="11" viewBox="0 0 14 11" aria-hidden="true">
                <path d="M7 10 C2 6 1 3 4 2 C6 1 7 3 7 3 C7 3 8 1 10 2 C13 3 12 6 7 10 Z" fill={heartFill(m)} stroke="#3a1a08" stroke-width="0.6" />
              </svg>
              <div class="hp-bar-track">
                <div class="hp-bar-fill" style="width: {Math.max(0, Math.min(100, m.health))}%; background: linear-gradient(90deg, {hpFillStart(m)}, {hpFillEnd(m)});"></div>
                <div class="hp-bar-ticks"></div>
              </div>
              <span class="hp-num" style="color: {hpTextColor(m)};">{m.health}</span>
            </div>
          {/if}
        </div>

        <!-- Status badge -->
        <span class="status-badge" style:color={m.dead ? '#5a3a1a' : isIll(m) ? '#e85a4a' : '#8bb96a'}>
          {#if m.dead}†{:else if isIll(m)}!{:else}✓{/if}
        </span>
      </div>
    {/each}

    {#if state.dog}
      <div class="party-row dog-row">
        <span class="dog-glyph">🐕</span>
        <div class="row-text">
          <strong class="name">{state.dog.name}</strong>
          <span class="prof">dog</span>
        </div>
      </div>
    {/if}
  </div>

  <!-- Morale ribbon -->
  <div class="morale-row">
    <span class="morale-label">MORALE</span>
    <div class="morale-bar">
      <div class="morale-fill" style="width: {Math.max(0, Math.min(100, state.morale))}%;"></div>
    </div>
    <span class="morale-readout">
      <span class="morale-num">{state.morale}</span>
      {#if moraleTrend === 'down'}<span class="trend trend-down" title="trending down">{ICON.trend.down}</span>
      {:else if moraleTrend === 'up'}<span class="trend trend-up" title="trending up">{ICON.trend.up}</span>
      {:else}<span class="trend trend-flat" title="steady">{ICON.trend.flat}</span>
      {/if}
    </span>
  </div>

  <!-- Mini-stats footer (intentional duplication of top-bar — see #163) -->
  <div class="mini-stats">
    <div class="ms-cell"><div class="ms-val">🍖<span class="ms-num">{foodDays}d</span></div><div class="ms-label">FOOD</div></div>
    <div class="ms-cell"><div class="ms-val">🐂×{liveOxenCount}</div><div class="ms-label">OXEN</div></div>
    <div class="ms-cell"><div class="ms-val">⚡<span class="ms-num">{PACE_LABEL[state.pace]}</span></div><div class="ms-label">PACE</div></div>
  </div>
</button>

<style>
  .party-panel {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    padding: 12px 14px 14px;
    background: var(--c-panel);
    border: 2px solid var(--c-wood);
    border-radius: 3px;
    cursor: pointer;
    text-align: left;
    font-family: var(--f-body);
    color: var(--c-tan);
    letter-spacing: normal;
    text-transform: none;
    font-weight: normal;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .party-panel:hover:not(:disabled) {
    background: var(--c-panel); /* override global button:hover rust fill */
    border-color: var(--c-rust);
    box-shadow: 0 0 0 1px var(--c-rust) inset;
  }

  /* ---- Header ---- */
  .pp-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--c-border);
    padding-bottom: 6px;
    margin-bottom: 2px;
  }
  .pp-head h4 {
    color: var(--c-rust);
    margin: 0;
    font-size: 10px;
    letter-spacing: 0.18em;
    font-family: var(--f-mono);
    font-weight: 700;
  }
  .sparkline { opacity: 0.85; }

  /* ---- Roster ---- */
  .roster {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .party-row {
    display: grid;
    grid-template-columns: 24px 1fr auto;
    gap: 6px;
    padding: 4px;
    border-radius: 2px;
    align-items: center;
    transition: background 0.2s;
  }
  /* No per-row hover tint — the whole panel is a single button, so
     row-level hover would just stack rust on top of the panel hover.
     The .ill-shake / .dead row treatments stay; those convey state. */
  .party-row.ill-shake { background: rgba(232, 90, 74, 0.07); animation: ill 0.4s infinite; }
  .party-row.dead { opacity: 0.55; }

  .avatar { display: block; }

  .row-text {
    font-size: 13px;
    line-height: 1.25;
  }
  .name { color: var(--c-tan-bright); }
  .name.dead-name { text-decoration: line-through; color: var(--c-wood); }
  .leader { color: var(--c-rust); margin-left: 2px; }
  .prof {
    color: var(--c-wood);
    font-size: 11px;
    font-style: italic;
    margin-left: 4px;
  }
  .ill-tag {
    color: var(--c-danger);
    font-size: 10px;
    font-family: var(--f-mono);
    letter-spacing: 0.08em;
    margin-left: 4px;
  }
  .death-line {
    font-size: 10px;
    font-family: var(--f-mono);
    letter-spacing: 0.05em;
    margin-top: 2px;
    color: var(--c-wood);
  }

  /* ---- HP bar ---- */
  .hp-row {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-top: 3px;
  }
  .heart { flex-shrink: 0; }
  .heart.pulse { animation: hpPulse 1.4s ease-in-out infinite; }
  .hp-bar-track {
    flex: 1;
    height: 6px;
    background: var(--c-bg-raised);
    border: 1px solid var(--c-ink);
    border-radius: 1px;
    overflow: hidden;
    position: relative;
  }
  .hp-bar-fill {
    height: 100%;
    transition: width 0.6s ease-out;
  }
  .hp-bar-ticks {
    position: absolute;
    inset: 0;
    background-image: linear-gradient(
      90deg,
      transparent 24%,
      var(--c-ink) 24%,
      var(--c-ink) 25%,
      transparent 25%,
      transparent 49%,
      var(--c-ink) 49%,
      var(--c-ink) 50%,
      transparent 50%,
      transparent 74%,
      var(--c-ink) 74%,
      var(--c-ink) 75%,
      transparent 75%
    );
    opacity: 0.5;
    pointer-events: none;
  }
  .hp-num {
    font-size: 10px;
    font-family: var(--f-mono);
    font-weight: 700;
    min-width: 22px;
    text-align: right;
  }

  .status-badge {
    font-size: 14px;
  }

  .dog-row { grid-template-columns: 24px 1fr; }
  .dog-glyph { font-size: 18px; text-align: center; }

  /* ---- Morale ribbon ---- */
  .morale-row {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 8px;
    align-items: center;
    font-size: 11px;
    margin-top: 4px;
    padding-top: 6px;
    border-top: 1px solid var(--c-border);
  }
  .morale-label {
    color: var(--c-wood);
    font-family: var(--f-mono);
    letter-spacing: 0.1em;
  }
  .morale-bar {
    height: 8px;
    background: var(--c-bg-raised);
    border: 1px solid var(--c-ink);
    border-radius: 1px;
    overflow: hidden;
    transform-origin: left;
    animation: moralePulse 2.4s ease-in-out infinite;
  }
  .morale-fill {
    height: 100%;
    background: repeating-linear-gradient(
      135deg,
      var(--c-warn) 0 4px,
      var(--c-amber-dark) 4px 8px
    );
    transition: width 0.6s ease-out;
  }
  .morale-readout {
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .morale-num {
    color: var(--c-warn);
    font-weight: 700;
    font-family: var(--f-mono);
  }
  .trend { font-size: 10px; }
  .trend-down { color: var(--c-danger); }
  .trend-up { color: var(--c-good); }
  .trend-flat { color: var(--c-wood); }

  /* ---- Mini-stats footer ---- */
  .mini-stats {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 6px;
    font-size: 10px;
    font-family: var(--f-mono);
    letter-spacing: 0.06em;
    color: var(--c-wood);
    text-align: center;
    background: var(--c-bg-raised);
    border: 1px solid var(--c-ink);
    border-radius: 2px;
    padding: 5px;
  }
  .ms-val { color: var(--c-tan-bright); font-size: 13px; }
  .ms-num { margin-left: 2px; }

  /* ---- Animations ---- */
  @keyframes hpPulse { 0%, 100% { opacity: 0.85; } 50% { opacity: 1; } }
  @keyframes ill {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-1px); }
    75% { transform: translateX(1px); }
  }
  @keyframes drip {
    0% { transform: translateY(-2px); opacity: 0; }
    30% { opacity: 1; }
    100% { transform: translateY(8px); opacity: 0; }
  }
  @keyframes moralePulse {
    0%, 100% { transform: scaleY(1); }
    50% { transform: scaleY(0.85); }
  }
  @keyframes spark {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }
  .drip { animation: drip 1.8s ease-in infinite; }
  .spark { animation: spark 1.6s ease-in-out infinite; }
</style>
