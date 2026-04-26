<script lang="ts">
  // Flat labeled stat bar — the simple cousin of PartyPanel's HP bar
  // (which has tick marks + gradient fill). Reference visual:
  // docs/handoff/components/src/stat-bars.html.
  //
  // Threshold-colored fill: sage when ≥66%, warn when ≥33%, rust below.
  // Override via `color` prop when a fixed hue is wanted (e.g. always
  // amber for morale).
  interface Props {
    label: string;
    /** Current value, in the same units as `max`. */
    value: number;
    /** Bar tops out here. Defaults to 100 (percentage-style). */
    max?: number;
    /** Optional pre-formatted right-hand readout. Defaults to `value`
     *  when max=100, otherwise `value / max`. */
    readout?: string;
    /** Force a specific fill color (CSS var name without `--` prefix
     *  works too, e.g. `c-warn`). When omitted, threshold-based. */
    color?: string;
  }
  let { label, value, max = 100, readout, color }: Props = $props();

  const pct = $derived(Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100)));
  const ratio = $derived(value / Math.max(1, max));
  // Threshold palette — keep in sync with the prototype's color picks.
  const fillColor = $derived.by(() => {
    if (color) return color.startsWith('c-') ? `var(--${color})` : color;
    if (ratio >= 0.66) return 'var(--c-good)';
    if (ratio >= 0.33) return 'var(--c-warn)';
    return 'var(--c-rust)';
  });
  const numColor = $derived.by(() => {
    if (color) return color.startsWith('c-') ? `var(--${color})` : color;
    if (ratio >= 0.66) return 'var(--c-good)';
    if (ratio >= 0.33) return 'var(--c-warn)';
    return 'var(--c-rust)';
  });
  const formatted = $derived(
    readout ?? (max === 100 ? String(Math.round(value)) : `${value} / ${max}`)
  );
</script>

<div class="stat-bar">
  <div class="row">
    <span class="label">{label}</span>
    <span class="num" style="color: {numColor};">{formatted}</span>
  </div>
  <div class="track">
    <div class="fill" style="width: {pct}%; background: {fillColor};"></div>
  </div>
</div>

<style>
  .stat-bar { display: flex; flex-direction: column; gap: 3px; }
  .row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    letter-spacing: 0.05em;
  }
  .label { color: var(--c-wood); font-family: var(--f-mono); }
  .num { font-weight: 700; font-family: var(--f-mono); }
  .track {
    height: 8px;
    background: var(--c-bg-raised);
    border: 1px solid var(--c-ink);
    border-radius: 2px;
    overflow: hidden;
  }
  .fill { height: 100%; transition: width 0.6s ease-out, background 0.4s; }
</style>
