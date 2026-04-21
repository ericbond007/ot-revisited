<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { ITEMS } from '$lib/game/content/items';
  let { state }: { state: GameState } = $props();

  const entries = $derived(
    Object.entries(state.inventory)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const meta = ITEMS[id];
        return {
          id,
          qty,
          name: meta?.name ?? id,
          category: meta?.category ?? 'other'
        };
      })
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
  );
</script>

<div class="panel">
  <h4 style="color: var(--c-rust); margin: 0 0 0.5em 0;">INVENTORY</h4>
  <div style="font-size: 0.85em; max-height: 300px; overflow-y: auto;">
    {#each entries as e}
      <div style="display: flex; justify-content: space-between; gap: 0.5em; padding: 1px 0;">
        <span>{e.name}</span>
        <span style="color: var(--c-wood);">{e.qty}</span>
      </div>
    {/each}
  </div>

  <h4 style="color: var(--c-rust); margin: 1em 0 0.5em 0;">SUPPLIES</h4>
  <div style="font-size: 0.85em;">
    Cash ${state.cash}<br>
    Water {state.resources.water} / {state.resources.waterCap} gal<br>
    Wagon {Math.round(state.wagon.condition)}/100
  </div>
</div>
