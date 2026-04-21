<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { getLandmark } from '$lib/game/content/landmarks';

  let { state: gameState, slot, onhunt, onford, ontrade }: {
    state: GameState;
    slot: string;
    onhunt?: () => void;
    onford?: () => void;
    ontrade?: () => void;
  } = $props();
  const qp = $derived(encodeURIComponent(slot));

  const nextLandmark = $derived(getLandmark(gameState.location.nextLandmarkId));
  const atRiver = $derived(nextLandmark.kind === 'river');
  const nearTradingPost = $derived(nextLandmark.kind === 'trading_post' || nextLandmark.kind === 'start' || nextLandmark.kind === 'end');

  let travelDays = $state(3);
  let restDays = $state(2);
</script>

<div class="panel" style="display: flex; flex-wrap: wrap; gap: 0.5em; align-items: center;">
  <form method="POST" action="?/travel&slot={qp}" style="display: flex; gap: 0.3em; align-items: center;">
    <input type="number" name="days" bind:value={travelDays} min="1" max="10" style="width: 4em;" />
    <button type="submit">Travel</button>
  </form>

  <form method="POST" action="?/rest&slot={qp}" style="display: flex; gap: 0.3em; align-items: center;">
    <input type="number" name="days" bind:value={restDays} min="1" max="7" style="width: 4em;" />
    <button type="submit">Rest</button>
  </form>

  <form method="POST" action="?/camp&slot={qp}">
    <button type="submit">Camp</button>
  </form>

  <button type="button" onclick={onhunt}>Hunt</button>
  <button type="button" onclick={ontrade} disabled={!nearTradingPost} title={nearTradingPost ? '' : 'Only at trading posts'}>Trade</button>
  <button type="button" onclick={onford} disabled={!atRiver} title={atRiver ? '' : 'Only at river crossings'}>Ford</button>
</div>
