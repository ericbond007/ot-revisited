<script lang="ts">
  import type { GameState } from '$lib/game/types';
  let { state: gameState, slot, onclose }: { state: GameState; slot: string; onclose: () => void } = $props();

  const qp = $derived(encodeURIComponent(slot));
  const rifleCount = $derived(gameState.inventory.rifle ?? 0);
  const bullets = $derived(gameState.inventory.bullets ?? 0);

  let target = $state<'small' | 'medium' | 'big' | 'gather'>('small');
  let ammo = $state<'light' | 'moderate' | 'heavy'>('light');
  let hunters = $state(1);
</script>

<div style="position: fixed; inset: 0; background: rgba(26, 15, 8, 0.85); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1em;">
  <div class="panel" style="max-width: 500px; width: 100%; padding: 1.5em; border-color: var(--c-rust);">
    <h2 style="color: var(--c-rust);">Hunt or Gather</h2>
    <p style="font-size: 0.9em; color: var(--c-wood);">Rifles: {rifleCount} · Bullets: {bullets}</p>

    <form method="POST" action="?/hunt&slot={qp}">
      <label style="display: block; margin: 0.8em 0;">
        Target
        <select name="target" bind:value={target} style="width: 100%;">
          {#if rifleCount > 0}
            <option value="small">Small game (rabbits, birds)</option>
            <option value="medium">Medium (deer, antelope)</option>
            <option value="big">Big (buffalo, bear)</option>
          {/if}
          <option value="gather">Gather only (no rifle needed)</option>
        </select>
      </label>

      {#if target !== 'gather'}
        <label style="display: block; margin: 0.8em 0;">
          Ammo
          <select name="ammo" bind:value={ammo} style="width: 100%;">
            <option value="light">Light (5 bullets)</option>
            <option value="moderate">Moderate (10 bullets)</option>
            <option value="heavy">Heavy (20 bullets)</option>
          </select>
        </label>
      {:else}
        <input type="hidden" name="ammo" value="light" />
      {/if}

      <label style="display: block; margin: 0.8em 0;">
        People
        <select name="hunters" bind:value={hunters} style="width: 100%;">
          <option value={1}>1 (solo)</option>
          <option value={2}>2 (parallel / 1 hunter + 1 gatherer)</option>
        </select>
      </label>

      <div style="display: flex; gap: 0.5em; margin-top: 1em;">
        <button type="submit">Go</button>
        <button type="button" onclick={onclose}>Cancel</button>
      </div>
    </form>
  </div>
</div>
