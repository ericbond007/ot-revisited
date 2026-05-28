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
        class="card ds-paper"
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
    font-family: var(--of-sc);
    font-size: var(--of-fs-label);
    letter-spacing: 0.15em;
    color: var(--of-ink-soft);
    font-weight: 400;
    text-transform: uppercase;
    padding: 0;
    margin-bottom: var(--of-s-2);
  }

  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: var(--of-s-2);
  }

  .card {
    /* ds-paper provides bg, double border, shadow, radius, padding, color.
       Override to add button semantics + flex column layout. */
    padding: var(--of-s-3) var(--of-s-3);
    font-family: var(--of-body);
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: none;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2em;
    text-align: left;
    transition: background 0.12s, border-color 0.12s, color 0.12s, transform 0.1s, box-shadow 0.1s;
    min-height: 5.5em;
  }
  .card:hover:not(:disabled):not(.selected) {
    border-color: var(--of-rust);
    background: var(--of-paper);
    transform: translateY(-1px);
  }
  .card.selected {
    background: var(--of-paper-soft);
    color: var(--of-ink);
    border: 3px double var(--of-rust);
    box-shadow: var(--of-btn-emboss-active), 0 0 0 1px var(--of-rust-dark);
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
    font-family: var(--of-sc);
  }
  .card-sub {
    font-weight: normal;
    font-size: 0.78em;
    color: var(--of-ink-soft);
    font-family: var(--of-body);
    line-height: 1.3;
  }
  .card.selected .card-sub {
    color: var(--of-ink-soft);
  }
  .card-disabled-reason {
    font-weight: normal;
    font-size: 0.72em;
    font-style: italic;
    color: var(--of-rust);
    margin-top: 0.15em;
  }
</style>
