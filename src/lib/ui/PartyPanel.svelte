<script lang="ts">
  import type { GameState } from '$lib/game/types';
  let { state }: { state: GameState } = $props();

  function statusLabel(m: GameState['party'][0]): string {
    if (m.dead) return `✝ dead (${m.deathCause ?? 'unknown'})`;
    if (m.conditions.length > 0) return m.conditions.map((c) => c.id).join(', ');
    if (m.health < 50) return 'hurting';
    if (m.health < 80) return 'tired';
    return 'ok';
  }
</script>

<div class="panel">
  <h4 style="color: var(--c-rust); margin: 0 0 0.5em 0;">PARTY</h4>
  <div style="display: flex; flex-direction: column; gap: 0.2em;">
    {#each state.party as m}
      <div style="font-size: 0.9em; {m.dead ? 'opacity: 0.5;' : ''}">
        <strong>{m.name}</strong>
        {#if m.isLeader}<span style="color: var(--c-rust);">*</span>{/if}
        <span style="color: var(--c-wood); font-size: 0.85em;">({m.profession})</span>
        <div style="font-size: 0.8em;">HP {m.health}/100 · {statusLabel(m)}</div>
      </div>
    {/each}
  </div>

  <h4 style="color: var(--c-rust); margin: 1em 0 0.5em 0;">MORALE</h4>
  <div style="font-size: 0.9em;">{state.morale} / 100</div>

  <h4 style="color: var(--c-rust); margin: 1em 0 0.5em 0;">OXEN</h4>
  <div style="font-size: 0.85em;">
    {state.oxen.filter((o) => o.health > 0).length} alive / {state.oxen.length} total
  </div>
</div>
