<script lang="ts">
  import type { Coverage } from '$lib/game/systems/coverage';

  let { coverage, souls }: { coverage: Coverage; souls: number } = $props();

  // Tone thresholds — green if comfortable, amber if thin, red if short.
  // Display-only color bands (full run is ~150-170 trail days).
  function dayTone(days: number): 'good' | 'mid' | 'low' {
    if (days >= 120) return 'good';
    if (days >= 80) return 'mid';
    return 'low';
  }
  // Water "days between sources" — a different scale than food days.
  function waterTone(days: number): 'good' | 'mid' | 'low' {
    if (days >= 10) return 'good';
    if (days >= 5) return 'mid';
    return 'low';
  }
  function round(n: number): number { return Math.round(n); }
</script>

<div class="cov">
  <span class="ds-eyebrow cov-head">Coverage</span>
  <div class="cov-chips">
    <span class="cov-chip cov-{dayTone(coverage.foodDays)}">
      Food . {round(coverage.foodDays)} days for {souls} {souls === 1 ? 'soul' : 'souls'}
    </span>
    <span class="cov-chip cov-{waterTone(coverage.waterDays)}">
      Water . {round(coverage.waterDays)} days between sources
    </span>
    <span class="cov-chip cov-{coverage.shots >= 200 ? 'good' : coverage.shots >= 60 ? 'mid' : 'low'}">
      Ammo . {coverage.shots} shots
    </span>
    <span class="cov-chip cov-{coverage.clothingCov >= 1 ? 'good' : coverage.clothingCov >= 0.5 ? 'mid' : 'low'}">
      Clothing . {Math.round(coverage.clothingCov * 100)}% per soul
    </span>
  </div>
</div>

<style>
  .cov { display: flex; flex-direction: column; gap: 6px; }
  .cov-head { display: block; }
  .cov-chips { display: flex; flex-direction: column; gap: 4px; }
  .cov-chip {
    font-family: var(--of-mono);
    font-size: var(--of-fs-label);
    letter-spacing: 0.02em;
    padding: 3px 8px;
    border-radius: 2px;
    border: 1px solid;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .cov-good { color: var(--of-good); border-color: var(--of-good); background: color-mix(in srgb, var(--of-good) 8%, transparent); }
  .cov-mid  { color: var(--of-warn); border-color: var(--of-warn); background: color-mix(in srgb, var(--of-warn) 8%, transparent); }
  .cov-low  { color: var(--of-bad);  border-color: var(--of-bad);  background: color-mix(in srgb, var(--of-bad) 6%, transparent); }
</style>
