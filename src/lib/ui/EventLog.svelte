<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { fly } from 'svelte/transition';
  import { flip } from 'svelte/animate';

  let { state }: { state: GameState } = $props();

  // Key each entry so Svelte can animate in-place. We use day+index because
  // event-log entries don't have unique ids; day+position-in-array is stable
  // enough for a single session.
  const entries = $derived(
    [...state.eventLog]
      .slice(-30)
      .map((e, i) => ({ ...e, key: `${e.day}-${i}-${e.text.slice(0, 20)}` }))
      .reverse()
  );
</script>

<div class="panel event-log">
  <h4 style="color: var(--c-rust); margin: 0 0 0.5em 0;">EVENT LOG</h4>
  <div class="event-log-scroll">
    {#each entries as e, i (e.key)}
      <div
        class="event-log-line"
        class:newest={i === 0}
        animate:flip={{ duration: 250 }}
        in:fly={{ y: -8, duration: 260 }}
      >
        <span class="day-tag">Day {e.day}</span>
        <span class="text">{e.text}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .event-log {
    display: flex;
    flex-direction: column;
    /* Fixed-size strip in the left column — no flex-grow (don't push
       the stage off-viewport), no full-row width (lines shouldn't
       stretch 1000-px across for 40 characters of text). Parent sets
       the actual bounds via its own max-width. */
    min-height: 0;
    max-height: 180px;
  }
  .event-log-scroll {
    font-size: 0.9em;
    line-height: 1.5;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }
  .event-log-line {
    display: grid;
    grid-template-columns: 4.5em 1fr;
    gap: 0.6em;
    padding: 0.35em 0.5em;
    border-bottom: 1px dashed rgba(138, 90, 42, 0.2);
  }
  /* Alternating row tint — subtle, keeps entries visually separated */
  .event-log-line:nth-child(odd) {
    background: rgba(90, 58, 26, 0.12);
  }
  .event-log-line:last-child {
    border-bottom: 0;
  }
  .event-log-line .day-tag {
    color: var(--c-rust);
    font-weight: 700;
    white-space: nowrap;
  }
  /* The newest entry gets a brief highlight so it's obvious something changed */
  .event-log-line.newest {
    background: rgba(201, 106, 42, 0.16);
    border-left: 3px solid var(--c-rust);
    padding-left: calc(0.5em - 3px);
    animation: log-new-pulse 2s ease-out;
  }
  @keyframes log-new-pulse {
    0%   { background: rgba(201, 106, 42, 0.45); }
    100% { background: rgba(201, 106, 42, 0.16); }
  }
</style>
