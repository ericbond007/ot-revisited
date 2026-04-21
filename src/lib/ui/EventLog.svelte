<script lang="ts">
  import type { GameState } from '$lib/game/types';
  let { state }: { state: GameState } = $props();

  const entries = $derived([...state.eventLog].slice(-20).reverse());
</script>

<div class="panel event-log">
  <h4 style="color: var(--c-rust); margin: 0 0 0.5em 0;">EVENT LOG</h4>
  <div class="event-log-scroll">
    {#each entries as e}
      <div class="event-log-line">
        <span style="color: var(--c-rust);">Day {e.day}</span> · {e.text}
      </div>
    {/each}
  </div>
</div>

<style>
  .event-log {
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex: 1;
  }
  .event-log-scroll {
    font-size: 0.9em;
    line-height: 1.5;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }
  .event-log-line {
    padding: 0.15em 0;
    border-bottom: 1px dashed rgba(138, 90, 42, 0.2);
  }
  .event-log-line:last-child {
    border-bottom: 0;
  }
</style>
