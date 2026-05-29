<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { getWagon } from '$lib/game/content/wagons';
  import { grazingQuality, hitchedOxenCount } from '$lib/game/systems/oxen';

  let { state, onopen }: { state: GameState; onopen?: () => void } = $props();

  const wagonModel = $derived(getWagon(state.wagon.model));

  const condition = $derived(Math.round(state.wagon.condition));
  const conditionColor = $derived(
    condition >= 70 ? '#8bb96a' :
    condition >= 40 ? '#f5c96a' :
    condition >= 20 ? '#c96a2a' : '#e85a4a'
  );
  const canvas = $derived(Math.round(state.wagon.canvas));
  const canvasColor = $derived(
    canvas >= 60 ? '#8bb96a' :
    canvas >= 40 ? '#f5c96a' :
    canvas >= 20 ? '#c96a2a' : '#e85a4a'
  );

  const aliveOxen = $derived(state.oxen.filter((o) => o.health > 0));
  const avgOxHealth = $derived(
    aliveOxen.length > 0
      ? Math.round(aliveOxen.reduce((s, o) => s + o.health, 0) / aliveOxen.length)
      : 0
  );
  const avgOxFatigue = $derived(
    aliveOxen.length > 0
      ? Math.round(aliveOxen.reduce((s, o) => s + o.fatigue, 0) / aliveOxen.length)
      : 0
  );
  const shoelessOxen = $derived(aliveOxen.filter((o) => !o.shod).length);

  // Thin-grass warning — surfaces only on poor terrain. Players carry
  // grain to neutralize the penalty; chip vanishes when supplied.
  const grazing = $derived(grazingQuality(state));
  const grainOnHand = $derived(state.inventory.grain ?? 0);
  const oxenCount = $derived(aliveOxen.filter((o) => o.kind !== 'mule').length);
  const showGrazingWarn = $derived(grazing < 0.6 && oxenCount > 0 && grainOnHand < oxenCount);

  // Yoke deficit (#107) — each pair of oxen needs a yoke. When yokes
  // run short the surplus oxen go unhitched and don't pull. Wagon
  // events can chew through yokes (wolves, breakage); chip surfaces
  // the deficit so the player can resupply.
  const hitched = $derived(hitchedOxenCount(state));
  const unhitched = $derived(Math.max(0, oxenCount - hitched));

  const spareParts = $derived({
    wheel: state.inventory.wheel ?? 0,
    axle: state.inventory.axle ?? 0,
    tongue: state.inventory.tongue ?? 0,
    canvas: state.inventory.canvas ?? 0,
    yoke: state.inventory.yoke ?? 0,
    spare_plank: state.inventory.spare_plank ?? 0,
    ox_shoes: state.inventory.ox_shoes ?? 0
  });
</script>

<button type="button" class="panel wagon-panel" onclick={onopen} title="Click for wagon details">
  <div class="wp-head">
    <h4>WAGON <span class="wp-model">· {wagonModel.shortName}</span></h4>
    <span class="expand-hint">▸</span>
  </div>

  <div class="condition-row">
    <span class="cond-label">Condition</span>
    <div class="cond-bar">
      <div class="cond-fill" style="width: {condition}%; background: {conditionColor};"></div>
    </div>
    <span class="cond-num" style="color: {conditionColor};">{condition}</span>
    {#if state.wagon.impairment}
      <span
        class="impairment-icon"
        title="Limping — wheel impaired. Pace ×0.5, decay ×2 until a blacksmith mounts a new wheel."
      >⚠️</span>
    {/if}
  </div>

  <div class="condition-row" title="Canvas cover — leaks rain onto supplies and weakens rain-catch when low">
    <span class="cond-label">Canvas</span>
    <div class="cond-bar">
      <div class="cond-fill" style="width: {canvas}%; background: {canvasColor};"></div>
    </div>
    <span class="cond-num" style="color: {canvasColor};">{canvas}</span>
  </div>

  <div class="ox-summary">
    <span class="ox-icon">🐂</span>
    <span class="ox-count" title="Alive / total — wagon's optimal team is {wagonModel.optimalTeam}">
      {aliveOxen.length}/{state.oxen.length} · team {wagonModel.optimalTeam}
    </span>
    <span class="ox-stat" title="Average ox health">❤ {avgOxHealth}</span>
    <span class="ox-stat" title="Average ox fatigue">⚡ {avgOxFatigue}</span>
    {#if aliveOxen.length < wagonModel.minTeam}
      <span class="ox-warn" title="Below the wagon's min team — you can't move">⛔ stranded</span>
    {:else if aliveOxen.length < wagonModel.optimalTeam}
      <span class="ox-warn" title="Below optimal team — slower travel">⚠ undermanned</span>
    {/if}
    {#if shoelessOxen > 0}
      <span class="ox-warn" title="Oxen without shoes move slower">⚠ {shoelessOxen} bare</span>
    {/if}
    {#if showGrazingWarn}
      <span class="ox-warn" title="Grass is thin here — carry grain to keep oxen fed">⚠ thin grass</span>
    {/if}
    {#if unhitched > 0}
      <span class="ox-warn" title="Need 1 yoke per pair of oxen — buy yokes at any major post">⚠ {unhitched} unyoked</span>
    {/if}
  </div>

  <div class="parts-summary">
    {#each Object.entries(spareParts) as [key, qty]}
      {#if qty > 0}
        <span class="part-chip">{key.replace('_', ' ')} ×{qty}</span>
      {/if}
    {/each}
  </div>
</button>

<style>
  .wagon-panel {
    /* Override default button chrome — act like a clickable panel */
    display: flex;
    flex-direction: column;
    gap: 0.4em;
    padding: 0.7em 0.9em;
    background: var(--of-paper-soft);
    border: 2px solid var(--of-ink-soft);
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    color: var(--of-ink);
    letter-spacing: normal;
    text-transform: none;
    font-weight: normal;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .wagon-panel:hover:not(:disabled) {
    background: var(--of-paper-soft); /* override global button:hover rust fill */
    border-color: var(--of-rust);
    box-shadow: 0 0 0 1px var(--of-rust) inset;
  }

  .wp-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .wp-head h4 {
    color: var(--of-rust);
    margin: 0;
    font-size: 0.75em;
    letter-spacing: 0.15em;
  }
  .wp-model {
    font-size: 0.9em;
    color: var(--of-ink);
    font-weight: normal;
    letter-spacing: 0.05em;
    text-transform: none;
  }
  .expand-hint {
    color: var(--of-ink-soft);
    font-size: 0.85em;
    opacity: 0.6;
  }
  .wagon-panel:hover .expand-hint {
    color: var(--of-rust);
    opacity: 1;
  }

  .condition-row {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    gap: 0.5em;
    align-items: center;
    font-size: 0.85em;
  }
  .cond-label { color: var(--of-ink-soft); }
  .cond-bar {
    height: 0.7em;
    background: var(--of-paper);
    border: 1px solid var(--of-ink);
    border-radius: 2px;
    overflow: hidden;
  }
  .cond-fill {
    height: 100%;
    transition: width 0.4s, background 0.4s;
  }
  .cond-num {
    font-weight: 700;
    min-width: 2.2em;
    text-align: right;
  }

  .ox-summary {
    display: flex;
    gap: 0.6em;
    font-size: 0.8em;
    flex-wrap: wrap;
  }
  .ox-icon { font-size: 1.1em; }
  .ox-count { color: var(--of-ink); font-weight: 700; }
  .ox-stat { color: var(--of-ink-soft); }
  .ox-warn {
    color: var(--of-rust);
    font-size: 0.9em;
  }
  .impairment-icon {
    font-size: 0.9em;
    cursor: default;
  }

  .parts-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25em;
    font-size: 0.72em;
  }
  .part-chip {
    background: var(--of-paper);
    padding: 0.1em 0.5em;
    border-radius: 10px;
    color: var(--of-ink-soft);
    border: 1px solid var(--of-rule);
    white-space: nowrap;
  }
</style>
