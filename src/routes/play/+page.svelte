<script lang="ts">
  import TrailMap from '$lib/ui/TrailMap.svelte';
  import PartyPanel from '$lib/ui/PartyPanel.svelte';
  import InventoryPanel from '$lib/ui/InventoryPanel.svelte';
  import EventLog from '$lib/ui/EventLog.svelte';
  import ActionBar from '$lib/ui/ActionBar.svelte';
  import EndScreen from '$lib/ui/EndScreen.svelte';
  import EventModal from '$lib/ui/EventModal.svelte';
  import HuntModal from '$lib/ui/HuntModal.svelte';
  import FordModal from '$lib/ui/FordModal.svelte';
  import TradeModal from '$lib/ui/TradeModal.svelte';
  import RestModal from '$lib/ui/RestModal.svelte';

  let { data, form } = $props();
  const gs = $derived(form?.state ?? data.state);
  const pendingEventId = $derived((gs.flags._pendingEventId as string | undefined));

  let showRest = $state(false);
  let showHunt = $state(false);
  let showFord = $state(false);
  let showTrade = $state(false);

  // Day-change pulse: briefly flash the header when the day number changes
  let dayFlash = $state(false);
  let lastSeenDay = -1;
  $effect(() => {
    const currentDay = gs.day;
    if (lastSeenDay === -1) {
      lastSeenDay = currentDay;
      return;
    }
    if (currentDay !== lastSeenDay) {
      dayFlash = true;
      lastSeenDay = currentDay;
      setTimeout(() => { dayFlash = false; }, 800);
    }
  });
</script>

<div class="play-wrap">
  <!-- Header -->
  <header class="panel top-bar">
    <h2 style="margin: 0;">{gs.party[0].name}'s Journey</h2>
    <div class="date-readout {dayFlash ? 'pulse' : ''}">
      <span class="stat" title="Current day of the journey">
        <span class="stat-icon">📅</span>
        <span class="stat-label">DAY</span>
        <span class="day-num">{gs.day}</span>
      </span>
      <span class="stat" title="In-game calendar date">
        <span class="stat-icon">🗓️</span>
        <span class="stat-label">DATE</span>
        <span>{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][gs.date.month - 1]} {gs.date.day}, {gs.date.year}</span>
      </span>
      <span class="stat" title="Travel speed">
        <span class="stat-icon">🐂</span>
        <span class="stat-label">PACE</span>
        <span class="capitalize">{gs.pace}</span>
      </span>
      <span class="stat" title="Food rations per person per day">
        <span class="stat-icon">🍖</span>
        <span class="stat-label">RATIONS</span>
        <span class="capitalize">{gs.rations}</span>
      </span>
    </div>
  </header>

  <div class="main-row">
    <!-- Left column (wide): map + actions + event log -->
    <div class="left-col">
      <TrailMap state={gs} />

      <div class="actions-row">
        {#if gs.completed}
          <EndScreen state={gs} />
        {:else}
          <ActionBar state={gs} slot={data.slot}
            onrest={() => (showRest = true)}
            onhunt={() => (showHunt = true)}
            onford={() => (showFord = true)}
            ontrade={() => (showTrade = true)}
          />
        {/if}
      </div>

      <EventLog state={gs} />
    </div>

    <!-- Right rail: party + inventory -->
    <div class="side-rail">
      <PartyPanel state={gs} />
      <InventoryPanel state={gs} />
    </div>
  </div>
</div>

{#if pendingEventId}
  <EventModal eventId={pendingEventId} slot={data.slot} />
{/if}

{#if showRest && !gs.completed}
  <RestModal state={gs} slot={data.slot} onclose={() => (showRest = false)} />
{/if}

{#if showHunt && !gs.completed}
  <HuntModal state={gs} slot={data.slot} onclose={() => (showHunt = false)} />
{/if}

{#if showFord && !gs.completed}
  <FordModal slot={data.slot} onclose={() => (showFord = false)} />
{/if}

{#if showTrade && !gs.completed}
  <TradeModal state={gs} slot={data.slot} onclose={() => (showTrade = false)} />
{/if}

<style>
  .play-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.8em;
    padding: 0.8em;
    min-height: calc(100vh - 60px);
  }
  .top-bar { display: flex; justify-content: space-between; align-items: center; }
  .main-row {
    display: grid;
    grid-template-columns: 1fr 280px;
    gap: 0.8em;
    flex: 1;
    min-height: 0;
  }
  .left-col {
    display: flex;
    flex-direction: column;
    gap: 0.8em;
    min-width: 0;
    min-height: 0;
  }
  .side-rail {
    display: flex;
    flex-direction: column;
    gap: 0.8em;
    min-width: 0;
    min-height: 0;
    overflow-y: auto;
  }

  @media (max-width: 900px) {
    .main-row { grid-template-columns: 1fr; }
    .side-rail { overflow-y: visible; }
  }

  .date-readout {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3em 1.2em;
    align-items: center;
    color: var(--c-tan);
  }
  .date-readout .stat {
    display: inline-flex;
    align-items: baseline;
    gap: 0.35em;
    font-size: 0.95em;
  }
  .date-readout .stat-icon {
    font-size: 1.1em;
    line-height: 1;
  }
  .date-readout .stat-label {
    font-size: 0.7em;
    letter-spacing: 0.12em;
    color: var(--c-wood);
    font-weight: 700;
  }
  .date-readout .day-num {
    color: var(--c-tan-bright);
    font-weight: 700;
    transition: color 0.25s, text-shadow 0.25s;
  }
  .date-readout.pulse .day-num {
    color: var(--c-rust);
    text-shadow: 0 0 10px var(--c-rust);
  }
  .date-readout .capitalize {
    text-transform: capitalize;
  }
</style>
