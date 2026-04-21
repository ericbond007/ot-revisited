<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { getLandmark } from '$lib/game/content/landmarks';
  import { enhance } from '$app/forms';

  let { state: gameState, slot, onrest, onhunt, onford, ontrade }: {
    state: GameState;
    slot: string;
    onrest?: () => void;
    onhunt?: () => void;
    onford?: () => void;
    ontrade?: () => void;
  } = $props();
  const qp = $derived(encodeURIComponent(slot));

  const nextLandmark = $derived(getLandmark(gameState.location.nextLandmarkId));
  const atRiver = $derived(nextLandmark.kind === 'river');
  const nearTradingPost = $derived(nextLandmark.kind === 'trading_post' || nextLandmark.kind === 'start' || nextLandmark.kind === 'end');

  let travelDays = $state(1);
  let traveling = $state(false);
</script>

<div class="panel" style="display: flex; flex-wrap: wrap; gap: 0.5em; align-items: center;">
  <form
    method="POST"
    action="?/travel&slot={qp}"
    use:enhance={() => {
      traveling = true;
      return async ({ update }) => {
        await update();
        // Hold the "traveling" indicator just long enough for the wagon
        // slide to finish (CSS transition is 1.4s).
        setTimeout(() => { traveling = false; }, 1400);
      };
    }}
    style="display: flex; gap: 0.3em; align-items: center;"
  >
    <input type="number" name="days" bind:value={travelDays} min="1" max="10" style="width: 4em;" disabled={traveling} />
    <button type="submit" disabled={traveling}>
      {traveling ? 'Traveling…' : `Travel ${travelDays} day${travelDays === 1 ? '' : 's'}`}
    </button>
  </form>

  <button type="button" onclick={onrest} disabled={traveling}>Rest / Camp</button>
  <button type="button" onclick={onhunt} disabled={traveling}>Hunt</button>
  <button type="button" onclick={ontrade} disabled={traveling || !nearTradingPost} title={nearTradingPost ? '' : 'Only at trading posts'}>Trade</button>
  <button type="button" onclick={onford} disabled={traveling || !atRiver} title={atRiver ? '' : 'Only at river crossings'}>Ford</button>
</div>
