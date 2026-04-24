<script lang="ts">
  import type { GameState, PartyMember } from '$lib/game/types';
  let { state, onopen }: { state: GameState; onopen?: () => void } = $props();

  function statusLabel(m: PartyMember): string {
    if (m.dead) return `✝ dead (${m.deathCause ?? 'unknown'})`;
    if (m.conditions.length > 0) return m.conditions.map((c) => c.id).join(', ');
    if (m.health < 50) return 'hurting';
    if (m.health < 80) return 'tired';
    return 'ok';
  }

  // Glyph per (kind, sex). Using the same family of figure emoji so widths
  // match. Dead members get the same glyph but rendered muted.
  function personGlyph(m: PartyMember): string {
    if (m.kind === 'child') return m.sex === 'female' ? '👧' : '👦';
    return m.sex === 'female' ? '👩' : '👨';
  }

  const moraleColor = $derived(
    state.morale >= 70 ? '#8bb96a' :
    state.morale >= 40 ? '#f5c96a' :
    state.morale >= 20 ? '#c96a2a' : '#e85a4a'
  );
</script>

<button type="button" class="panel party-panel" onclick={onopen} title="Click for party details">
  <div class="pp-head">
    <h4>PARTY</h4>
    <span class="expand-hint">▸</span>
  </div>

  <div class="roster">
    {#each state.party as m}
      <div class="person" class:dead={m.dead}>
        <span class="pn">
          <span class="glyph" title="{m.kind === 'child' ? 'Child' : 'Adult'} · {m.sex}">{personGlyph(m)}</span>
          <strong>{m.name}</strong>
          {#if m.isLeader}<span class="leader">*</span>{/if}
        </span>
        {#if m.profession}
          <span class="prof">({m.profession})</span>
        {:else if m.kind === 'child'}
          <span class="prof">(child, age {m.age})</span>
        {/if}
        <div class="line2">HP {m.health}/100 · {statusLabel(m)}</div>
      </div>
    {/each}
    {#if state.dog}
      <div class="person dog-row">
        <span class="pn">
          <span class="glyph" title="Dog">🐕</span>
          <strong>{state.dog.name}</strong>
        </span>
        <span class="prof">(dog)</span>
      </div>
    {/if}
  </div>

  <div class="morale-row">
    <span class="morale-label">Morale</span>
    <div class="morale-bar">
      <div class="morale-fill" style="width: {state.morale}%; background: {moraleColor};"></div>
    </div>
    <span class="morale-num" style="color: {moraleColor};">{state.morale}</span>
  </div>
</button>

<style>
  .party-panel {
    display: flex;
    flex-direction: column;
    gap: 0.4em;
    padding: 0.7em 0.9em;
    background: var(--c-panel);
    border: 2px solid var(--c-wood);
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    color: var(--c-tan);
    letter-spacing: normal;
    text-transform: none;
    font-weight: normal;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .party-panel:hover:not(:disabled) {
    background: var(--c-panel);
    border-color: var(--c-rust);
    box-shadow: 0 0 0 1px var(--c-rust) inset;
  }

  .pp-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .pp-head h4 {
    color: var(--c-rust);
    margin: 0;
    font-size: 0.75em;
    letter-spacing: 0.15em;
  }
  .expand-hint {
    color: var(--c-wood);
    font-size: 0.85em;
    opacity: 0.6;
  }
  .party-panel:hover .expand-hint {
    color: var(--c-rust);
    opacity: 1;
  }

  .roster {
    display: flex;
    flex-direction: column;
    gap: 0.2em;
  }
  .person { font-size: 0.85em; }
  .person.dead { color: var(--c-wood); }
  .pn {
    margin-right: 0.3em;
    display: inline-flex;
    align-items: center;
    gap: 0.2em;
  }
  .glyph {
    font-size: 1em;
    line-height: 1;
  }
  .leader { color: var(--c-rust); }
  .prof { color: var(--c-wood); font-size: 0.9em; }
  .line2 { font-size: 0.85em; color: var(--c-wood); }

  .morale-row {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 0.5em;
    align-items: center;
    font-size: 0.85em;
    margin-top: 0.3em;
  }
  .morale-label { color: var(--c-wood); }
  .morale-bar {
    height: 0.7em;
    background: var(--c-bg-raised);
    border: 1px solid var(--c-ink);
    border-radius: 2px;
    overflow: hidden;
  }
  .morale-fill {
    height: 100%;
    transition: width 0.4s, background 0.4s;
  }
  .morale-num {
    font-weight: 700;
    min-width: 2.2em;
    text-align: right;
  }
</style>
