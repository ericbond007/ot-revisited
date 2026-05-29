<script lang="ts">
  import type { GameState, PartyMember } from '$lib/game/types';
  import { icon, ICON } from '$lib/data/icon-dictionary';

  let { state, onclose, onselect }: {
    state: GameState;
    onclose: () => void;
    onselect?: (memberId: string) => void;
  } = $props();

  function healthColor(h: number): string {
    if (h >= 70) return '#8bb96a';
    if (h >= 40) return '#f5c96a';
    if (h >= 20) return '#c96a2a';
    return '#e85a4a';
  }
  function healthWord(h: number): string {
    if (h >= 85) return 'hale';
    if (h >= 60) return 'ok';
    if (h >= 35) return 'tired';
    if (h >= 15) return 'hurting';
    return 'near death';
  }
  function statusLine(m: PartyMember): string {
    if (m.dead) return `dead — ${m.deathCause ?? 'unknown'}${m.deathDay ? ` · day ${m.deathDay}` : ''}`;
    if (m.conditions.length > 0) {
      return m.conditions
        .map((c) => `${c.id.replace(/_/g, ' ')} (${c.daysSinceOnset}d)`)
        .join(', ');
    }
    return healthWord(m.health);
  }

  function personGlyph(m: PartyMember): string {
    if (m.kind === 'child') return icon('people', m.sex === 'female' ? 'child_female' : 'child_male');
    return icon('people', m.sex === 'female' ? 'adult_female' : 'adult_male');
  }
  function personRoleLabel(m: PartyMember): string {
    if (m.kind === 'child') return 'CHILD';
    return m.profession ? m.profession.toUpperCase() : 'ADULT';
  }

  const moraleColor = $derived(
    state.morale >= 70 ? '#8bb96a' :
    state.morale >= 40 ? '#f5c96a' :
    state.morale >= 20 ? '#c96a2a' : '#e85a4a'
  );
  const moraleWord = $derived(
    state.morale >= 85 ? 'eager' :
    state.morale >= 60 ? 'steady' :
    state.morale >= 35 ? 'grumbling' :
    state.morale >= 15 ? 'miserable' : 'mutinous'
  );

  const aliveCount = $derived(state.party.filter((p) => !p.dead).length);
</script>

<div class="modal-backdrop" onclick={onclose} role="presentation">
  <div class="panel modal-body" onclick={(e) => e.stopPropagation()} role="presentation">
    <h2 class="modal-title">🧑‍🤝‍🧑 The Party</h2>

    <!-- Morale -->
    <section class="section">
      <div class="section-head">MORALE</div>
      <div class="morale-row">
        <div class="morale-bar">
          <div class="morale-fill" style="width: {state.morale}%; background: {moraleColor};"></div>
        </div>
        <div class="morale-text">
          <span class="morale-num" style="color: {moraleColor};">{state.morale}/100</span>
          <span class="morale-word">— {moraleWord}</span>
        </div>
      </div>
    </section>

    <!-- Party roster -->
    <section class="section">
      <div class="section-head">ROSTER ({aliveCount} alive / {state.party.length} total)</div>
      <div class="people-list">
        {#each state.party as m}
          {@const hc = healthColor(m.health)}
          <button
            type="button"
            class="person-row"
            class:dead={m.dead}
            class:child={m.kind === 'child'}
            onclick={() => onselect?.(m.id)}
            title="Click for details"
          >
            <div class="person-head">
              <span class="person-glyph" title="{m.kind === 'child' ? 'Child' : 'Adult'} · {m.sex}">{personGlyph(m)}</span>
              <span class="person-name">
                {m.name}
                {#if m.isLeader}<span class="leader-star" title="Party leader">{ICON.status.leader}</span>{/if}
              </span>
              <span class="person-profession">{personRoleLabel(m)}</span>
              <span class="person-age">age {m.age}</span>
              <span class="chev">▸</span>
            </div>
            <div class="person-bar-row">
              <div class="person-bar-label">HEALTH</div>
              <div class="person-bar">
                <div class="person-bar-fill" style="width: {m.health}%; background: {hc};"></div>
              </div>
              <span class="person-bar-num" style="color: {hc};">{m.health}</span>
            </div>
            <div class="person-status">
              {statusLine(m)}
            </div>
          </button>
        {/each}
      </div>
    </section>

    <div class="actions">
      <button type="button" onclick={onclose}>Close</button>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(42, 29, 12, 0.80);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1em;
    overflow-y: auto;
  }
  .modal-body {
    max-width: 640px;
    width: 100%;
    padding: 1.5em;
    border-color: var(--of-rust);
  }

  .section { margin-bottom: 1.2em; }
  .section:last-of-type { margin-bottom: 1em; }
  .section-head {
    font-size: 0.72em;
    letter-spacing: 0.15em;
    color: var(--of-ink-soft);
    font-weight: 700;
    margin-bottom: 0.4em;
  }

  .morale-row { display: flex; flex-direction: column; gap: 0.4em; }
  .morale-bar {
    height: 1.2em;
    background: var(--of-paper);
    border: 2px solid var(--of-ink);
    border-radius: 3px;
    overflow: hidden;
  }
  .morale-fill { height: 100%; transition: width 0.5s, background 0.5s; }
  .morale-text { display: flex; gap: 0.5em; align-items: baseline; }
  .morale-num { font-weight: 700; font-size: 1.1em; }
  .morale-word { color: var(--of-ink-soft); font-style: italic; }

  .people-list { display: flex; flex-direction: column; gap: 0.5em; }
  .person-row {
    /* Override default button chrome — acts like a clickable row */
    display: flex;
    flex-direction: column;
    gap: 0.3em;
    padding: 0.5em 0.7em;
    background: var(--of-paper);
    border: 2px solid transparent;
    border-radius: 3px;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    color: var(--of-ink);
    font-weight: normal;
    letter-spacing: normal;
    text-transform: none;
    transition: border-color 0.12s, background 0.12s;
  }
  .person-row:hover:not(:disabled) {
    border-color: var(--of-rust);
  }
  .person-row.dead {
    color: var(--of-ink-soft);
    cursor: pointer; /* still clickable to see death details */
  }
  .chev {
    color: var(--of-ink-soft);
    font-size: 0.85em;
    opacity: 0.5;
    margin-left: 0.4em;
    transition: opacity 0.12s, color 0.12s;
  }
  .person-row:hover .chev {
    color: var(--of-rust);
    opacity: 1;
  }
  .person-head {
    display: flex;
    gap: 0.5em;
    align-items: center;
    flex-wrap: wrap;
  }
  .person-glyph {
    font-size: 1.4em;
    line-height: 1;
  }
  .person-row.child {
    border-left: 3px solid var(--of-rust);
    padding-left: calc(0.7em - 3px);
  }
  .person-name {
    font-weight: 700;
    color: var(--of-ink);
    font-size: 1em;
  }
  .person-row.dead .person-name { color: var(--of-ink-soft); text-decoration: line-through; }
  .leader-star { color: var(--of-rust); margin-left: 0.2em; }
  .person-profession {
    font-size: 0.75em;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--of-ink-soft);
  }
  .person-age {
    font-size: 0.8em;
    color: var(--of-ink-soft);
    margin-left: auto;
  }
  .person-bar-row {
    display: grid;
    grid-template-columns: 4em 1fr 2.5em;
    gap: 0.4em;
    align-items: center;
    font-size: 0.85em;
  }
  .person-bar-label {
    font-size: 0.7em;
    color: var(--of-ink-soft);
    letter-spacing: 0.08em;
  }
  .person-bar {
    height: 0.7em;
    background: var(--of-paper);
    border: 1px solid var(--of-ink);
    border-radius: 2px;
    overflow: hidden;
  }
  .person-bar-fill { height: 100%; transition: width 0.4s, background 0.4s; }
  .person-bar-num { font-weight: 700; text-align: right; }
  .person-status {
    font-size: 0.8em;
    color: var(--of-ink);
    font-style: italic;
  }
  .person-row.dead .person-status { color: var(--of-ink-soft); }

  .actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 1em;
  }
</style>
