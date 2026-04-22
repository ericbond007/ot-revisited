<script lang="ts" generics="T extends string | number">
  interface Option {
    value: T;
    label: string;
    sublabel?: string;
    icon?: string;
    disabled?: boolean;
    disabledReason?: string;
  }

  let {
    label,
    name,
    value = $bindable(),
    options,
    columns = 0
  }: {
    label?: string;
    name?: string;          // hidden input name for form submission
    value: T;
    options: Option[];
    columns?: number;       // 0 = auto-fit
  } = $props();
</script>

<fieldset class="card-radio-group">
  {#if label}<legend>{label}</legend>{/if}

  <div
    class="cards"
    style={columns > 0 ? `grid-template-columns: repeat(${columns}, 1fr);` : ''}
  >
    {#each options as opt}
      {@const selected = opt.value === value}
      <button
        type="button"
        class="card"
        class:selected
        disabled={opt.disabled}
        title={opt.disabled ? (opt.disabledReason ?? '') : ''}
        onclick={() => { if (!opt.disabled) value = opt.value; }}
      >
        {#if opt.icon}<span class="card-icon">{opt.icon}</span>{/if}
        <span class="card-label">{opt.label}</span>
        {#if opt.sublabel}
          <span class="card-sub">{opt.sublabel}</span>
        {/if}
        {#if opt.disabled && opt.disabledReason}
          <span class="card-disabled-reason">{opt.disabledReason}</span>
        {/if}
      </button>
    {/each}
  </div>

  {#if name}
    <input type="hidden" {name} value={String(value)} />
  {/if}
</fieldset>

<style>
  .card-radio-group {
    border: 0;
    padding: 0;
    margin: 0.6em 0;
  }
  legend {
    font-size: 0.75em;
    letter-spacing: 0.15em;
    color: var(--c-wood);
    font-weight: 700;
    text-transform: uppercase;
    padding: 0;
    margin-bottom: 0.4em;
  }

  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 0.5em;
  }

  .card {
    /* Override default button chrome */
    padding: 0.7em 0.8em;
    background: var(--c-bg-raised);
    color: var(--c-tan);
    border: 2px solid var(--c-wood);
    border-radius: 3px;
    font-family: inherit;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: none;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2em;
    text-align: left;
    transition: background 0.12s, border-color 0.12s, color 0.12s, transform 0.1s;
    min-height: 5.5em;
  }
  .card:hover:not(:disabled) {
    border-color: var(--c-rust);
    background: var(--c-panel);
    transform: translateY(-1px);
  }
  .card.selected {
    background: var(--c-rust);
    color: var(--c-tan-bright);
    border-color: var(--c-ink);
    box-shadow: 0 0 0 2px var(--c-rust-dark);
  }
  .card:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .card:disabled:hover {
    transform: none;
  }

  .card-icon {
    font-size: 1.8em;
    line-height: 1;
    margin-bottom: 0.1em;
  }
  .card-label {
    font-size: 0.95em;
  }
  .card-sub {
    font-weight: normal;
    font-size: 0.78em;
    color: var(--c-wood);
    line-height: 1.3;
  }
  .card.selected .card-sub {
    color: var(--c-tan);
  }
  .card-disabled-reason {
    font-weight: normal;
    font-size: 0.72em;
    font-style: italic;
    color: var(--c-rust);
    margin-top: 0.15em;
  }
</style>
