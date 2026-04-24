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
      .slice(-40)
      .map((e, i) => ({ ...e, key: `${e.day}-${i}-${e.text.slice(0, 20)}` }))
      .reverse()
  );
</script>

<div class="panel event-log">
  <div class="log-head">
    <span class="title">EVENT LOG</span>
    <span class="count">{entries.length}</span>
  </div>
  <div class="event-log-scroll">
    {#each entries as e, i (e.key)}
      <div
        class="event-log-line"
        class:newest={i === 0}
        animate:flip={{ duration: 250 }}
        in:fly={{ y: -6, duration: 240 }}
      >
        <span class="day-tag">D{e.day}</span>
        <span class="text">{e.text}</span>
      </div>
    {/each}
    {#if entries.length === 0}
      <p class="empty">Nothing yet — set out.</p>
    {/if}
  </div>
</div>

<style>
  /* Compact sidebar variant. The log lives in the 280-px side rail
     alongside party / wagon / inventory panels, so horizontal space is
     tight. Day tag is inline and short (e.g. "D37"), text wraps beneath. */
  .event-log {
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 0.55em 0.7em 0.4em;
    /* Flex-grows to fill remaining sidebar space, but caps so long logs
       don't push the other panels off the rail. */
    flex: 1;
    max-height: 40vh;
  }
  .log-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.4em;
    margin-bottom: 0.35em;
  }
  .log-head .title {
    color: var(--c-rust);
    font-size: 0.7em;
    letter-spacing: 0.15em;
    font-weight: 700;
  }
  .log-head .count {
    font-size: 0.7em;
    color: var(--c-wood);
    font-style: italic;
  }

  .event-log-scroll {
    font-size: 0.78em;
    line-height: 1.45;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
    padding-right: 0.15em;
  }

  .event-log-line {
    padding: 0.25em 0.35em;
    border-bottom: 1px dashed rgba(138, 90, 42, 0.2);
  }
  .event-log-line:nth-child(odd) {
    background: rgba(90, 58, 26, 0.12);
  }
  .event-log-line:last-child { border-bottom: 0; }

  /* Day tag sits inline with the text, tightened to 2-3 chars. */
  .day-tag {
    color: var(--c-rust);
    font-weight: 700;
    margin-right: 0.35em;
    font-size: 0.92em;
  }
  .text { color: var(--c-tan); }

  .event-log-line.newest {
    background: rgba(201, 106, 42, 0.16);
    border-left: 2px solid var(--c-rust);
    padding-left: calc(0.35em - 2px);
    animation: log-new-pulse 2s ease-out;
  }
  @keyframes log-new-pulse {
    0%   { background: rgba(201, 106, 42, 0.45); }
    100% { background: rgba(201, 106, 42, 0.16); }
  }

  .empty {
    color: var(--c-wood);
    font-style: italic;
    font-size: 0.88em;
    padding: 0.4em 0.2em;
  }
</style>
