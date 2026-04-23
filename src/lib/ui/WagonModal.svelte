<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import ItemTooltip from './ItemTooltip.svelte';
  import WagonIcon from './WagonIcon.svelte';

  let { state, onclose }: { state: GameState; onclose: () => void } = $props();

  const condition = $derived(Math.round(state.wagon.condition));
  const conditionColor = $derived(
    condition >= 70 ? '#8bb96a' :
    condition >= 40 ? '#f5c96a' :
    condition >= 20 ? '#c96a2a' : '#e85a4a'
  );
  const conditionWord = $derived(
    condition >= 85 ? 'sturdy' :
    condition >= 60 ? 'serviceable' :
    condition >= 35 ? 'worn' :
    condition >= 15 ? 'rickety' : 'about to fail'
  );

  const oxen = $derived(state.oxen);
  const aliveOxen = $derived(oxen.filter((o) => o.health > 0));

  const spareParts = [
    { key: 'wheel', label: 'Spare wheel' },
    { key: 'axle', label: 'Spare axle' },
    { key: 'tongue', label: 'Spare tongue' },
    { key: 'canvas', label: 'Canvas cover' },
    { key: 'yoke', label: 'Yoke' },
    { key: 'spare_plank', label: 'Spare plank' },
    { key: 'iron_scrap', label: 'Iron scrap' },
    { key: 'iron_toolkit', label: 'Iron toolkit' },
    { key: 'ox_shoes', label: 'Ox shoes' }
  ];
</script>

<div class="modal-backdrop">
  <div class="panel modal-body">
    <h2 style="color: var(--c-rust); display: flex; align-items: center; gap: 0.4em;">
      <WagonIcon size="1.1em" />
      <span>The Wagon</span>
    </h2>

    <!-- Condition bar -->
    <section class="section">
      <div class="section-head">CONDITION</div>
      <div class="cond-row">
        <div class="cond-bar">
          <div class="cond-fill" style="width: {condition}%; background: {conditionColor};"></div>
        </div>
        <div class="cond-text">
          <span class="cond-num" style="color: {conditionColor};">{condition}/100</span>
          <span class="cond-word">— {conditionWord}</span>
        </div>
      </div>
    </section>

    <!-- Oxen -->
    <section class="section">
      <div class="section-head">OXEN ({aliveOxen.length} alive / {oxen.length} total)</div>
      <div class="ox-list">
        {#each oxen as ox, i}
          <div class="ox-row" class:dead={ox.health === 0}>
            <span class="ox-id">#{i + 1}</span>
            <span class="ox-icon">{ox.health === 0 ? '💀' : '🐂'}</span>
            <div class="ox-bar-group">
              <div class="ox-bar-label">HEALTH</div>
              <div class="ox-bar"><div class="ox-bar-fill" style="width: {ox.health}%; background: #8bb96a;"></div></div>
              <span class="ox-bar-num">{ox.health}</span>
            </div>
            <div class="ox-bar-group">
              <div class="ox-bar-label">FATIGUE</div>
              <div class="ox-bar"><div class="ox-bar-fill" style="width: {ox.fatigue}%; background: #c96a2a;"></div></div>
              <span class="ox-bar-num">{ox.fatigue}</span>
            </div>
            <span class="ox-shoe" title={ox.shod ? 'Shod' : 'Barefoot — slower travel'}>
              {ox.shod ? '🔩' : '⚠'}
            </span>
          </div>
        {/each}
      </div>
    </section>

    <!-- Spares -->
    <section class="section">
      <div class="section-head">SPARE PARTS & TOOLS</div>
      <div class="spares-grid">
        {#each spareParts as sp}
          {@const qty = state.inventory[sp.key] ?? 0}
          <div class="spare-row" class:none={qty === 0}>
            <ItemTooltip id={sp.key}>
              {#snippet children()}
                <span>{sp.label}</span>
              {/snippet}
            </ItemTooltip>
            <span class="spare-qty" class:zero={qty === 0}>{qty}</span>
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

  .cond-row {
    display: flex;
    flex-direction: column;
    gap: 0.4em;
  }
  .cond-bar {
    height: 1.2em;
    background: var(--c-bg-raised);
    border: 2px solid var(--c-ink);
    border-radius: 3px;
    overflow: hidden;
  }
  .cond-fill {
    height: 100%;
    transition: width 0.5s, background 0.5s;
  }
  .cond-text {
    display: flex;
    gap: 0.5em;
    align-items: baseline;
  }
  .cond-num {
    font-weight: 700;
    font-size: 1.1em;
  }
  .cond-word {
    color: var(--c-wood);
    font-style: italic;
  }

  .ox-list {
    display: flex;
    flex-direction: column;
    gap: 0.3em;
  }
  .ox-row {
    display: grid;
    grid-template-columns: 2em 1.5em 1fr 1fr auto;
    gap: 0.5em;
    align-items: center;
    padding: 0.3em 0.5em;
    background: var(--c-bg-raised);
    border-radius: 3px;
    font-size: 0.85em;
  }
  .ox-row.dead { opacity: 0.4; }
  .ox-id { color: var(--c-wood); font-weight: 700; }
  .ox-icon { font-size: 1.2em; line-height: 1; }
  .ox-bar-group {
    display: grid;
    grid-template-columns: 4em 1fr 2.2em;
    gap: 0.3em;
    align-items: center;
    font-size: 0.85em;
  }
  .ox-bar-label {
    font-size: 0.7em;
    color: var(--c-wood);
    letter-spacing: 0.08em;
  }
  .ox-bar {
    height: 0.6em;
    background: var(--c-bg);
    border: 1px solid var(--c-ink);
    border-radius: 2px;
    overflow: hidden;
  }
  .ox-bar-fill {
    height: 100%;
    transition: width 0.4s;
  }
  .ox-bar-num {
    color: var(--c-tan);
    font-weight: 700;
    text-align: right;
  }
  .ox-shoe { font-size: 1em; }

  .spares-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0;
  }
  .spare-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.9em;
    padding: 0.25em 0.5em;
    border-bottom: 1px dashed rgba(138, 90, 42, 0.18);
  }
  .spare-row:nth-child(odd) {
    background: rgba(138, 90, 42, 0.06);
  }
  .spare-row:last-child {
    border-bottom: 0;
  }
  .spare-row.none {
    color: var(--c-wood);
  }
  .spare-qty {
    font-weight: 700;
    color: var(--c-rust);
  }
  .spare-qty.zero {
    color: var(--c-wood);
    font-weight: normal;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 1em;
  }
</style>
