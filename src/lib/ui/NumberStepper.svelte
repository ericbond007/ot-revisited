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

  // Modifier-key bulk: Ctrl = ×5, Shift = ×10, both = ×50. Plain click
  // stays at ±step. Works on both the − and + buttons. Keeps
  // mouse-first play fast without needing a bulkSteps UI row for every
  // item category.
  function bulkFactor(e: MouseEvent | KeyboardEvent): number {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.shiftKey) return 50;
    if (ctrl) return 5;
    if (e.shiftKey) return 10;
    return 1;
  }

  function dec(e?: MouseEvent | KeyboardEvent) {
    const factor = e ? bulkFactor(e) : 1;
    value = clamp(value - step * factor);
  }
  function inc(e?: MouseEvent | KeyboardEvent) {
    const factor = e ? bulkFactor(e) : 1;
    value = clamp(value + step * factor);
  }
  function incBy(n: number) {
    value = clamp(value + n);
  }
  function onInputInput(e: Event) {
    // Update `value` only when the input parses cleanly — let the field
    // briefly hold an empty / partial string while the user is typing.
    // Final coercion happens on blur. (Trying to slam the DOM mid-edit
    // races with reactive writes and produces a blanking field.)
    const raw = (e.target as HTMLInputElement).value;
    if (raw === '') return;
    const n = parseFloat(raw);
    if (Number.isFinite(n)) value = clamp(n);
  }
  function onInputBlur(e: Event) {
    // Coerce on blur — handles empty, NaN, out-of-range.
    const raw = (e.target as HTMLInputElement).value;
    const parsed = raw === '' ? min : parseFloat(raw);
    value = clamp(Number.isFinite(parsed) ? parsed : min);
    (e.target as HTMLInputElement).value = String(value);
  }
</script>

<div class="stepper ds-stepper" class:disabled>
  <button
    type="button"
    class="step-btn ds-stepper-btn step-minus"
    aria-label="{ariaLabel}: decrease (Ctrl=×5, Shift=×10)"
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
    <span class="value-chip ds-stepper-val" aria-hidden="true">{displayValue ?? value}</span>
    <input type="hidden" {name} {value} />
  {:else}
    <!-- One-way value binding instead of `bind:value` — bind: races with
         oninput on number inputs, producing a blanking field when the
         user types or backspaces. We update `value` from oninput/onblur
         and let Svelte reactively write `value={value}` back to the DOM. -->
    <input
      type="number"
      {name}
      value={value}
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
    class="step-btn ds-stepper-btn step-plus"
    aria-label="{ariaLabel}: increase (Ctrl=×5, Shift=×10)"
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
      class="bulk ds-bulk-chip"
      aria-label="{ariaLabel}: add {n}"
      onclick={() => incBy(n)}
      disabled={disabled || value >= max}
    >+{n}</button>
  {/each}
</div>

<style>
  .stepper {
    /* ds-stepper sets height/bg/border/shadow; align-items:stretch so
       buttons fill the full channel height. */
    align-items: stretch;
    /* Don't clip bubbles that float above the +/- buttons. */
    overflow: visible;
    line-height: 1;
  }
  .stepper.disabled {
    opacity: 0.55;
  }

  .step-btn {
    /* ds-stepper-btn sets bg/color/font/cursor; these overrides make
       buttons fill the full channel height in stretch mode. */
    position: relative;
    padding: 0;
    width: 2.2em;
    height: 100%;
    min-width: unset;
    border: 0;
    border-radius: 0;
    font-size: 1.3em;
    font-weight: 900;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  /* Floating `+N` / `-N` indicator that hovers above the button which
     caused the pending change. Green for adds, red for removes. */
  .bubble {
    position: absolute;
    top: -0.55em;
    background: var(--of-good);
    color: var(--of-paper-soft);
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
    background: var(--of-bad);
    color: var(--of-paper-soft);
  }
  .bulk {
    /* ds-bulk-chip sets most styles; override height to match stretch context */
    align-self: center;
    margin-left: 0.15em;
    height: 1.8em;
    font-size: 0.72em;
    border-left: 1px solid var(--of-rule);
  }
  .value-chip {
    /* ds-stepper-val sets font/color/min-width; add padding + flex centering */
    padding: 0 0.4em;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    user-select: none;
  }

  input[type='number'] {
    width: 3em;
    padding: 0 0.3em;
    border: 0;
    background: var(--of-paper-soft);
    color: var(--of-ink);
    font-family: var(--of-mono);
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
    outline: 2px solid var(--of-rust);
    outline-offset: -2px;
  }
</style>
