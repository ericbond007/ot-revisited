<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import CardSelector from './CardSelector.svelte';

  let { state: gameState, slot }: { state: GameState; slot: string } = $props();
  const qp = $derived(encodeURIComponent(slot));

  const paceAction = $derived(`?/setPace&slot=${qp}`);
  const rationsAction = $derived(`?/setRations&slot=${qp}`);

  const paceOptions: Array<{ value: GameState['pace']; label: string; sublabel: string; icon: string }> = [
    { value: 'slow',     label: 'Slow',     sublabel: '12 mi/day · easy on team',   icon: '🐢' },
    { value: 'moderate', label: 'Moderate', sublabel: '18 mi/day · baseline',        icon: '🐂' },
    { value: 'fast',     label: 'Fast',     sublabel: '24 mi/day · +fatigue',        icon: '🏃' },
    { value: 'grueling', label: 'Grueling', sublabel: '30 mi/day · injury risk',     icon: '⚡' }
  ];

  const rationsOptions: Array<{ value: GameState['rations']; label: string; sublabel: string; icon: string }> = [
    { value: 'meager',  label: 'Low',    sublabel: '1 lb/person · health drain', icon: '🥣' },
    { value: 'normal',  label: 'Medium', sublabel: '2 lb/person · baseline',     icon: '🍽️' },
    { value: 'filling', label: 'High',   sublabel: '3 lb/person · +morale',      icon: '🍖' }
  ];
</script>

<div class="panel settings-panel">
  <CardSelector
    label="PACE"
    name="pace"
    action={paceAction}
    current={gameState.pace}
    options={paceOptions}
  />
  <CardSelector
    label="RATIONS"
    name="rations"
    action={rationsAction}
    current={gameState.rations}
    options={rationsOptions}
  />
</div>

<style>
  .settings-panel {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4em 1.5em;
    padding: 0.5em 0.8em;
    align-items: center;
  }
</style>
