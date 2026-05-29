<script lang="ts">
  import type { WagonModel, WagonModelId } from '$lib/game/content/wagons';
  import WagonIcon from './WagonIcon.svelte';

  let {
    models,
    value = $bindable(),
    defaultPrice
  }: {
    models: Record<WagonModelId, WagonModel>;
    value: WagonModelId;
    // Price of the default wagon (prairie schooner) — used to show refund/surcharge chip.
    defaultPrice: number;
  } = $props();

  // Render in a stable visual order: smallest → largest.
  const ORDER: WagonModelId[] = ['light', 'prairie_schooner', 'heavy'];

  function priceDelta(m: WagonModel): number {
    return m.price - defaultPrice;
  }
  function deltaLabel(delta: number): string {
    if (delta > 0) return `+$${delta}`;
    if (delta < 0) return `−$${-delta}`;
    return 'no change';
  }
</script>

<!-- Hidden native input keeps FormData submission working -->
<input type="hidden" name="wagonModel" {value} />

<div class="picker">
  {#each ORDER as id}
    {@const m = models[id]}
    {@const selected = value === id}
    {@const delta = priceDelta(m)}
    <button
      type="button"
      class="card"
      class:selected
      onclick={() => (value = id)}
      title={m.description}
    >
      <div class="icon-row">
        <WagonIcon size={id === 'heavy' ? '2.4em' : id === 'light' ? '1.7em' : '2em'} strokeWidth={1.4} />
      </div>
      <div class="name">{m.shortName}</div>
      <div class="price-row">
        <span class="price">${m.price}</span>
        {#if delta !== 0}
          <span class="delta" class:refund={delta < 0} class:surcharge={delta > 0}>
            {deltaLabel(delta)}
          </span>
        {/if}
      </div>
      <dl class="stats">
        <div><dt>Cap</dt><dd>{m.carryCapacity.toLocaleString()} lb</dd></div>
        <div><dt>Team</dt><dd>{m.optimalTeam} oxen</dd></div>
        <div><dt>Speed</dt><dd>×{m.baseSpeedMult.toFixed(2)}</dd></div>
      </dl>
      <p class="desc">{m.description}</p>
    </button>
  {/each}
</div>

<style>
  .picker {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.6em;
  }
  @media (max-width: 700px) {
    .picker { grid-template-columns: 1fr; }
  }

  .card {
    /* Reset default button chrome — these are picker panels */
    display: flex;
    flex-direction: column;
    gap: 0.4em;
    padding: 0.8em 0.8em 0.7em 0.8em;
    background: var(--of-paper-soft);
    color: var(--of-ink);
    border: 2px solid var(--of-ink-soft);
    border-radius: 4px;
    cursor: pointer;
    font-family: inherit;
    font-weight: normal;
    letter-spacing: normal;
    text-transform: none;
    text-align: left;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
  }
  .card:hover:not(.selected) {
    background: var(--of-paper);
    border-color: var(--of-rust);
  }
  .card.selected {
    background: var(--of-paper);
    border-color: var(--of-rust);
    box-shadow: 0 0 0 1px var(--of-rust) inset;
  }

  .icon-row {
    display: flex;
    justify-content: center;
    align-items: flex-end;
    min-height: 2.8em;
    color: var(--of-rust);
  }
  .name {
    font-weight: 700;
    font-size: 1.05em;
    letter-spacing: 0.05em;
    color: var(--of-rust);
    text-align: center;
  }
  .price-row {
    display: flex;
    justify-content: center;
    align-items: baseline;
    gap: 0.5em;
  }
  .price {
    font-weight: 700;
    color: var(--of-ink);
  }
  .delta {
    font-size: 0.8em;
    font-weight: 700;
    letter-spacing: 0.04em;
  }
  .delta.refund { color: #8bb96a; }
  .delta.surcharge { color: #c96a2a; }

  .stats {
    margin: 0;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.2em;
    font-size: 0.78em;
  }
  .stats div { display: flex; flex-direction: column; align-items: center; gap: 0.05em; }
  .stats dt {
    font-size: 0.9em;
    letter-spacing: 0.08em;
    color: var(--of-ink-soft);
    font-weight: 700;
    text-transform: uppercase;
  }
  .stats dd {
    margin: 0;
    font-weight: 700;
    color: var(--of-ink);
  }

  .desc {
    font-size: 0.78em;
    color: var(--of-ink-soft);
    font-style: italic;
    margin: 0;
    line-height: 1.35;
  }
</style>
