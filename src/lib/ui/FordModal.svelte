<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { getLandmark } from '$lib/game/content/landmarks';
  import { getTribeAttitude } from '$lib/game/systems/tribe-relations';
  import { NATIVE_FERRY_MIN_ATTITUDE } from '$lib/game/actions/ford';
  import CardRadio from './CardRadio.svelte';
  import NumberStepper from './NumberStepper.svelte';
  import LandmarkIcon, { hasLandmarkIcon } from '$lib/ui/landmark-icons/LandmarkIcon.svelte';
  import { ICON } from '$lib/data/icon-dictionary';

  let { state: gameState, slot, onclose }: { state: GameState; slot: string; onclose: () => void } = $props();
  const qp = $derived(encodeURIComponent(slot));

  type Method = 'ford' | 'caulk' | 'ferry' | 'wait' | 'native_ferry';

  let method = $state<Method>('ford');
  let waitDays = $state(1);

  const hereId = $derived(gameState.location.atLandmarkId);
  const here = $derived(hereId ? getLandmark(hereId) : null);
  // Safe defaults mirror what the server uses if the landmark has no river stats.
  const river = $derived(here?.river ?? { depthFt: 3, currentMph: 3, ferryPrice: 5 });
  const riverName = $derived(here?.name ?? 'River');

  // #238 Native ferry — show the 5th option when the landmark is wired
  // for it AND the tribe is friendly enough AND the party can pay.
  const nativeFerryAvailable = $derived(() => {
    const nf = river.nativeFerry;
    if (!nf) return false;
    if (getTribeAttitude(gameState, nf.tribeId) < NATIVE_FERRY_MIN_ATTITUDE) return false;
    const have = gameState.inventory[nf.priceItem] ?? 0;
    return have >= nf.priceQty;
  });

  const methodOptions = $derived(() => {
    type Option = { value: Method; label: string; sublabel: string; icon: string };
    const base: Option[] = [
      {
        value: 'ford',
        label: 'Ford',
        sublabel: 'Walk the oxen through — fast and free but risks lost supplies',
        icon: ICON.ford_methods.ford
      },
      {
        value: 'caulk',
        label: 'Caulk & Float',
        sublabel: '2 days — seal the wagon and float it across',
        icon: ICON.ford_methods.caulk
      },
      {
        value: 'ferry',
        label: 'Hire Ferry',
        sublabel: `$${river.ferryPrice} — the safe (if expensive) way`,
        icon: ICON.ford_methods.ferry
      },
      {
        value: 'wait',
        label: 'Wait it Out',
        sublabel: 'Camp nearby, hope the river drops',
        icon: ICON.ford_methods.wait
      }
    ];
    if (nativeFerryAvailable() && river.nativeFerry) {
      base.splice(3, 0, {
        value: 'native_ferry',
        label: 'Native ferry',
        sublabel: river.nativeFerry.blurb,
        icon: ICON.ford_methods.native
      });
    }
    return base;
  });
</script>

<div class="modal-backdrop">
  <div class="panel modal-body">
    <div class="river-header">
      {#if hereId && hasLandmarkIcon(hereId)}
        <LandmarkIcon id={hereId} size={48} />
      {/if}
      <h2 class="modal-title river-title">{riverName}</h2>
    </div>
    <p style="color: var(--c-wood);">
      Depth {river.depthFt.toFixed(1)} ft · Current {river.currentMph} mph · Ferry ${river.ferryPrice}
    </p>

    <form method="POST" action="?/ford&slot={qp}">
      <CardRadio label="Method" name="method" bind:value={method} options={methodOptions()} />

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
  .river-header {
    display: flex;
    align-items: center;
    gap: 0.6em;
  }
  .river-header .modal-title { margin: 0; }

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
