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
    if (color) return color.startsWith('of-') ? `var(--${color})` : color;
    if (ratio >= 0.66) return 'var(--of-good)';
    if (ratio >= 0.33) return 'var(--of-warn)';
    return 'var(--of-bad)';
  });
  const numColor = $derived.by(() => {
    if (color) return color.startsWith('of-') ? `var(--${color})` : color;
    if (ratio >= 0.66) return 'var(--of-good)';
    if (ratio >= 0.33) return 'var(--of-warn)';
    return 'var(--of-bad)';
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
  <div class="track ds-progress">
    <div
      class="fill ds-progress-fill"
      class:ds-progress-fill-warn={ratio < 0.66 && ratio >= 0.33 && !color}
      class:ds-progress-fill-bad={ratio < 0.33 && !color}
      style="width: {pct}%; {color ? `background: ${fillColor};` : ''}"
    ></div>
  </div>
</div>

<style>
  .stat-bar { display: flex; flex-direction: column; gap: var(--of-s-1); }
  .row {
    display: flex;
    justify-content: space-between;
    font-size: var(--of-fs-label);
    letter-spacing: 0.05em;
  }
  .label { color: var(--of-ink-soft); font-family: var(--of-sc); }
  .num { font-weight: 700; font-family: var(--of-mono); }
  /* .track inherits ds-progress channel styles (height, bg, border, shadow).
     Override height to match the original compact 8px bar. */
  .track { height: 8px; }
  /* .fill inherits ds-progress-fill transition; no local override needed. */
</style>
