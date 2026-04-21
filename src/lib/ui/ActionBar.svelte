<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { getLandmark } from '$lib/game/content/landmarks';

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

  let travelDays = $state(3);
</script>

<div class="panel" style="display: flex; flex-wrap: wrap; gap: 0.5em; align-items: center;">
  <form method="POST" action="?/travel&slot={qp}" style="display: flex; gap: 0.3em; align-items: center;">
    <input type="number" name="days" bind:value={travelDays} min="1" max="10" style="width: 4em;" />
    <button type="submit">Travel</button>
  </form>

  <button type="button" onclick={onrest}>Rest / Camp</button>
  <button type="button" onclick={onhunt}>Hunt</button>
  <button type="button" onclick={ontrade} disabled={!nearTradingPost} title={nearTradingPost ? '' : 'Only at trading posts'}>Trade</button>
  <button type="button" onclick={onford} disabled={!atRiver} title={atRiver ? '' : 'Only at river crossings'}>Ford</button>
</div>
