<script lang="ts" generics="T extends string">
  import { enhance } from '$app/forms';

  interface Option {
    value: T;
    label: string;
    sublabel?: string;
    icon?: string;
  }

  let {
    label,
    name,
    action,
    current,
    options,
    disabled = false
  }: {
    label: string;
    name: string;
    action: string;
    current: T;
    options: Option[];
    disabled?: boolean;
  } = $props();

  // Each option is its own tiny form so we can submit just one field.
  // This keeps the server action simple and lets SvelteKit invalidate the page.
</script>

<div class="card-selector">
  <div class="label">{label}</div>
  <div class="cards">
    {#each options as opt}
      {@const selected = opt.value === current}
      <form method="POST" {action} use:enhance>
        <input type="hidden" {name} value={opt.value} />
        <button
          type="submit"
          class="card"
          class:selected
          disabled={disabled || selected}
          title={opt.sublabel ?? ''}
        >
          {#if opt.icon}<span class="card-icon">{opt.icon}</span>{/if}
          <span class="card-label">{opt.label}</span>
          {#if opt.sublabel}
            <span class="card-sub">{opt.sublabel}</span>
          {/if}
        </button>
      </form>
    {/each}
  </div>
</div>

<style>
  .card-selector {
    display: flex;
    align-items: center;
    gap: 0.8em;
    flex-wrap: wrap;
  }
  .label {
    font-size: 0.75em;
    letter-spacing: 0.15em;
    color: var(--c-wood);
    font-weight: 700;
    min-width: 5.5em;
  }
  .cards {
    display: flex;
    gap: 0.4em;
    flex-wrap: wrap;
  }

  .card {
    /* Override default button chrome */
    padding: 0.3em 0.65em;
    background: var(--c-bg-raised);
    color: var(--c-tan);
    border: 2px solid var(--c-wood);
    border-radius: 3px;
    font-family: inherit;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.3em;
    font-size: 0.78em;
    min-height: 0;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
  }
  .card:hover:not(:disabled) {
    border-color: var(--c-rust);
    background: var(--c-panel);
  }
  .card.selected {
    background: var(--c-rust);
    color: var(--c-tan-bright);
    border-color: var(--c-ink);
    cursor: default;
  }
  .card.selected:disabled {
    opacity: 1; /* keep visible — selected cards are intentionally disabled */
  }
  .card:disabled:not(.selected) {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .card-icon { font-size: 1em; line-height: 1; }
  .card-sub {
    display: none; /* keep row compact — sublabel shown via title tooltip */
  }
  .card.selected .card-sub { color: var(--c-tan); }
</style>
