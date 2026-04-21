<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { getLandmark } from '$lib/game/content/landmarks';
  import { enhance } from '$app/forms';
  import NumberStepper from './NumberStepper.svelte';

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

  let travelDays = $state(1);
  let traveling = $state(false);
</script>

<div class="panel" style="display: flex; flex-wrap: wrap; gap: 0.5em; align-items: center;">
  {#if atLandmark}
    <div class="at-landmark-badge">
      At <strong>{atLandmark.name}</strong>
    </div>
  {/if}

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
    <NumberStepper name="days" bind:value={travelDays} min={1} max={10} disabled={traveling} ariaLabel="Travel days" />
    <button type="submit" disabled={traveling}>
      {#if traveling}
        Traveling…
      {:else if atLandmark}
        Continue ({travelDays} day{travelDays === 1 ? '' : 's'})
      {:else}
        Travel {travelDays} day{travelDays === 1 ? '' : 's'}
      {/if}
    </button>
  </form>

  <button type="button" onclick={onrest} disabled={traveling}>Rest / Camp</button>
  <button type="button" onclick={onhunt} disabled={traveling}>Hunt</button>
  <button type="button" onclick={ontrade} disabled={traveling || !atTradingPost} title={atTradingPost ? '' : 'Only when stopped at a trading post'}>Trade</button>
  <button type="button" onclick={onford} disabled={traveling || !atRiver} title={atRiver ? '' : 'Only when stopped at a river crossing'}>Ford</button>
</div>

<style>
  .at-landmark-badge {
    background: var(--c-parchment);
    color: var(--c-ink);
    border: 2px solid var(--c-rust);
    padding: 0.3em 0.8em;
    border-radius: 3px;
    font-size: 0.9em;
    letter-spacing: 0.05em;
  }
  .at-landmark-badge strong {
    color: var(--c-rust-dark);
    font-weight: 700;
  }
</style>
