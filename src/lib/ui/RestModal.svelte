<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import NumberStepper from './NumberStepper.svelte';

  let { state: gameState, slot, onclose }: { state: GameState; slot: string; onclose: () => void } = $props();
  const qp = $derived(encodeURIComponent(slot));
  const hasShovel = $derived((gameState.inventory.shovel ?? 0) > 0);

  let days = $state(1);
  let digWell = $state(false);

  const shovelOptions = [
    {
      id: 'none',
      label: 'Rest only',
      sublabel: 'No shovel work',
      icon: '💤',
      selected: () => !digWell,
      apply: () => { digWell = false; }
    },
    {
      id: 'dig_well',
      label: 'Dig a well',
      sublabel: '5 hrs · chance to find water',
      icon: '🪣',
      selected: () => digWell,
      apply: () => { digWell = true; }
    }
  ];
</script>

<div class="modal-backdrop" onclick={onclose} role="presentation">
  <div class="panel modal-body" onclick={(e) => e.stopPropagation()} role="presentation">
    <h2 style="color: var(--c-rust);">🏕️ Make Camp / Rest</h2>
    <p class="lede">
      Stop for 1+ days. Heals injuries, recovers ox fatigue, and lets the Farmer forage.
      Day 1 can include shovel work if you have a shovel.
    </p>

    <form method="POST" action="?/rest&slot={qp}">
      <div class="field-row">
        <span class="field-label">DAYS</span>
        <NumberStepper name="days" bind:value={days} min={1} max={7} ariaLabel="Rest days" />
        <span class="field-hint">1 = overnight · more = extended rest</span>
      </div>

      {#if hasShovel}
        <div class="field-col">
          <span class="field-label">SHOVEL WORK <span class="tiny">(first day, 12-hr budget)</span></span>
          <div class="cards">
            {#each shovelOptions as opt}
              {@const selected = opt.selected()}
              <button
                type="button"
                class="card"
                class:selected
                onclick={opt.apply}
              >
                <span class="card-icon">{opt.icon}</span>
                <span class="card-body">
                  <span class="card-label">{opt.label}</span>
                  <span class="card-sub">{opt.sublabel}</span>
                </span>
              </button>
            {/each}
          </div>
          <!-- Keep the existing form field shape for the server action -->
          {#if digWell}
            <input type="hidden" name="shovelAction" value="dig_well" />
          {/if}
        </div>
      {:else}
        <p class="empty">No shovel in inventory — shovel work unavailable.</p>
      {/if}

      <div class="actions">
        <button type="submit">Go</button>
        <button type="button" onclick={onclose}>Cancel</button>
      </div>
    </form>
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
    max-width: 540px;
    width: 100%;
    padding: 1.5em;
    border-color: var(--c-rust);
  }
  .lede {
    color: var(--c-wood);
    font-size: 0.9em;
    margin: 0 0 1em 0;
  }

  .field-row {
    display: flex;
    align-items: center;
    gap: 0.8em;
    margin: 0.8em 0;
    flex-wrap: wrap;
  }
  .field-col {
    display: flex;
    flex-direction: column;
    gap: 0.4em;
    margin: 1em 0;
  }
  .field-label {
    font-size: 0.75em;
    letter-spacing: 0.15em;
    color: var(--c-wood);
    font-weight: 700;
  }
  .field-hint {
    color: var(--c-wood);
    font-size: 0.8em;
    font-style: italic;
  }
  .tiny {
    font-size: 0.85em;
    font-weight: normal;
    letter-spacing: 0.08em;
    color: var(--c-wood);
    font-style: italic;
  }

  .cards {
    display: flex;
    gap: 0.5em;
    flex-wrap: wrap;
  }
  .card {
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
    padding: 0.5em 0.8em;
    background: var(--c-bg-raised);
    color: var(--c-tan);
    border: 2px solid var(--c-wood);
    border-radius: 3px;
    font-family: inherit;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: none;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
    min-width: 180px;
  }
  .card:hover:not(:disabled):not(.selected) {
    background: var(--c-panel);
    border-color: var(--c-rust);
  }
  .card.selected {
    background: var(--c-rust);
    color: var(--c-tan-bright);
    border-color: var(--c-ink);
  }
  .card-icon {
    font-size: 1.3em;
    line-height: 1;
  }
  .card-body {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.1em;
  }
  .card-label {
    font-size: 0.9em;
  }
  .card-sub {
    font-size: 0.7em;
    font-weight: normal;
    color: var(--c-wood);
    letter-spacing: normal;
  }
  .card.selected .card-sub {
    color: var(--c-tan);
  }

  .empty {
    color: var(--c-wood);
    font-size: 0.85em;
    font-style: italic;
    margin: 1em 0;
  }

  .actions {
    display: flex;
    gap: 0.5em;
    margin-top: 1em;
  }
</style>
