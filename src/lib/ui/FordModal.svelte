<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { getLandmark } from '$lib/game/content/landmarks';
  import CardRadio from './CardRadio.svelte';
  import NumberStepper from './NumberStepper.svelte';
  import { ICON } from '$lib/data/icon-dictionary';

  let { state: gameState, slot, onclose }: { state: GameState; slot: string; onclose: () => void } = $props();
  const qp = $derived(encodeURIComponent(slot));

  type Method = 'ford' | 'caulk' | 'ferry' | 'wait';

  let method = $state<Method>('ford');
  let waitDays = $state(1);

  const hereId = $derived(gameState.location.atLandmarkId);
  const here = $derived(hereId ? getLandmark(hereId) : null);
  // Safe defaults mirror what the server uses if the landmark has no river stats.
  const river = $derived(here?.river ?? { depthFt: 3, currentMph: 3, ferryPrice: 5 });
  const riverName = $derived(here?.name ?? 'River');

  const methodOptions = $derived([
    {
      value: 'ford' as const,
      label: 'Ford',
      sublabel: 'Walk the oxen through — fast and free but risks lost supplies',
      icon: ICON.ford_methods.ford
    },
    {
      value: 'caulk' as const,
      label: 'Caulk & Float',
      sublabel: '2 days — seal the wagon and float it across',
      icon: ICON.ford_methods.caulk
    },
    {
      value: 'ferry' as const,
      label: 'Hire Ferry',
      sublabel: `$${river.ferryPrice} — the safe (if expensive) way`,
      icon: ICON.ford_methods.ferry
    },
    {
      value: 'wait' as const,
      label: 'Wait it Out',
      sublabel: 'Camp nearby, hope the river drops',
      icon: ICON.ford_methods.wait
    }
  ]);
</script>

<div class="modal-backdrop">
  <div class="panel modal-body">
    <h2 class="modal-title river-title">{riverName}</h2>
    <p style="color: var(--c-wood);">
      Depth {river.depthFt.toFixed(1)} ft · Current {river.currentMph} mph · Ferry ${river.ferryPrice}
    </p>

    <form method="POST" action="?/ford&slot={qp}">
      <CardRadio label="Method" name="method" bind:value={method} options={methodOptions} />

      {#if method === 'wait'}
        <div class="wait-days">
          <span class="wait-label">Wait for</span>
          <NumberStepper name="waitDays" bind:value={waitDays} min={1} max={7} ariaLabel="Wait days" />
          <span>day{waitDays === 1 ? '' : 's'}</span>
        </div>
      {:else}
        <input type="hidden" name="waitDays" value={waitDays} />
      {/if}

      <div class="actions">
        <button type="submit" class="go-btn">Go</button>
        <button type="button" onclick={onclose}>Cancel</button>
      </div>
    </form>
  </div>
</div>

<style>
  /* River-blue title accent — overrides the global .modal-title rust. */
  .river-title { color: var(--c-river); }

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
    max-width: 580px;
    width: 100%;
    padding: 1.5em;
    border-color: #4a8bc9;
  }
  .wait-days {
    display: flex;
    align-items: center;
    gap: 0.6em;
    margin: 0.8em 0 0.2em 0;
    flex-wrap: wrap;
  }
  .wait-label {
    font-size: 0.85em;
    color: var(--c-wood);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-weight: 700;
  }
  .actions {
    display: flex;
    gap: 0.5em;
    margin-top: 1.2em;
  }
  .go-btn {
    font-size: 1.05em;
    padding: 0.7em 1.5em;
  }
</style>
