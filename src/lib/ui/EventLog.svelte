<script lang="ts">
  import type { GameState } from '$lib/game/types';
  let { state }: { state: GameState } = $props();

  const entries = $derived([...state.eventLog].slice(-20).reverse());
</script>

<div class="panel" style="max-height: 200px; overflow-y: auto;">
  <h4 style="color: var(--c-rust); margin: 0 0 0.5em 0;">EVENT LOG</h4>
  <div style="font-size: 0.85em; line-height: 1.4;">
    {#each entries as e}
      <div>
        <span style="color: var(--c-rust);">Day {e.day}</span> · {e.text}
      </div>
    {/each}
  </div>
</div>
