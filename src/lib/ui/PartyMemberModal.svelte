<script lang="ts">
  import type { PartyMember } from '$lib/game/types';
  import { getProfession } from '$lib/game/content/professions';
  import { getCondition } from '$lib/game/content/conditions';
  import { ITEMS } from '$lib/game/content/items';
  import { icon } from '$lib/data/icon-dictionary';

  let { member, onclose }: { member: PartyMember; onclose: () => void } = $props();

  const prof = $derived(member.profession ? getProfession(member.profession) : null);

  function healthColor(h: number): string {
    if (h >= 70) return '#8bb96a';
    if (h >= 40) return '#f5c96a';
    if (h >= 20) return '#c96a2a';
    return '#e85a4a';
  }
  function healthWord(h: number): string {
    if (h >= 85) return 'hale';
    if (h >= 60) return 'ok';
    if (h >= 35) return 'tired';
    if (h >= 15) return 'hurting';
    return 'near death';
  }

  const glyph = $derived(
    member.kind === 'child'
      ? icon('people', member.sex === 'female' ? 'child_female' : 'child_male')
      : icon('people', member.sex === 'female' ? 'adult_female' : 'adult_male')
  );

  const roleLine = $derived.by(() => {
    if (member.kind === 'child') return `Child · ${member.sex} · age ${member.age}`;
    return `Adult · ${member.sex} · age ${member.age}`;
  });

  const hc = $derived(healthColor(member.health));
</script>

<div class="modal-backdrop" onclick={onclose} role="presentation">
  <div class="panel modal-body" onclick={(e) => e.stopPropagation()} role="presentation">

    <!-- Header -->
    <div class="head">
      <div class="glyph">{glyph}</div>
      <div class="head-text">
        <div class="name-row">
          <h2 class="modal-title">{member.name}</h2>
          {#if member.isLeader}<span class="leader" title="Party leader">★ LEADER</span>{/if}
        </div>
        <div class="role">{roleLine}</div>
        {#if prof}
          <div class="profession">{prof.name}</div>
        {/if}
      </div>
    </div>

    <!-- Health bar -->
    <section class="section">
      <div class="section-head">HEALTH</div>
      {#if member.dead}
        <div class="dead-line">
          {icon('people', 'dead')} Died{member.deathDay ? ` on day ${member.deathDay}` : ''}{member.deathCause ? ` — ${member.deathCause}` : ''}.
        </div>
      {:else}
        <div class="bar-row">
          <div class="bar">
            <div class="fill" style="width: {member.health}%; background: {hc};"></div>
          </div>
          <span class="bar-num" style="color: {hc};">{member.health}/100</span>
          <span class="bar-word">— {healthWord(member.health)}</span>
        </div>
      {/if}
    </section>

    <!-- Conditions -->
    {#if member.conditions.length > 0 && !member.dead}
      <section class="section">
        <div class="section-head">CONDITIONS</div>
        <ul class="cond-list">
          {#each member.conditions as c}
            {@const meta = getCondition(c.id)}
            <li class="cond-row">
              <strong>{meta.name}</strong>
              <span class="cond-meta">
                day {c.daysSinceOnset} ·
                {meta.dailyHealthDelta < 0 ? `${meta.dailyHealthDelta} hp/day` : 'stable'}
                {#if meta.contagious} · contagious{/if}
              </span>
              {#if meta.treatmentItems && meta.treatmentItems.length > 0}
                <span class="cond-treat">
                  treat with: {meta.treatmentItems.map((id) => ITEMS[id]?.name ?? id).join(', ')}
                </span>
              {/if}
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    <!-- Profession panel (adults only) -->
    {#if prof}
      <section class="section">
        <div class="section-head">PROFESSION · BONUSES</div>
        <p class="bonus">{prof.bonusSummary}</p>
        {#if prof.starterGear.length > 0}
          <div class="section-head starter">STARTED THE JOURNEY WITH</div>
          <ul class="gear-list">
            {#each prof.starterGear as g}
              {@const it = ITEMS[g.item]}
              <li>
                <span class="gear-qty">×{g.qty}</span>
                <span class="gear-name">{it?.name ?? g.item}</span>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {:else if member.kind === 'child'}
      <section class="section">
        <div class="section-head">CHILD</div>
        <p class="bonus">
          Can't hunt, can't ford a wagon. Eats less, drinks less.
          Keeps the party's morale higher when alive; their loss hits harder than an adult's.
        </p>
      </section>
    {/if}

    <div class="actions">
      <button type="button" onclick={onclose}>Close</button>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(26, 15, 8, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    /* One layer above the PartyModal backdrop so this sits on top. */
    z-index: 110;
    padding: 1em;
    overflow-y: auto;
  }
  .modal-body {
    max-width: 520px;
    width: 100%;
    padding: 1.3em 1.4em;
    border-color: var(--c-rust);
  }

  .head {
    display: flex;
    gap: 0.9em;
    align-items: center;
    margin-bottom: 1em;
  }
  .glyph {
    font-size: 2.6em;
    line-height: 1;
    flex-shrink: 0;
  }
  .head-text { flex: 1; min-width: 0; }
  .name-row {
    display: flex;
    align-items: baseline;
    gap: 0.6em;
    flex-wrap: wrap;
  }
  h2 {
    margin: 0;
    color: var(--c-rust);
    letter-spacing: 0.04em;
  }
  .leader {
    font-size: 0.7em;
    letter-spacing: 0.15em;
    color: var(--c-rust);
    font-weight: 700;
  }
  .role {
    font-size: 0.85em;
    color: var(--c-wood);
    text-transform: capitalize;
  }
  .profession {
    font-size: 0.75em;
    letter-spacing: 0.12em;
    color: var(--c-rust);
    font-weight: 700;
    text-transform: uppercase;
    margin-top: 0.15em;
  }

  .section { margin-bottom: 1em; }
  .section-head {
    font-size: 0.7em;
    letter-spacing: 0.15em;
    color: var(--c-wood);
    font-weight: 700;
    margin-bottom: 0.35em;
  }
  .section-head.starter { margin-top: 0.7em; }

  .bar-row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 0.5em;
    align-items: center;
  }
  .bar {
    height: 0.9em;
    background: var(--c-bg-raised);
    border: 2px solid var(--c-ink);
    border-radius: 3px;
    overflow: hidden;
  }
  .fill { height: 100%; transition: width 0.4s, background 0.4s; }
  .bar-num { font-weight: 700; }
  .bar-word { color: var(--c-wood); font-style: italic; font-size: 0.9em; }

  .dead-line {
    color: var(--c-wood);
    font-style: italic;
  }

  .cond-list, .gear-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3em;
  }
  .cond-row {
    display: flex;
    flex-direction: column;
    gap: 0.1em;
    padding: 0.4em 0.6em;
    background: var(--c-bg-raised);
    border-radius: 3px;
  }
  .cond-meta {
    font-size: 0.78em;
    color: var(--c-wood);
  }
  .cond-treat {
    font-size: 0.78em;
    color: var(--c-rust);
    font-style: italic;
  }

  .bonus {
    margin: 0 0 0.4em 0;
    color: var(--c-tan);
    line-height: 1.4;
  }

  .gear-list li {
    display: flex;
    gap: 0.6em;
    padding: 0.25em 0.5em;
    border-bottom: 1px dashed rgba(138, 90, 42, 0.18);
  }
  .gear-list li:nth-child(odd) {
    background: rgba(138, 90, 42, 0.06);
  }
  .gear-list li:last-child { border-bottom: 0; }
  .gear-qty {
    color: var(--c-rust);
    font-weight: 700;
    min-width: 2.5em;
  }
  .gear-name { color: var(--c-tan); }

  .actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 0.8em;
  }
</style>
