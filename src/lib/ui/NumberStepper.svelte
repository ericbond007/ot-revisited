<script lang="ts">
  // Themed +/- stepper. Hidden native input keeps FormData submission working.
  // `bulkSteps` optionally renders extra forward buttons (e.g. [10, 50])
  // so food-class items don't require 50 clicks of `+`.
  let {
    name,
    value = $bindable(1),
    min = 1,
    max = 10,
    step = 1,
    bulkSteps = [],
    disabled = false,
    ariaLabel = 'Number',
    hideValue = false,
    displayValue,
    addedValue
  }: {
    name?: string;
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    bulkSteps?: readonly number[];
    disabled?: boolean;
    ariaLabel?: string;
    // Mouse-first mode — no typeable input box. Form still submits via a
    // hidden <input>. The chip between the -/+ buttons shows the count.
    hideValue?: boolean;
    // Override what the chip displays. Used when the stepper's `value`
    // is a delta (e.g. "how many to buy") but the player cares about the
    // absolute total (owned + buying). If omitted, the chip shows `value`.
    displayValue?: number;
    // When non-zero, float a colored `+N` / `N` bubble above the button
    // on that side — green over + when positive, red over − when
    // negative. Visualizes the pending change without taking row width.
    addedValue?: number;
  } = $props();

  function clamp(v: number): number {
    if (Number.isNaN(v)) return min;
    return Math.max(min, Math.min(max, v));
  }

  function dec() {
    value = clamp(value - step);
  }
  function inc() {
    value = clamp(value + step);
  }
  function incBy(n: number) {
    value = clamp(value + n);
  }
  function onInputInput(e: Event) {
    // Keep the bound value within [min, max] on every keystroke so it can
    // never go blank / NaN / out-of-range mid-edit. Empty input → min.
    const raw = (e.target as HTMLInputElement).value;
    if (raw === '') {
      value = min;
      (e.target as HTMLInputElement).value = String(min);
      return;
    }
    const n = parseFloat(raw);
    value = clamp(n);
  }
  function onInputBlur(e: Event) {
    // Final sweep on blur in case reactivity got confused.
    value = clamp(value);
    (e.target as HTMLInputElement).value = String(value);
  }
</script>

<div class="stepper" class:disabled>
  <button
    type="button"
    class="step-btn step-minus"
    aria-label="{ariaLabel}: decrease"
    onclick={dec}
    disabled={disabled || value <= min}
  >
    −
    {#if addedValue !== undefined && addedValue < 0}
      <span class="bubble bubble-sub">{addedValue}</span>
    {/if}
  </button>

  {#if hideValue}
    <!-- Mouse-first: no visible/typeable box. The chip shows either the
         raw value or an override (e.g. owned + pending = total). -->
    <span class="value-chip" aria-hidden="true">{displayValue ?? value}</span>
    <input type="hidden" {name} {value} />
  {:else}
    <input
      type="number"
      {name}
      bind:value
      {min}
      {max}
      {step}
      {disabled}
      aria-label={ariaLabel}
      oninput={onInputInput}
      onblur={onInputBlur}
    />
  {/if}

  <button
    type="button"
    class="step-btn step-plus"
    aria-label="{ariaLabel}: increase"
    onclick={inc}
    disabled={disabled || value >= max}
  >
    +
    {#if addedValue !== undefined && addedValue > 0}
      <span class="bubble bubble-add">+{addedValue}</span>
    {/if}
  </button>

  {#each bulkSteps as n}
    <button
      type="button"
      class="step-btn bulk"
      aria-label="{ariaLabel}: add {n}"
      onclick={() => incBy(n)}
      disabled={disabled || value >= max}
    >+{n}</button>
  {/each}
</div>

<style>
  .stepper {
    display: inline-flex;
    align-items: stretch;
    border: 2px solid var(--c-ink);
    border-radius: 4px;
    /* Don't clip bubbles that float above the +/- buttons. */
    overflow: visible;
    background: var(--c-bg-raised);
    line-height: 1;
  }
  .stepper.disabled {
    opacity: 0.55;
  }

  .step-btn {
    /* Override default button styles from theme.css for a compact, square shape */
    position: relative;
    padding: 0;
    width: 2.2em;
    height: 2.2em;
    min-width: unset;
    border: 0;
    border-radius: 0;
    background: var(--c-rust-dark);
    color: var(--c-tan-bright);
    font-size: 1.3em;
    font-weight: 900;
    cursor: pointer;
    text-transform: none;
    letter-spacing: 0;
    transition: background 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  /* Floating `+N` / `-N` indicator that hovers above the button which
     caused the pending change. Green for adds, red for removes. */
  .bubble {
    position: absolute;
    top: -0.55em;
    background: #8bb96a;
    color: var(--c-ink);
    font-size: 0.55em;
    font-weight: 900;
    padding: 0.15em 0.45em;
    border-radius: 10px;
    line-height: 1;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    letter-spacing: 0.02em;
  }
  .bubble-add {
    right: -0.35em;
  }
  .bubble-sub {
    left: -0.35em;
    background: #e85a4a;
    color: var(--c-tan-bright);
  }
  .step-btn.bulk {
    /* Bulk buttons are a visual shortcut, not the primary control — keep
       them small so they don't overflow narrow item rows. */
    width: auto;
    height: 1.8em;
    align-self: center;
    padding: 0 0.45em;
    margin-left: 0.15em;
    font-size: 0.72em;
    font-weight: 700;
    border-radius: 3px;
    border-left: 1px solid rgba(0, 0, 0, 0.2);
  }
  .value-chip {
    /* Read-only count display when hideValue=true. Matches the form-input
       slot in width so the layout doesn't shift between modes. */
    min-width: 2.2em;
    padding: 0 0.4em;
    background: var(--c-parchment);
    color: var(--c-ink);
    font-family: var(--f-mono);
    font-size: 1.1em;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    user-select: none;
  }
  .step-btn:hover:not(:disabled) {
    background: var(--c-rust);
  }
  .step-btn:active:not(:disabled) {
    background: var(--c-ink);
  }
  .step-btn:disabled {
    background: var(--c-panel);
    color: var(--c-wood);
    cursor: not-allowed;
  }

  input[type='number'] {
    width: 3em;
    padding: 0 0.3em;
    border: 0;
    background: var(--c-parchment);
    color: var(--c-ink);
    font-family: var(--f-mono);
    font-size: 1.1em;
    font-weight: 700;
    text-align: center;
    /* Hide the native spinner — we provide our own +/- buttons */
    -moz-appearance: textfield;
    appearance: textfield;
  }
  input[type='number']::-webkit-outer-spin-button,
  input[type='number']::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type='number']:focus {
    outline: 2px solid var(--c-rust);
    outline-offset: -2px;
  }
</style>
