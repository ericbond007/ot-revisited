<script lang="ts">
  import type { GameState, PartyMember } from '$lib/game/types';

  let { state, onclose }: { state: GameState; onclose: () => void } = $props();

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
    <h2 style="color: var(--c-rust);">🧑‍🤝‍🧑 The Party</h2>

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
          <div class="person-row" class:dead={m.dead}>
            <div class="person-head">
              <span class="person-name">
                {m.name}
                {#if m.isLeader}<span class="leader-star" title="Party leader">★</span>{/if}
              </span>
              <span class="person-profession">{m.profession}</span>
              <span class="person-age">age {m.age}</span>
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
          </div>
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
    background: rgba(26, 15, 8, 0.85);
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
    border-color: var(--c-rust);
  }

  .section { margin-bottom: 1.2em; }
  .section:last-of-type { margin-bottom: 1em; }
  .section-head {
    font-size: 0.72em;
    letter-spacing: 0.15em;
    color: var(--c-wood);
    font-weight: 700;
    margin-bottom: 0.4em;
  }

  .morale-row { display: flex; flex-direction: column; gap: 0.4em; }
  .morale-bar {
    height: 1.2em;
    background: var(--c-bg-raised);
    border: 2px solid var(--c-ink);
    border-radius: 3px;
    overflow: hidden;
  }
  .morale-fill { height: 100%; transition: width 0.5s, background 0.5s; }
  .morale-text { display: flex; gap: 0.5em; align-items: baseline; }
  .morale-num { font-weight: 700; font-size: 1.1em; }
  .morale-word { color: var(--c-wood); font-style: italic; }

  .people-list { display: flex; flex-direction: column; gap: 0.5em; }
  .person-row {
    display: flex;
    flex-direction: column;
    gap: 0.3em;
    padding: 0.5em 0.7em;
    background: var(--c-bg-raised);
    border-radius: 3px;
  }
  .person-row.dead {
    color: var(--c-wood);
  }
  .person-head {
    display: flex;
    gap: 0.5em;
    align-items: baseline;
    flex-wrap: wrap;
  }
  .person-name {
    font-weight: 700;
    color: var(--c-tan-bright);
    font-size: 1em;
  }
  .person-row.dead .person-name { color: var(--c-wood); text-decoration: line-through; }
  .leader-star { color: var(--c-rust); margin-left: 0.2em; }
  .person-profession {
    font-size: 0.75em;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--c-wood);
  }
  .person-age {
    font-size: 0.8em;
    color: var(--c-wood);
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
    color: var(--c-wood);
    letter-spacing: 0.08em;
  }
  .person-bar {
    height: 0.7em;
    background: var(--c-bg);
    border: 1px solid var(--c-ink);
    border-radius: 2px;
    overflow: hidden;
  }
  .person-bar-fill { height: 100%; transition: width 0.4s, background 0.4s; }
  .person-bar-num { font-weight: 700; text-align: right; }
  .person-status {
    font-size: 0.8em;
    color: var(--c-tan);
    font-style: italic;
  }
  .person-row.dead .person-status { color: var(--c-wood); }

  .actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 1em;
  }
</style>
