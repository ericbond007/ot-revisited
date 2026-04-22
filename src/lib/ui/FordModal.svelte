<script lang="ts">
  import CardRadio from './CardRadio.svelte';
  import NumberStepper from './NumberStepper.svelte';

  let { slot, onclose }: { slot: string; onclose: () => void } = $props();
  const qp = $derived(encodeURIComponent(slot));

  type Method = 'ford' | 'caulk' | 'ferry' | 'wait';

  let method = $state<Method>('ford');
  let waitDays = $state(1);

  const methodOptions = [
    {
      value: 'ford' as const,
      label: 'Ford',
      sublabel: 'Walk the oxen through — fast and free but risks lost supplies',
      icon: '🥾'
    },
    {
      value: 'caulk' as const,
      label: 'Caulk & Float',
      sublabel: '2 days — seal the wagon and float it across',
      icon: '🛶'
    },
    {
      value: 'ferry' as const,
      label: 'Hire Ferry',
      sublabel: '$5 — the safe (if expensive) way',
      icon: '⛵'
    },
    {
      value: 'wait' as const,
      label: 'Wait it Out',
      sublabel: 'Camp nearby, hope the river drops',
      icon: '⏳'
    }
  ];
</script>

<div class="modal-backdrop">
  <div class="panel modal-body">
    <h2 style="color: #4a8bc9;">River Crossing</h2>
    <p style="color: var(--c-wood);">Depth 3 ft · Current 3 mph · Ferry $5</p>

    <form method="POST" action="?/ford&slot={qp}">
      <CardRadio label="Method" name="method" bind:value={method} options={methodOptions} />

      {#if method === 'wait'}
        <div class="wait-days">
          <span class="wait-label">Wait for</span>
          <NumberStepper name="waitDays" bind:value={waitDays} min={1} max={7} ariaLabel="Wait days" />
          <span>day{waitDays === 1 ? '' : 's'}</span>
        </div>
      {:else}
        <input type="hidden" name="waitDays" value={waitDays} />
      {/if}

      <div class="actions">
        <button type="submit" class="go-btn">Go</button>
        <button type="button" onclick={onclose}>Cancel</button>
      </div>
    </form>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(26, 15, 8, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1em;
    overflow-y: auto;
  }
  .modal-body {
    max-width: 580px;
    width: 100%;
    padding: 1.5em;
    border-color: #4a8bc9;
  }
  .wait-days {
    display: flex;
    align-items: center;
    gap: 0.6em;
    margin: 0.8em 0 0.2em 0;
    flex-wrap: wrap;
  }
  .wait-label {
    font-size: 0.85em;
    color: var(--c-wood);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-weight: 700;
  }
  .actions {
    display: flex;
    gap: 0.5em;
    margin-top: 1.2em;
  }
  .go-btn {
    font-size: 1.05em;
    padding: 0.7em 1.5em;
  }
</style>
