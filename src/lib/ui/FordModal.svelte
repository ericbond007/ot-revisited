<script lang="ts">
  let { slot, onclose }: { slot: string; onclose: () => void } = $props();
  const qp = $derived(encodeURIComponent(slot));

  let method = $state<'ford' | 'caulk' | 'ferry' | 'wait'>('ford');
  let waitDays = $state(1);
</script>

<div style="position: fixed; inset: 0; background: rgba(26, 15, 8, 0.85); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1em;">
  <div class="panel" style="max-width: 500px; width: 100%; padding: 1.5em; border-color: var(--c-rust);">
    <h2 style="color: var(--c-rust);">River Crossing</h2>
    <p>Depth 3 ft · Current 3 mph · Ferry $5</p>

    <form method="POST" action="?/ford&slot={qp}">
      <label style="display: block; margin: 0.8em 0;">
        <input type="radio" name="method" value="ford" bind:group={method} /> Ford (fast, risky)
      </label>
      <label style="display: block; margin: 0.8em 0;">
        <input type="radio" name="method" value="caulk" bind:group={method} /> Caulk & float (2 days)
      </label>
      <label style="display: block; margin: 0.8em 0;">
        <input type="radio" name="method" value="ferry" bind:group={method} /> Hire ferry ($5)
      </label>
      <label style="display: block; margin: 0.8em 0;">
        <input type="radio" name="method" value="wait" bind:group={method} /> Wait
        {#if method === 'wait'}
          <input type="number" name="waitDays" bind:value={waitDays} min="1" max="7" style="width: 4em;" /> days
        {:else}
          <input type="hidden" name="waitDays" value={waitDays} />
        {/if}
      </label>

      <div style="display: flex; gap: 0.5em; margin-top: 1em;">
        <button type="submit">Go</button>
        <button type="button" onclick={onclose}>Cancel</button>
      </div>
    </form>
  </div>
</div>
