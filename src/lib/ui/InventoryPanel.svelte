<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { ITEMS } from '$lib/game/content/items';
  let { state, onopen }: { state: GameState; onopen?: () => void } = $props();

  const entries = $derived(
    Object.entries(state.inventory)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const meta = ITEMS[id];
        return {
          id,
          qty,
          name: meta?.name ?? id,
          weight: (meta?.weightLbPerUnit ?? 0) * qty,
          category: meta?.category ?? 'other'
        };
      })
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
  );

  const totalWeight = $derived(Math.round(entries.reduce((s, e) => s + e.weight, 0)));
  const capacity = $derived(state.wagon.carryCapacity);
  const weightPct = $derived(Math.min(100, Math.round((totalWeight / capacity) * 100)));
  const weightColor = $derived(
    weightPct < 70 ? '#8bb96a' :
    weightPct < 90 ? '#f5c96a' :
    weightPct < 100 ? '#c96a2a' : '#e85a4a'
  );

  const visibleCount = 5;
  const visibleEntries = $derived(entries.slice(0, visibleCount));
  const remainingCount = $derived(Math.max(0, entries.length - visibleCount));
</script>

<button type="button" class="panel inventory-panel" onclick={onopen} title="Click for full inventory">
  <div class="ip-head">
    <h4>INVENTORY</h4>
    <span class="expand-hint">▸</span>
  </div>

  <div class="stats">
    <span class="cash">💵 ${state.cash}</span>
    <span class="water">💧 {state.resources.water}/{state.resources.waterCap} gal</span>
  </div>

  <div class="weight-row">
    <span class="weight-label">Weight</span>
    <div class="weight-bar">
      <div class="weight-fill" style="width: {weightPct}%; background: {weightColor};"></div>
    </div>
    <span class="weight-num" style="color: {weightColor};">{totalWeight}/{capacity}</span>
  </div>

  <div class="preview">
    {#each visibleEntries as e}
      <div class="preview-row">
        <span class="preview-name">{e.name}</span>
        <span class="preview-qty">×{e.qty}</span>
      </div>
    {/each}
    {#if remainingCount > 0}
      <div class="preview-more">…and {remainingCount} more</div>
    {/if}
    {#if entries.length === 0}
      <div class="preview-more">(empty)</div>
    {/if}
  </div>
</button>

<style>
  .inventory-panel {
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
  .inventory-panel:hover:not(:disabled) {
    background: var(--c-panel);
    border-color: var(--c-rust);
    box-shadow: 0 0 0 1px var(--c-rust) inset;
  }

  .ip-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .ip-head h4 {
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
  .inventory-panel:hover .expand-hint {
    color: var(--c-rust);
    opacity: 1;
  }

  .stats {
    display: flex;
    gap: 0.8em;
    font-size: 0.82em;
    color: var(--c-tan-bright);
  }
  .cash { font-weight: 700; }
  .water { color: var(--c-tan); }

  .weight-row {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 0.5em;
    align-items: center;
    font-size: 0.8em;
  }
  .weight-label { color: var(--c-wood); }
  .weight-bar {
    height: 0.6em;
    background: var(--c-bg-raised);
    border: 1px solid var(--c-ink);
    border-radius: 2px;
    overflow: hidden;
  }
  .weight-fill {
    height: 100%;
    transition: width 0.4s, background 0.4s;
  }
  .weight-num {
    font-weight: 700;
    font-size: 0.9em;
    min-width: 4em;
    text-align: right;
  }

  .preview {
    display: flex;
    flex-direction: column;
    gap: 0.1em;
    font-size: 0.8em;
    margin-top: 0.2em;
  }
  .preview-row {
    display: flex;
    justify-content: space-between;
  }
  .preview-name { color: var(--c-tan); }
  .preview-qty { color: var(--c-rust); font-weight: 700; }
  .preview-more {
    color: var(--c-wood);
    font-style: italic;
    font-size: 0.9em;
  }
</style>
