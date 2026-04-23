<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { getLandmark } from '$lib/game/content/landmarks';
  import { enhance } from '$app/forms';
  import NumberStepper from './NumberStepper.svelte';

  let { state: gameState, slot, onrest, onhunt, onford, onvisit }: {
    state: GameState;
    slot: string;
    onrest?: () => void;
    onhunt?: () => void;
    onford?: () => void;
    // Visit is the entry point for any landmark interaction (trading posts
    // today; future Indian trading posts / road ranches use the same hook).
    onvisit?: () => void;
  } = $props();
  const qp = $derived(encodeURIComponent(slot));

  // You can only interact with a landmark (trade, ford) when you've physically arrived.
  const atLandmark = $derived(
    gameState.location.atLandmarkId ? getLandmark(gameState.location.atLandmarkId) : null
  );
  // Any landmark kind that has a Visit hub. For now that's just trading
  // posts; later this widens to Indian trading posts, road ranches, etc.
  const atVisitable = $derived(atLandmark?.kind === 'trading_post');
  const atRiver = $derived(atLandmark?.kind === 'river');
  const travelBlocked = $derived(atRiver);

  // Persist travelDays across remounts. localStorage + sync init means the
  // stepper is never blank on re-render.
  const storageKey = $derived(`ht_travel_days_${slot}`);
  function loadSavedDays(key: string): number {
    if (typeof window === 'undefined') return 1;
    const saved = window.localStorage.getItem(key);
    if (!saved) return 1;
    const n = parseInt(saved, 10);
    return Number.isFinite(n) && n >= 1 && n <= 10 ? n : 1;
  }
  // Initial load uses the initial slot value; subsequent slot changes are rare
  // (would only happen if the route param itself changed, which remounts).
  // svelte-ignore state_referenced_locally
  let travelDays = $state(loadSavedDays(`ht_travel_days_${slot}`));
  $effect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, String(travelDays));
  });

  let traveling = $state(false);
</script>

<div class="panel action-panel {atLandmark ? `panel-${atLandmark.kind}` : ''}">
  <form
    method="POST"
    action="?/travel&slot={qp}"
    use:enhance={() => {
      traveling = true;
      return async ({ update }) => {
        await update();
        // Hold the "traveling" indicator for the full wagon-slide duration.
        setTimeout(() => { traveling = false; }, 2500);
      };
    }}
    class="travel-form"
  >
    <NumberStepper name="days" bind:value={travelDays} min={1} max={10} disabled={traveling || travelBlocked} ariaLabel="Travel days" />
    <button type="submit" class="action travel" disabled={traveling || travelBlocked} title={travelBlocked ? 'Ford the river first' : ''}>
      <span class="action-icon">🚶</span>
      <span class="action-label">
        {#if traveling}
          Traveling…
        {:else if travelBlocked}
          Ford first
        {:else if atLandmark}
          Continue {travelDays}d
        {:else}
          Travel {travelDays}d
        {/if}
      </span>
    </button>
  </form>

  <button type="button" class="action" onclick={onrest} disabled={traveling}>
    <span class="action-icon">🏕️</span>
    <span class="action-label">Rest</span>
  </button>

  <button type="button" class="action" onclick={onhunt} disabled={traveling}>
    <span class="action-icon">🏹</span>
    <span class="action-label">Hunt</span>
  </button>

  <button
    type="button"
    class="action"
    class:highlight={atVisitable}
    onclick={onvisit}
    disabled={traveling || !atVisitable}
    title={atVisitable ? '' : 'Only when stopped at a trading post'}
  >
    <span class="action-icon">🏛️</span>
    <span class="action-label">Visit</span>
  </button>

  <button
    type="button"
    class="action"
    class:highlight={atRiver}
    onclick={onford}
    disabled={traveling || !atRiver}
    title={atRiver ? '' : 'Only when stopped at a river crossing'}
  >
    <span class="action-icon">🛶</span>
    <span class="action-label">Ford</span>
  </button>
</div>

<style>
  .action-panel {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;
    align-items: stretch;
    transition: border-color 0.25s;
  }
  .travel-form {
    display: flex;
    gap: 0.4em;
    align-items: stretch;
  }

  .action {
    /* Override default button chrome to unify icon + label layout */
    display: inline-flex;
    align-items: center;
    gap: 0.4em;
    padding: 0.4em 0.8em;
    background: var(--c-rust-dark);
    color: var(--c-tan-bright);
    border: 2px solid var(--c-ink);
    border-radius: 3px;
    font-family: inherit;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    font-size: 0.85em;
    cursor: pointer;
    transition: background 0.12s, box-shadow 0.12s;
  }
  .action:hover:not(:disabled) {
    background: var(--c-rust);
  }
  .action:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .action-icon {
    font-size: 1.2em;
    line-height: 1;
    text-transform: none;
    letter-spacing: normal;
  }
  .action.travel {
    /* Slightly wider label to accommodate dynamic text */
    min-width: 8em;
  }

  /* Contextual highlight on the action panel border per location */
  .panel-trading_post { border-color: var(--c-rust); }
  .panel-river { border-color: #4a8bc9; background: #1a1f28; }
  .panel-end { border-color: #f5c96a; }

  /* Highlight the contextually-relevant action button */
  .highlight:not(:disabled) {
    background: var(--c-rust);
    box-shadow: 0 0 0 2px var(--c-rust-dark), 0 0 10px rgba(201, 106, 42, 0.4);
    animation: action-pulse 1.6s ease-in-out infinite;
  }
  @keyframes action-pulse {
    0%, 100% { box-shadow: 0 0 0 2px var(--c-rust-dark), 0 0 10px rgba(201, 106, 42, 0.3); }
    50%      { box-shadow: 0 0 0 2px var(--c-rust-dark), 0 0 16px rgba(201, 106, 42, 0.7); }
  }
</style>
