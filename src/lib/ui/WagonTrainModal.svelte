<script lang="ts">
  // #280d Wagon-party full-roster modal. Each companion as a row:
  // family name, leader profession, party size + alive HP avg, ox
  // count + avg fatigue, morale, most-recent event blurb.
  //
  // #285 phase 2 — adds a "stand for captaincy / stand aside" toggle.
  // #286 — when the player is the captain, the modal also shows top
  // inventory items per companion (peek) + a "Doctor visit" button
  // gated on having medicine_chest + the wagon having a sick member.
  import { enhance } from '$app/forms';
  import type { GameState, NpcWagonState, PartyMember } from '$lib/game/types';
  import { wagonHasSickMember } from '$lib/game/systems/wagon-train-leader';

  let { state, slot, onclose }: {
    state: GameState;
    slot: string;
    onclose: () => void;
  } = $props();

  function aliveCount(c: NpcWagonState): number {
    return c.party.filter((p) => !p.dead).length;
  }
  function avgHp(c: NpcWagonState): number {
    const alive = c.party.filter((p) => !p.dead);
    if (alive.length === 0) return 0;
    return Math.round(alive.reduce((s, p) => s + p.health, 0) / alive.length);
  }
  function avgOxFatigue(c: NpcWagonState): number {
    const ox = c.oxen.filter((o) => o.health > 0);
    if (ox.length === 0) return 0;
    return Math.round(ox.reduce((s, o) => s + o.fatigue, 0) / ox.length);
  }
  function liveOx(c: NpcWagonState): number {
    return c.oxen.filter((o) => o.health > 0).length;
  }
  function lastLog(c: NpcWagonState): string {
    if (c.eventLog.length === 0) return '—';
    return c.eventLog[c.eventLog.length - 1].text;
  }
  function deathCount(c: NpcWagonState): number {
    return c.party.filter((p) => p.dead).length;
  }
  function moraleColor(m: number): string {
    if (m >= 70) return '#8bb96a';
    if (m >= 40) return '#f5c96a';
    if (m >= 20) return '#c96a2a';
    return '#e85a4a';
  }
  function hpColor(h: number): string {
    if (h >= 70) return '#8bb96a';
    if (h >= 40) return '#f5c96a';
    if (h >= 20) return '#c96a2a';
    return '#e85a4a';
  }
  function outcomeBadge(c: NpcWagonState): string {
    if (c.outcome === 'wiped') return '✝ wiped';
    if (c.outcome === 'arrived') return '★ arrived';
    if (c.outcome === 'stranded') return '⚠ stranded';
    return '';
  }

  // #286 — top inventory items (descending qty) for the captain peek.
  // Capped at 4 entries to keep the row compact; the rest are summarized
  // as "+N more". Mirrors the period reality: the captain knew what
  // each wagon carried in broad strokes, not pound-for-pound.
  function topInventory(c: NpcWagonState): { item: string; qty: number }[] {
    const entries = Object.entries(c.inventory)
      .filter(([, qty]) => qty > 0)
      .map(([item, qty]) => ({ item, qty }))
      .sort((a, b) => b.qty - a.qty);
    return entries;
  }
  function inventoryHasSickMember(c: NpcWagonState): boolean {
    return wagonHasSickMember(c);
  }

  const train = $derived(state.wagonTrain);
  const sortedCompanions = $derived(
    train ? [...train.companions].sort((a, b) => {
      // In-progress wagons first, then wiped/arrived/stranded.
      if (a.outcome !== b.outcome) {
        if (a.outcome === 'in-progress') return -1;
        if (b.outcome === 'in-progress') return 1;
      }
      return 0;
    }) : []
  );
  const aliveTrainSouls = $derived(
    (train?.companions ?? []).reduce((s, c) => s + aliveCount(c), 0)
  );
  const totalDeaths = $derived(
    (train?.companions ?? []).reduce((s, c) => s + deathCount(c), 0)
  );
  // #286 — captain peek + abilities surface only when leaderId === 'player'.
  const isCaptain = $derived(train?.leaderId === 'player');
  const hasMedicineChest = $derived((state.inventory.medicine_chest ?? 0) > 0);
</script>

{#if train}
  <div class="modal-backdrop" onclick={onclose} role="presentation">
    <div class="panel modal-body" onclick={(e) => e.stopPropagation()} role="presentation">
      <h2 class="modal-title">🛞 {train.name}</h2>
      <p class="hdr-stats">
        Joined day {train.joinedDay} · {train.companions.length}
        {train.companions.length === 1 ? 'wagon' : 'wagons'} · {aliveTrainSouls} souls
        {#if totalDeaths > 0} · {totalDeaths} {totalDeaths === 1 ? 'death' : 'deaths'}{/if}
      </p>

      <ul class="train-list">
        {#each sortedCompanions as c (c.id)}
          <li class="train-row" class:dimmed={c.outcome !== 'in-progress'}>
            <div class="row-head">
              <span class="row-name">{c.name}</span>
              <span class="row-prof">— {c.leaderProfession.replace(/_/g, ' ')}</span>
              {#if outcomeBadge(c)}
                <span class="row-badge">{outcomeBadge(c)}</span>
              {/if}
            </div>
            <div class="row-stats">
              <span title="Alive party members">
                👥 <strong>{aliveCount(c)}</strong>
                {#if deathCount(c) > 0}<span class="row-loss">−{deathCount(c)}</span>{/if}
              </span>
              <span title="Average party health" style="color: {hpColor(avgHp(c))};">
                ❤ {avgHp(c)}
              </span>
              <span title="Live oxen, avg fatigue">
                🐂 {liveOx(c)}@{avgOxFatigue(c)}
              </span>
              <span title="Morale" style="color: {moraleColor(c.morale)};">
                ⚑ {c.morale}
              </span>
              <span title="Cash on hand">$ {c.cash}</span>
            </div>
            <div class="row-log">{lastLog(c)}</div>
            {#if isCaptain && c.outcome === 'in-progress'}
              <div class="cap-peek">
                <span class="peek-tag">Captain's view:</span>
                {#if topInventory(c).length === 0}
                  <span class="peek-empty">empty wagon</span>
                {:else}
                  {#each topInventory(c).slice(0, 4) as entry, i}
                    <span class="peek-item">{entry.qty} {entry.item.replace(/_/g, ' ')}</span>{i < Math.min(3, topInventory(c).length - 1) ? ',' : ''}
                  {/each}
                  {#if topInventory(c).length > 4}
                    <span class="peek-more">+{topInventory(c).length - 4} more</span>
                  {/if}
                {/if}
              </div>
              {#if hasMedicineChest && inventoryHasSickMember(c)}
                <form
                  method="POST"
                  action="?/townDoctorVisit&slot={slot}"
                  use:enhance={() => () => {}}
                  class="cap-action-form"
                >
                  <input type="hidden" name="wagonId" value={c.id} />
                  <button type="submit" class="cap-action-btn" title="Use your medicine chest on the lowest-HP member of this wagon">
                    🩺 Doctor visit
                  </button>
                </form>
              {/if}
            {/if}
          </li>
        {/each}
      </ul>

      <div class="captaincy">
        <div class="cap-line">
          {#if isCaptain}
            <span class="cap-badge">⚑ Captain</span>
          {/if}
          <strong>Captaincy:</strong>
          {#if isCaptain}
            you hold it
          {:else}
            {train.companions.find((c) => c.id === train.leaderId)?.name ?? 'a companion'}
          {/if}
          {#if train.playerStandsAside}
            · <span class="cap-aside">standing aside at the next vote</span>
          {/if}
        </div>
        <form
          method="POST"
          action="?/townToggleStandAside&slot={slot}"
          use:enhance={() => () => {}}
          class="cap-form"
        >
          <button type="submit" class="cap-btn">
            {train.playerStandsAside ? 'Stand for captaincy' : 'Stand aside next vote'}
          </button>
        </form>
      </div>

      <div class="actions">
        <button type="button" onclick={onclose}>Close</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed; inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex; align-items: center; justify-content: center;
    z-index: 100;
  }
  .modal-body {
    background: var(--c-bg, #2a1f17);
    border: 2px solid var(--c-wood);
    border-radius: 4px;
    padding: 1em 1.2em;
    max-width: 720px;
    width: calc(100vw - 2em);
    max-height: 80vh;
    overflow-y: auto;
    color: var(--c-tan);
  }
  .modal-title {
    margin: 0;
    font-size: 1.2em;
    color: var(--c-tan-bright, #e8d9b8);
  }
  .hdr-stats {
    margin: 0.2em 0 0.8em;
    color: var(--c-wood);
    font-size: 0.85em;
  }
  .train-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.6em;
  }
  .train-row {
    padding: 0.5em 0.7em;
    background: rgba(232, 217, 184, 0.06);
    border-left: 3px solid var(--c-wood);
    border-radius: 2px;
  }
  .train-row.dimmed {
    opacity: 0.55;
    border-left-color: var(--c-rust);
  }
  .row-head {
    display: flex;
    align-items: baseline;
    gap: 0.3em;
    flex-wrap: wrap;
  }
  .row-name { font-weight: 700; }
  .row-prof { color: var(--c-wood); font-size: 0.9em; }
  .row-badge {
    margin-left: auto;
    color: var(--c-rust);
    font-size: 0.78em;
    letter-spacing: 0.05em;
  }
  .row-stats {
    margin-top: 0.3em;
    display: flex;
    gap: 1em;
    flex-wrap: wrap;
    font-size: 0.9em;
  }
  .row-loss {
    color: var(--c-rust);
    font-weight: 400;
    margin-left: 0.15em;
  }
  .row-log {
    margin-top: 0.35em;
    font-size: 0.85em;
    font-family: 'IM Fell English', 'Special Elite', Georgia, serif;
    color: var(--c-tan);
    font-style: italic;
  }
  .actions {
    margin-top: 1em;
    text-align: right;
  }
  .actions button {
    background: var(--c-bg-raised);
    border: 1px solid var(--c-wood);
    color: var(--c-tan);
    padding: 0.4em 1.2em;
    border-radius: 3px;
    cursor: pointer;
    font-family: inherit;
  }
  .actions button:hover { border-color: var(--c-rust); }
  .captaincy {
    margin-top: 1em;
    padding-top: 0.6em;
    border-top: 1px solid rgba(232, 217, 184, 0.18);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8em;
    flex-wrap: wrap;
  }
  .cap-line { font-size: 0.9em; color: var(--c-tan); }
  .cap-badge {
    display: inline-block;
    background: var(--c-rust);
    color: var(--c-tan-bright, #e8d9b8);
    padding: 0.1em 0.5em;
    border-radius: 2px;
    margin-right: 0.5em;
    font-size: 0.85em;
    font-weight: 700;
    letter-spacing: 0.05em;
  }
  .cap-aside { color: var(--c-rust); font-style: italic; }
  .cap-form { margin: 0; }
  .cap-btn {
    background: var(--c-bg-raised);
    border: 1px solid var(--c-wood);
    color: var(--c-tan);
    padding: 0.35em 0.9em;
    border-radius: 3px;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.85em;
  }
  .cap-btn:hover { border-color: var(--c-rust); }
  .cap-peek {
    margin-top: 0.4em;
    font-size: 0.8em;
    color: var(--c-tan);
    line-height: 1.5;
  }
  .peek-tag {
    color: var(--c-rust);
    font-weight: 600;
    margin-right: 0.4em;
  }
  .peek-item { white-space: nowrap; }
  .peek-empty {
    color: var(--c-wood);
    font-style: italic;
  }
  .peek-more {
    color: var(--c-wood);
    margin-left: 0.3em;
  }
  .cap-action-form {
    margin: 0.4em 0 0;
  }
  .cap-action-btn {
    background: var(--c-bg-raised);
    border: 1px solid var(--c-rust);
    color: var(--c-tan);
    padding: 0.3em 0.7em;
    border-radius: 3px;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.8em;
  }
  .cap-action-btn:hover { background: rgba(193, 80, 60, 0.2); }
</style>
