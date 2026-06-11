<script lang="ts">
  // #1304-T5 — Projected-arrival chip for the top bar.
  //
  // Shows "At this pace: ~Nov 9" when the game has enough data to judge
  // pace (projectedArrivalDay returns non-null). Hidden in early game.
  //
  // Color band mirrors arrivalBand() in schedule.ts:
  //   ok       — muted ink (on schedule or ahead)
  //   behind   — amber (within 15 days of snow-safe estimate)
  //   critical — red (beyond that margin)
  //
  // Tooltip: "Projected arrival vs. snow reports — mountain passes close
  //   around <snowSafeDate>."
  //
  // Z Fold 4 width (~884px, breakpoint 900px): chip degrades to
  //   icon + month abbreviation + day only.

  import type { GameState } from '$lib/game/types';
  import {
    projectedArrivalDay,
    estimateSnowSafeDay,
    arrivalBand
  } from '$lib/game/ai/schedule';
  import { addDaysToDate } from '$lib/game/utils/calendar';

  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  interface Props { state: GameState; }
  let { state }: Props = $props();

  const band = $derived(arrivalBand(state));

  // Projected arrival calendar date
  const projDate = $derived((() => {
    const projDay = projectedArrivalDay(state);
    if (projDay === null) return null;
    const daysAhead = Math.round(projDay - state.day);
    if (daysAhead < 0) return null; // already past projected day → hide
    return addDaysToDate(state.date, daysAhead);
  })());

  // Snow-safe estimate date for tooltip
  const snowSafeDate = $derived((() => {
    const snowSafeDay = estimateSnowSafeDay(state);
    const daysAhead = Math.round(snowSafeDay - state.day);
    if (daysAhead < 0) return null;
    return addDaysToDate(state.date, daysAhead);
  })());

  const monthStr = $derived(projDate ? MONTHS_SHORT[projDate.month - 1] : '');
  const dayNum   = $derived(projDate ? projDate.day : 0);

  const tooltipText = $derived((() => {
    if (!snowSafeDate) return 'Projected arrival vs. snow reports';
    const mo = MONTHS_SHORT[snowSafeDate.month - 1];
    return `Projected arrival vs. snow reports — passes may close around ${mo} ${snowSafeDate.day}`;
  })());
</script>

{#if band !== null && projDate !== null}
  <span
    class="arrival-chip arrival-chip--{band}"
    title={tooltipText}
    aria-label="Projected arrival: {monthStr} {dayNum}"
  >
    <!-- Full text on wide screens -->
    <span class="chip-full">At this pace: ~{monthStr} {dayNum}</span>
    <!-- Compact on Z Fold 4 / narrow -->
    <span class="chip-compact" aria-hidden="true">❄ {monthStr} {dayNum}</span>
  </span>
{/if}

<style>
  .arrival-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.25em;
    padding: 0.15em 0.55em;
    border-radius: var(--of-r-sm);
    font-size: var(--of-fs-chip);
    font-family: var(--of-sc);
    letter-spacing: 0.06em;
    border: 1px solid transparent;
    white-space: nowrap;
    cursor: default;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }

  /* ok — subtle ink-on-paper: on schedule, no alarm */
  .arrival-chip--ok {
    background: rgba(42, 29, 12, 0.07);
    color: var(--of-ink-soft);
    border-color: var(--of-rule-soft);
  }

  /* behind — amber: approaching the deadline */
  .arrival-chip--behind {
    background: rgba(168, 106, 24, 0.12);
    color: var(--of-warn);
    border-color: rgba(168, 106, 24, 0.30);
    font-weight: 600;
  }

  /* critical — rust-red: past the safe window */
  .arrival-chip--critical {
    background: rgba(138, 28, 12, 0.10);
    color: var(--of-bad);
    border-color: rgba(138, 28, 12, 0.28);
    font-weight: 700;
  }

  /* Wide: show full text; hide compact */
  .chip-compact { display: none; }

  /* Z Fold 4 / narrow (≤900px): hide full text, show icon+date */
  @media (max-width: 900px) {
    .chip-full    { display: none; }
    .chip-compact { display: inline; }
  }
</style>
