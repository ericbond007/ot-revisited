<script lang="ts">
  // Full-viewport camp planning view. Replaces the old RestModal. Shows
  // a campfire scene header, a 12-segment hour timeline that fills with
  // the icons of picked activities, the activities grid, a days stepper,
  // and Begin/Leave buttons.
  //
  // Rendered inline in /play when `showCamp` is true (taking the TrailMap
  // slot) — no navigation, no URL change. Form submission runs the
  // existing `?/rest` action; on success the page re-renders with the
  // post-rest state and showCamp resets to its initial false.
  import type { GameState } from '$lib/game/types';
  import NumberStepper from './NumberStepper.svelte';
  import { CAMP_ACTIONS, hourCostFor, type CampActionId } from '$lib/game/actions/camp-actions';
  import { icon } from '$lib/data/icon-dictionary';

  let { state: gameState, slot, onleave }: {
    state: GameState;
    slot: string;
    onleave: () => void;
  } = $props();
  const qp = $derived(encodeURIComponent(slot));

  // Multi-day stay state (#187). The first time the player makes camp,
  // _campPlannedDays is unset → show the planned-days stepper. After the
  // first ?/rest the server populates the flag with the chosen total +
  // _campDaysSoFar; subsequent re-renders read these to show "Day X of Y"
  // and hide the stepper.
  const plannedDaysFlag = $derived(
    (gameState.flags._campPlannedDays as number | undefined) ?? null
  );
  const daysSoFar = $derived(
    (gameState.flags._campDaysSoFar as number | undefined) ?? 0
  );
  const inMidStay = $derived(plannedDaysFlag !== null);
  const dayOfStay = $derived(daysSoFar + 1); // human-friendly: "Day 1" on first night

  let plannedDays = $state(1);
  let picked = $state<CampActionId[]>([]);

  // When server clears the camp-session flags (last day completed), the
  // CampStage re-renders one final time before /play swaps it out. Ensure
  // the picks list resets to empty between days so a Day 2 entry doesn't
  // inherit Day 1's selections.
  $effect(() => {
    void daysSoFar;
    picked = [];
  });

  const actionRows = $derived(
    CAMP_ACTIONS
      // Hidden actions (cannibalism, etc.) drop out of the grid entirely
      // — only surface when their gating predicate says it's time.
      .filter((a) => !a.hidden?.(gameState))
      .map((a) => ({
        action: a,
        availability: a.availability(gameState),
        hours: hourCostFor(a, gameState),
        selected: picked.includes(a.id)
      }))
  );

  const TIME_BUDGET_HOURS = 12;
  const usedHours = $derived(
    actionRows
      .filter((r) => r.selected)
      .reduce((sum, r) => sum + r.hours, 0)
  );
  const remainingHours = $derived(TIME_BUDGET_HOURS - usedHours);
  const overBudget = $derived(usedHours > TIME_BUDGET_HOURS);

  // Fill the 12 slots with activity icons in picked order. Each activity
  // occupies `hours` consecutive slots. Slots beyond what's been
  // scheduled stay empty (rendered dim).
  type Slot = { icon: string | null; firstOfRun: boolean };
  const clockSlots = $derived.by<Slot[]>(() => {
    const slots: Slot[] = Array.from({ length: TIME_BUDGET_HOURS }, () => ({
      icon: null, firstOfRun: false
    }));
    let cursor = 0;
    for (const id of picked) {
      const row = actionRows.find((r) => r.action.id === id);
      if (!row) continue;
      for (let i = 0; i < row.hours && cursor < TIME_BUDGET_HOURS; i++) {
        slots[cursor] = { icon: row.action.icon, firstOfRun: i === 0 };
        cursor++;
      }
    }
    return slots;
  });

  function toggle(id: CampActionId) {
    if (picked.includes(id)) {
      picked = picked.filter((p) => p !== id);
    } else {
      picked = [...picked, id];
    }
  }

  function wouldOverflow(id: CampActionId, hours: number): boolean {
    if (picked.includes(id)) return false;
    return usedHours + hours > TIME_BUDGET_HOURS;
  }

  const leader = $derived(gameState.party[0]);
  const aliveCount = $derived(gameState.party.filter((m) => !m.dead).length);
</script>

<div class="camp-stage panel">
  <!-- Scene header — camp icons + title. Decorative row sets the mood
       without using external assets. -->
  <div class="hero">
    <div class="scene" aria-hidden="true">
      <span class="scene-glyph moon">{icon('camp_scene', 'moon')}</span>
      <span class="scene-glyph tent">{icon('camp_scene', 'tent')}</span>
      <span class="scene-glyph fire">{icon('camp_scene', 'fire')}</span>
      <span class="scene-glyph wagon">{icon('camp_scene', 'shelter')}</span>
      <span class="scene-glyph ox">{icon('camp_scene', 'ox')}</span>
    </div>
    <div class="head-text">
      <div class="kind">
        {#if inMidStay}MAKING CAMP · DAY {dayOfStay} OF {plannedDaysFlag}{:else}MAKING CAMP · DAY {gameState.day}{/if}
      </div>
      <h2 class="title">{leader?.name ? `${leader.name}'s Camp` : 'Camp'}</h2>
      <p class="prompt">
        {#if inMidStay}
          Pick activities for today. Sleep when ready — actions reset each morning.
        {:else}
          Pick activities for the first day. Heals injuries, recovers ox fatigue,
          and lets the Farmer forage. Set how many days you plan to stay below.
        {/if}
      </p>
    </div>
  </div>

  <form
    method="POST"
    action="?/rest&slot={qp}"
    class="form-col"
  >
    {#if inMidStay}
      <input type="hidden" name="plannedDays" value={plannedDaysFlag} />
    {:else}
      <div class="days-row">
        <div class="days-label">
          <span class="pill-label">PLANNED STAY</span>
          <span class="pill-hint">
            {plannedDays === 1 ? 'Overnight' : `${plannedDays} days here`}
          </span>
        </div>
        <NumberStepper name="plannedDays" bind:value={plannedDays} min={1} max={7} ariaLabel="Planned stay" />
      </div>
    {/if}

    <!-- The 12-hour clock. Horizontal timeline, each slot = one hour of
         daylight. Icons represent picked activities occupying their
         hourCost in consecutive slots. -->
    <div class="clock-wrap">
      <div class="clock-head">
        <span class="pill-label">DAY ONE · 12 HOURS</span>
        <span class="budget" class:over={overBudget}>
          {usedHours} / {TIME_BUDGET_HOURS} hr · <strong>{remainingHours}</strong> left
        </span>
      </div>
      <div class="clock">
        {#each clockSlots as slot, i}
          <div class="slot" class:filled={slot.icon !== null} class:first-of-run={slot.firstOfRun}>
            {#if slot.icon}
              <span class="slot-icon">{slot.icon}</span>
            {:else}
              <span class="slot-num">{i + 1}</span>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- Activities grid -->
    <div class="activities">
      <div class="pill-label">CAMP ACTIVITIES</div>
      <div class="cards">
        {#each actionRows as r (r.action.id)}
          {@const locked = !r.availability.available}
          {@const overflow = wouldOverflow(r.action.id, r.hours)}
          {@const disabled = locked || overflow}
          <button
            type="button"
            class="card"
            class:selected={r.selected}
            class:locked
            {disabled}
            title={locked ? r.availability.reason : overflow ? 'Not enough hours left in the day' : ''}
            onclick={() => toggle(r.action.id)}
          >
            <span class="card-icon">{r.action.icon}</span>
            <span class="card-body">
              <span class="card-label">{r.action.label}</span>
              <span class="card-sub">
                {#if locked}{r.availability.reason}{:else}{r.action.sub}{/if}
              </span>
            </span>
            <span class="card-hours">{r.hours}h</span>
          </button>
        {/each}
      </div>
      {#each actionRows as r}
        {#if r.selected}
          <input type="hidden" name="campAction" value={r.action.id} />
        {/if}
      {/each}
    </div>

    <!-- Actions -->
    <div class="actions">
      <button type="submit" class="begin" disabled={overBudget}>
        {icon('camp_scene', 'fire')} {inMidStay ? 'Rest the night' : 'Make camp'}
      </button>
      {#if inMidStay}
        <!-- Submit a separate ?/breakCamp form. Outside this form so its
             submit doesn't carry the campAction picks. -->
      {:else}
        <button type="button" class="leave" onclick={onleave}>
          Leave camp
        </button>
      {/if}
      <span class="party-note">
        {aliveCount} alive · morale {gameState.morale}
      </span>
    </div>
  </form>

  {#if inMidStay}
    <form method="POST" action="?/breakCamp&slot={qp}" class="break-form">
      <button type="submit" class="break">
        Break camp early
      </button>
    </form>
  {/if}

  <!-- Dawn transition: fades out a warm gradient on every (re-)mount of
       the CampStage. The first mount on entry uses it as a "settling
       in" beat; per-day re-mounts read as night-into-morning. -->
  {#key dayOfStay}
    <div class="dawn-overlay" aria-hidden="true"></div>
  {/key}
</div>

<style>
  .camp-stage {
    display: flex;
    flex-direction: column;
    gap: 0.8em;
    padding: 1em 1.2em;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    /* Warm night background to contrast with the daylit TrailMap. */
    background: linear-gradient(180deg, #1a1308 0%, #2a1d10 60%, #1f1508 100%);
    border-color: var(--c-rust);
    border-width: 3px;
    position: relative; /* stacking context for the dawn overlay */
  }

  /* --- Hero / scene --- */
  .hero {
    display: flex;
    align-items: flex-start;
    gap: 1.2em;
    padding-bottom: 0.3em;
    border-bottom: 1px solid rgba(201, 106, 42, 0.3);
  }
  .scene {
    display: inline-flex;
    align-items: flex-end;
    gap: 0.1em;
    font-size: 2.2em;
    line-height: 1;
    flex-shrink: 0;
    filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.5));
  }
  .scene-glyph { display: inline-block; }
  .scene-glyph.moon {
    font-size: 0.65em;
    align-self: flex-start;
    margin-right: 0.3em;
    opacity: 0.85;
  }
  .scene-glyph.fire {
    /* Gentle flicker for the campfire. */
    animation: flicker 1.6s ease-in-out infinite alternate;
  }
  @keyframes flicker {
    from { transform: translateY(0) scale(1); filter: drop-shadow(0 0 4px rgba(255, 140, 0, 0.5)); }
    to   { transform: translateY(-1px) scale(1.04); filter: drop-shadow(0 0 10px rgba(255, 180, 60, 0.7)); }
  }
  .head-text { display: flex; flex-direction: column; gap: 0.15em; min-width: 0; }
  .kind {
    font-size: 0.72em;
    letter-spacing: 0.18em;
    color: var(--c-wood);
    font-weight: 700;
  }
  .title {
    margin: 0;
    color: var(--c-rust);
    font-size: 1.4em;
    letter-spacing: 0.04em;
  }
  .prompt {
    margin: 0.3em 0 0;
    color: var(--c-tan);
    font-size: 0.9em;
    line-height: 1.5;
    font-style: italic;
  }

  /* --- Form column --- */
  .form-col { display: flex; flex-direction: column; gap: 0.8em; }
  .pill-label {
    font-size: 0.7em;
    letter-spacing: 0.15em;
    color: var(--c-wood);
    font-weight: 700;
  }
  .pill-hint {
    margin-left: 0.5em;
    font-size: 0.78em;
    color: var(--c-wood);
    font-style: italic;
  }

  /* --- Days row --- */
  .days-row {
    display: flex;
    align-items: center;
    gap: 1em;
    flex-wrap: wrap;
  }
  .days-label { display: flex; align-items: baseline; gap: 0.3em; }

  /* --- Hour clock --- */
  .clock-wrap { display: flex; flex-direction: column; gap: 0.4em; }
  .clock-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.6em;
    flex-wrap: wrap;
  }
  .budget {
    font-size: 0.82em;
    color: var(--c-tan);
  }
  .budget.over { color: #e85a4a; }
  .budget strong { color: var(--c-tan-bright); font-weight: 700; }

  .clock {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 3px;
    background: var(--c-bg-raised);
    padding: 4px;
    border: 2px solid var(--c-ink);
    border-radius: 4px;
  }
  .slot {
    position: relative;
    aspect-ratio: 1 / 1;
    background: var(--c-panel);
    border-radius: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s, box-shadow 0.2s;
  }
  .slot.filled {
    background: var(--c-rust-dark);
    box-shadow: inset 0 0 0 1px rgba(255, 180, 60, 0.3);
  }
  .slot.first-of-run {
    box-shadow: inset 0 0 0 1px rgba(255, 180, 60, 0.6), inset 2px 0 0 rgba(255, 180, 60, 0.7);
  }
  .slot-icon {
    font-size: 1.1em;
    line-height: 1;
  }
  .slot-num {
    font-size: 0.7em;
    color: var(--c-wood);
    opacity: 0.5;
  }

  /* --- Activities cards --- */
  .activities { display: flex; flex-direction: column; gap: 0.4em; }
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 0.4em;
  }
  .card {
    display: inline-flex;
    align-items: flex-start;
    gap: 0.55em;
    padding: 0.6em 0.8em;
    background: var(--c-bg-raised);
    color: var(--c-tan);
    border: 2px solid var(--c-wood);
    border-radius: 3px;
    font-family: inherit;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: none;
    cursor: pointer;
    text-align: left;
    transition: background 0.12s, border-color 0.12s, color 0.12s, opacity 0.12s;
  }
  .card:hover:not(:disabled):not(.selected) {
    background: var(--c-panel);
    border-color: var(--c-rust);
  }
  .card.selected {
    background: var(--c-rust);
    color: var(--c-tan-bright);
    border-color: var(--c-ink);
  }
  .card:disabled { opacity: 0.45; cursor: not-allowed; }
  .card.locked { opacity: 0.4; }
  .card-icon { font-size: 1.7em; line-height: 1; flex-shrink: 0; }
  .card-body { display: flex; flex-direction: column; gap: 0.15em; min-width: 0; flex: 1; }
  .card-label { font-size: 0.95em; }
  .card-sub {
    font-size: 0.78em;
    font-weight: normal;
    color: var(--c-wood);
    letter-spacing: normal;
    line-height: 1.3;
  }
  .card.selected .card-sub { color: var(--c-tan); }
  .card-hours {
    font-size: 0.78em;
    font-weight: 700;
    color: var(--c-wood);
    letter-spacing: 0.08em;
    padding: 0.2em 0.5em;
    background: var(--c-panel);
    border-radius: 3px;
    flex-shrink: 0;
  }
  .card.selected .card-hours {
    background: var(--c-ink);
    color: var(--c-tan-bright);
  }

  /* --- Actions footer --- */
  .actions {
    display: flex;
    gap: 0.6em;
    align-items: center;
    flex-wrap: wrap;
    padding-top: 0.4em;
    border-top: 1px solid rgba(138, 90, 42, 0.3);
  }
  .begin {
    font-size: 1.05em;
    padding: 0.7em 1.4em;
    background: var(--c-rust);
    color: var(--c-tan-bright);
  }
  .begin:hover:not(:disabled) {
    filter: brightness(1.15);
  }
  .leave {
    background: var(--c-bg-raised);
    border: 2px solid var(--c-wood);
    color: var(--c-tan);
  }
  .party-note {
    margin-left: auto;
    font-size: 0.85em;
    color: var(--c-wood);
    font-style: italic;
  }

  /* Multi-day stay (#187) — secondary form for the early-exit. Sits
     just below the main begin/leave row so the player has a clear
     out without commingling its submit with the rest form. */
  .break-form { margin-top: -0.3em; }
  .break {
    width: 100%;
    background: transparent;
    border: 1px dashed var(--c-wood);
    color: var(--c-wood);
    font-size: 0.85em;
    padding: 0.35em 1em;
    cursor: pointer;
  }
  .break:hover { color: var(--c-rust); border-color: var(--c-rust); }

  /* Dawn-into-morning transition. Mounts on entry + on every day of
     stay; the {#key dayOfStay} re-mount is what re-fires the fade. */
  .dawn-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(
      180deg,
      rgba(255, 200, 130, 0.55) 0%,
      rgba(255, 160, 90, 0.35) 40%,
      rgba(40, 20, 10, 0.0) 100%
    );
    animation: dawn-fade 900ms ease-out forwards;
  }
  @keyframes dawn-fade {
    from { opacity: 1; }
    to   { opacity: 0; }
  }
</style>
