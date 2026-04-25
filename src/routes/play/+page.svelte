<script lang="ts">
  import TrailMap from '$lib/ui/TrailMap.svelte';
  import LandmarkStage from '$lib/ui/LandmarkStage.svelte';
  import PartyPanel from '$lib/ui/PartyPanel.svelte';
  import InventoryPanel from '$lib/ui/InventoryPanel.svelte';
  import EventLog from '$lib/ui/EventLog.svelte';
  import ActionBar from '$lib/ui/ActionBar.svelte';
  import WagonScene from '$lib/ui/WagonScene.svelte';
  import EndScreen from '$lib/ui/EndScreen.svelte';
  import EventModal from '$lib/ui/EventModal.svelte';
  import HuntModal from '$lib/ui/HuntModal.svelte';
  import PostHuntModal from '$lib/ui/PostHuntModal.svelte';
  import FordModal from '$lib/ui/FordModal.svelte';
  import TradeModal from '$lib/ui/TradeModal.svelte';
  import VisitModal from '$lib/ui/VisitModal.svelte';
  import CampStage from '$lib/ui/CampStage.svelte';
  import CampSummaryModal from '$lib/ui/CampSummaryModal.svelte';
  import FordSummaryModal from '$lib/ui/FordSummaryModal.svelte';
  import TradeReceiptModal from '$lib/ui/TradeReceiptModal.svelte';
  import WagonModal from '$lib/ui/WagonModal.svelte';
  import WagonPanel from '$lib/ui/WagonPanel.svelte';
  import PartyModal from '$lib/ui/PartyModal.svelte';
  import PartyMemberModal from '$lib/ui/PartyMemberModal.svelte';
  import InventoryModal from '$lib/ui/InventoryModal.svelte';
  import StatPicker from '$lib/ui/StatPicker.svelte';
  import JourneyMenu from '$lib/ui/JourneyMenu.svelte';
  import { getLandmark } from '$lib/game/content/landmarks';
  import type { GameState } from '$lib/game/types';
  import type { HuntHaul } from '$lib/game/actions/hunt';
  import type { CampSummary } from '$lib/game/actions/rest';
  import type { FordResult } from '$lib/game/actions/ford';
  import type { TradeResult } from '$lib/game/actions/trade';

  let { data, form } = $props();
  const gs = $derived<GameState>(form?.state ?? data.state);
  const pendingEventId = $derived((gs.flags._pendingEventId as string | undefined));
  const huntHaul = $derived((gs.flags._huntHaul as unknown as HuntHaul | undefined));
  const campSummary = $derived((gs.flags._campSummary as unknown as CampSummary | undefined));
  const fordResult = $derived((gs.flags._fordResult as unknown as FordResult | undefined));
  const tradeResult = $derived((gs.flags._tradeResult as unknown as TradeResult | undefined));
  const qp = $derived(encodeURIComponent(data.slot));
  const paceAction = $derived(`?/setPace&slot=${qp}`);
  const rationsAction = $derived(`?/setRations&slot=${qp}`);

  const atLandmark = $derived(
    gs.location.atLandmarkId ? getLandmark(gs.location.atLandmarkId) : null
  );

  let showCamp = $state(false);
  let showHunt = $state(false);
  let showFord = $state(false);
  let showVisit = $state(false);
  let showTrade = $state(false);
  let showWagon = $state(false);
  let showParty = $state(false);
  let selectedMemberId = $state<string | null>(null);
  let showInventory = $state(false);
  const selectedMember = $derived(
    selectedMemberId ? gs.party.find((m) => m.id === selectedMemberId) ?? null : null
  );
  let menuOpen = $state(false);

  // Delay the event modal's appearance so the wagon has time to slide +
  // the travel-summary log entry is visible before the modal covers things.
  const MODAL_DELAY_MS = 1600;
  let modalReady = $state(false);
  $effect(() => {
    const id = pendingEventId;
    if (id) {
      const t = setTimeout(() => { modalReady = true; }, MODAL_DELAY_MS);
      return () => clearTimeout(t);
    }
    modalReady = false;
  });

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

  const paceOptions: Array<{ value: GameState['pace']; label: string; sublabel: string; icon: string }> = [
    { value: 'slow',     label: 'Slow',     sublabel: '12 mi/day · easy on team',   icon: '🐢' },
    { value: 'moderate', label: 'Moderate', sublabel: '18 mi/day · baseline',        icon: '🐂' },
    { value: 'fast',     label: 'Fast',     sublabel: '24 mi/day · +fatigue',        icon: '🏃' },
    { value: 'grueling', label: 'Grueling', sublabel: '30 mi/day · injury risk',     icon: '⚡' }
  ];
  const rationsOptions: Array<{ value: GameState['rations']; label: string; sublabel: string; icon: string }> = [
    { value: 'meager',  label: 'Low',    sublabel: '1 lb/person · health drain', icon: '🥣' },
    { value: 'normal',  label: 'Medium', sublabel: '2 lb/person · baseline',     icon: '🍽️' },
    { value: 'filling', label: 'High',   sublabel: '3 lb/person · +morale',      icon: '🍖' }
  ];
</script>

<div class="play-wrap">
  <!-- Journey header -->
  <header class="panel top-bar">
    <div class="title-row">
      <div class="menu-anchor">
        <button
          type="button"
          class="journey-icon"
          class:active={menuOpen}
          onclick={(e) => { e.stopPropagation(); menuOpen = !menuOpen; }}
          title="Journey menu"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >🤠</button>
        <JourneyMenu bind:open={menuOpen} />
      </div>
      <h2 class="journey-title">{gs.party[0].name}'s Journey</h2>
    </div>
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
      <StatPicker
        icon="🐂"
        label="PACE"
        name="pace"
        action={paceAction}
        current={gs.pace}
        options={paceOptions}
      />
      <StatPicker
        icon="🍖"
        label="RATIONS"
        name="rations"
        action={rationsAction}
        current={gs.rations}
        options={rationsOptions}
        align="right"
      />
    </div>
  </header>

  <div class="main-row">
    <!-- Left column: stage (camp / landmark / trail) + action bar +
         event log strip at the bottom. Log is width-capped via .log-wrap
         so long lines don't stretch full-column, and height-capped in
         EventLog itself so it doesn't push the stage off-viewport. -->
    <div class="left-col">
      {#if showCamp && !gs.completed}
        <CampStage state={gs} slot={data.slot} onleave={() => (showCamp = false)} />
      {:else if atLandmark}
        <LandmarkStage state={gs} landmark={atLandmark} />
      {:else}
        <TrailMap state={gs} />
        <!-- Side view of the wagon traveling. Reflects current
             terrain; eventually will host real animation. -->
        <WagonScene state={gs} />
      {/if}

      <div class="actions-row">
        {#if gs.completed}
          <EndScreen state={gs} />
        {:else if !showCamp}
          <!-- Camp stage owns its own Begin/Leave controls. Hiding the
               trail ActionBar while in camp keeps Travel/Hunt/etc from
               being clickable during camp planning. -->
          <ActionBar state={gs} slot={data.slot}
            onrest={() => (showCamp = true)}
            onhunt={() => (showHunt = true)}
            onford={() => (showFord = true)}
            onvisit={() => (showVisit = true)}
          />
        {/if}
      </div>

      <div class="log-wrap">
        <EventLog state={gs} />
      </div>
    </div>

    <!-- Right rail: party + wagon + inventory -->
    <div class="side-rail">
      <PartyPanel state={gs} onopen={() => (showParty = true)} />
      <WagonPanel state={gs} onopen={() => (showWagon = true)} />
      <InventoryPanel state={gs} onopen={() => (showInventory = true)} />
    </div>
  </div>
</div>

{#if pendingEventId && modalReady}
  <EventModal
    eventId={pendingEventId}
    slot={data.slot}
    gameState={gs}
    body={(gs.flags._pendingEventBody as string | undefined)}
  />
{/if}

{#if showWagon}
  <WagonModal state={gs} onclose={() => (showWagon = false)} />
{/if}

{#if showParty}
  <PartyModal
    state={gs}
    onclose={() => (showParty = false)}
    onselect={(id) => (selectedMemberId = id)}
  />
{/if}

{#if selectedMember}
  <PartyMemberModal
    member={selectedMember}
    onclose={() => (selectedMemberId = null)}
  />
{/if}

{#if showInventory}
  <InventoryModal state={gs} onclose={() => (showInventory = false)} />
{/if}

{#if showHunt && !gs.completed}
  <HuntModal state={gs} slot={data.slot} onclose={() => (showHunt = false)} />
{/if}

{#if huntHaul && !gs.completed}
  <PostHuntModal haul={huntHaul} slot={data.slot} currentDay={gs.day} />
{/if}

{#if campSummary && !gs.completed}
  <CampSummaryModal summary={campSummary} slot={data.slot} />
{/if}

{#if fordResult && !gs.completed}
  <FordSummaryModal result={fordResult} slot={data.slot} />
{/if}

{#if tradeResult && !gs.completed}
  <TradeReceiptModal result={tradeResult} slot={data.slot} />
{/if}

{#if showFord && !gs.completed}
  <FordModal state={gs} slot={data.slot} onclose={() => (showFord = false)} />
{/if}

{#if showVisit && atLandmark && !gs.completed}
  <VisitModal
    state={gs}
    landmark={atLandmark}
    onclose={() => (showVisit = false)}
    ontrade={() => (showTrade = true)}
  />
{/if}

{#if showTrade && !gs.completed}
  <TradeModal state={gs} slot={data.slot} onclose={() => (showTrade = false)} />
{/if}

<style>
  .play-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    padding: 0.6em;
    height: 100vh;
    overflow: hidden;
  }
  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.4em 0.8em;
    gap: 1em;
    flex-wrap: wrap;
  }
  .title-row {
    display: flex;
    align-items: center;
    gap: 0.5em;
  }
  .menu-anchor {
    position: relative;
  }
  .journey-icon {
    /* Override default button chrome — acts like a soft icon button */
    background: transparent;
    color: var(--c-rust);
    border: 2px solid transparent;
    padding: 0.1em 0.3em;
    font-size: 1.4em;
    line-height: 1;
    cursor: pointer;
    border-radius: 4px;
    transition: border-color 0.15s, background 0.15s;
  }
  .journey-icon:hover,
  .journey-icon.active {
    border-color: var(--c-rust);
    background: var(--c-bg-raised);
  }
  .journey-title {
    margin: 0;
    font-size: 1.2em;
  }

  .main-row {
    display: grid;
    grid-template-columns: 1fr 280px;
    gap: 0.6em;
    flex: 1;
    min-height: 0;
  }
  .left-col {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    min-width: 0;
    min-height: 0;
  }
  /* Event log strip — capped width so lines don't stretch the full
     column width. Flex-grows vertically to the bottom of the left
     column (the stage and action bar take their own heights first). */
  .log-wrap {
    max-width: 680px;
    width: 100%;
    min-height: 0;
    display: flex;
    flex: 1;
  }
  .log-wrap > :global(.event-log) {
    flex: 1;
    min-height: 0;
  }
  .side-rail {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    min-width: 0;
    min-height: 0;
    overflow-y: auto;
  }

  @media (max-width: 900px) {
    .play-wrap { height: auto; overflow: visible; }
    .main-row { grid-template-columns: 1fr; }
    .side-rail { overflow-y: visible; }
  }

  .date-readout {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3em 0.8em;
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
</style>
