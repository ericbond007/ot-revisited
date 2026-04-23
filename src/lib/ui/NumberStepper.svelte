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
    ariaLabel = 'Number'
  }: {
    name?: string;
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    bulkSteps?: readonly number[];
    disabled?: boolean;
    ariaLabel?: string;
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
    class="step-btn"
    aria-label="{ariaLabel}: decrease"
    onclick={dec}
    disabled={disabled || value <= min}
  >−</button>

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

  <button
    type="button"
    class="step-btn"
    aria-label="{ariaLabel}: increase"
    onclick={inc}
    disabled={disabled || value >= max}
  >+</button>

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
    overflow: hidden;
    background: var(--c-bg-raised);
    line-height: 1;
  }
  .stepper.disabled {
    opacity: 0.55;
  }

  .step-btn {
    /* Override default button styles from theme.css for a compact, square shape */
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
  .step-btn.bulk {
    width: auto;
    padding: 0 0.6em;
    font-size: 0.85em;
    font-weight: 700;
    border-left: 1px solid rgba(0, 0, 0, 0.2);
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
