<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { getLandmark } from '$lib/game/content/landmarks';
  import { enhance } from '$app/forms';
  import NumberStepper from './NumberStepper.svelte';
  import LandmarkChip from './LandmarkChip.svelte';

  let { state: gameState, slot, onrest, onhunt, onford, ontrade }: {
    state: GameState;
    slot: string;
    onrest?: () => void;
    onhunt?: () => void;
    onford?: () => void;
    ontrade?: () => void;
  } = $props();
  const qp = $derived(encodeURIComponent(slot));

  // You can only interact with a landmark (trade, ford) when you've physically arrived.
  const atLandmark = $derived(
    gameState.location.atLandmarkId ? getLandmark(gameState.location.atLandmarkId) : null
  );
  const atTradingPost = $derived(atLandmark?.kind === 'trading_post');
  const atRiver = $derived(atLandmark?.kind === 'river');
  // Travel is blocked at river crossings — the player must ford before continuing.
  const travelBlocked = $derived(atRiver);

  // Keep the travel-days value sticky across page reloads (form posts that don't use
  // enhance cause remounts). A tiny sessionStorage round-trip preserves user intent.
  const STORAGE_KEY = $derived(`ht_travel_days_${slot}`);
  let travelDays = $state(1);
  $effect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      const n = parseInt(saved, 10);
      if (Number.isFinite(n) && n >= 1 && n <= 10) travelDays = n;
    }
  });
  $effect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(STORAGE_KEY, String(travelDays));
  });

  let traveling = $state(false);
</script>

{#if atLandmark}
  <LandmarkChip landmark={atLandmark} />
{/if}

<div class="panel action-panel {atLandmark ? `panel-${atLandmark.kind}` : ''}">
  <form
    method="POST"
    action="?/travel&slot={qp}"
    use:enhance={() => {
      traveling = true;
      return async ({ update }) => {
        await update();
        // Hold the "traveling" indicator for the full wagon-slide duration
        // (CSS transition is 2.5s) so all other actions stay locked out
        // while the wagon is visibly in motion.
        setTimeout(() => { traveling = false; }, 2500);
      };
    }}
    style="display: flex; gap: 0.4em; align-items: center;"
  >
    <NumberStepper name="days" bind:value={travelDays} min={1} max={10} disabled={traveling || travelBlocked} ariaLabel="Travel days" />
    <button type="submit" disabled={traveling || travelBlocked} title={travelBlocked ? 'Ford the river first' : ''}>
      {#if traveling}
        Traveling…
      {:else if travelBlocked}
        Ford the river first
      {:else if atLandmark}
        Continue {travelDays} day{travelDays === 1 ? '' : 's'}
      {:else}
        Travel {travelDays} day{travelDays === 1 ? '' : 's'}
      {/if}
    </button>
  </form>

  <button type="button" onclick={onrest} disabled={traveling}>Rest / Camp</button>
  <button type="button" onclick={onhunt} disabled={traveling}>Hunt</button>
  <button type="button" class:highlight={atTradingPost} onclick={ontrade} disabled={traveling || !atTradingPost} title={atTradingPost ? '' : 'Only when stopped at a trading post'}>Trade</button>
  <button type="button" class:highlight={atRiver} onclick={onford} disabled={traveling || !atRiver} title={atRiver ? '' : 'Only when stopped at a river crossing'}>Ford</button>
</div>

<style>
  .action-panel {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;
    align-items: center;
    transition: border-color 0.25s;
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
