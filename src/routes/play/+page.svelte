<script lang="ts">
  import TrailMapSnippet from '$lib/ui/trail-map/TrailMapSnippet.svelte';
  import TrailMapModal from '$lib/ui/trail-map/TrailMapModal.svelte';
  import LandmarkStage from '$lib/ui/LandmarkStage.svelte';
  import PartyPanel from '$lib/ui/PartyPanel.svelte';
  import InventoryPanel from '$lib/ui/InventoryPanel.svelte';
  import EventLog from '$lib/ui/EventLog.svelte';
  import ActionBar from '$lib/ui/ActionBar.svelte';
  import WagonScene from '$lib/ui/wagon/WagonScene.svelte';
  import TownStage from '$lib/ui/TownStage.svelte';
  import EndScreen from '$lib/ui/EndScreen.svelte';
  import EventModal from '$lib/ui/EventModal.svelte';
  import HuntModal from '$lib/ui/HuntModal.svelte';
  import PostHuntModal from '$lib/ui/PostHuntModal.svelte';
  import FordModal from '$lib/ui/FordModal.svelte';
  import TradeModal from '$lib/ui/TradeModal.svelte';
  import CampStage from '$lib/ui/CampStage.svelte';
  import CampSummaryModal from '$lib/ui/CampSummaryModal.svelte';
  import FordSummaryModal from '$lib/ui/FordSummaryModal.svelte';
  import TradeReceiptModal from '$lib/ui/TradeReceiptModal.svelte';
  import NewspaperModal from '$lib/ui/NewspaperModal.svelte';
  import LetterModal from '$lib/ui/LetterModal.svelte';
  import WagonModal from '$lib/ui/WagonModal.svelte';
  import WagonPanel from '$lib/ui/WagonPanel.svelte';
  import WagonTrainPanel from '$lib/ui/WagonTrainPanel.svelte';
  import WagonTrainModal from '$lib/ui/WagonTrainModal.svelte';
  import PartyModal from '$lib/ui/PartyModal.svelte';
  import PartyMemberModal from '$lib/ui/PartyMemberModal.svelte';
  import InventoryModal from '$lib/ui/InventoryModal.svelte';
  import StatPicker from '$lib/ui/StatPicker.svelte';
  import StatIcon from '$lib/ui/stat-icons/StatIcon.svelte';
  import JourneyMenu from '$lib/ui/JourneyMenu.svelte';
  import { ICON, icon } from '$lib/data/icon-dictionary';
  import { weatherInfo } from '$lib/data/weather-info';
  import { getLandmark, LANDMARKS } from '$lib/game/content/landmarks';
  import { accumulateMiles, legOrdinal } from '$lib/ui/trail-map/trail-map-helpers';
  import type { GameState } from '$lib/game/types';
  import type { HuntHaul } from '$lib/game/actions/hunt';
  import type { CampSummary } from '$lib/game/actions/rest';
  import type { FordResult } from '$lib/game/actions/ford';
  import type { TradeResult } from '$lib/game/actions/trade';
  import type { PaperBatch } from '$lib/game/systems/news';
  import type { PendingLetter } from '$lib/game/systems/letters';

  let { data, form } = $props();
  const gs = $derived<GameState>(form?.state ?? data.state);
  const pendingEventId = $derived((gs.flags._pendingEventId as string | undefined));
  const huntHaul = $derived((gs.flags._huntHaul as unknown as HuntHaul | undefined));
  const campSummary = $derived((gs.flags._campSummary as unknown as CampSummary | undefined));
  const fordResult = $derived((gs.flags._fordResult as unknown as FordResult | undefined));
  const tradeResult = $derived((gs.flags._tradeResult as unknown as TradeResult | undefined));
  const paperBatch = $derived((gs.flags._paperBatch as unknown as PaperBatch | undefined));
  const pendingLetter = $derived((gs.flags._pendingLetter as unknown as PendingLetter | undefined));
  const qp = $derived(encodeURIComponent(data.slot));
  const paceAction = $derived(`?/setPace&slot=${qp}`);
  const rationsAction = $derived(`?/setRations&slot=${qp}`);

  const atLandmark = $derived(
    gs.location.atLandmarkId ? getLandmark(gs.location.atLandmarkId) : null
  );

  // Leg progression for the status bar — derived from cumulative
  // miles, same helper the trail-map snippet uses.
  const trailLegOrdinal = $derived(
    legOrdinal(accumulateMiles(LANDMARKS), gs.location.milesTraveled)
  );

  // Weather display metadata for the status bar. weatherInfo() falls
  // back to 'clear' for legacy saves where gs.weather is undefined.
  const todayWeather = $derived(weatherInfo(gs.weather));

  // showCamp is the "user clicked Make Camp" intent. When the server
  // marks a multi-day stay (#187) via flags._campPlannedDays, we force
  // CampStage open even after the manual showCamp flag clears so the
  // player can keep picking actions until the stay completes or they
  // break camp early.
  let showCamp = $state(false);
  const inCampStay = $derived((gs.flags._campPlannedDays as number | undefined) !== undefined);
  const showCampEffective = $derived(showCamp || inCampStay);
  let showHunt = $state(false);
  let showFord = $state(false);
  let showVisit = $state(false);
  let showTrade = $state(false);
  let showWagon = $state(false);
  let showParty = $state(false);
  let showTrain = $state(false);
  let selectedMemberId = $state<string | null>(null);
  let showInventory = $state(false);
  let showTrailMapModal = $state(false);

  // True when the left-column stage is the WagonScene travel view (no
  // camp, no town visit, not at a landmark, not completed). Travel
  // state has its own bottom-row layout (#212) — TrailMapSnippet and
  // EventLog split width 50/50 below the action bar.
  const isTravelStage = $derived(
    !gs.completed
    && !showCampEffective
    && !(showVisit && atLandmark && atLandmark.kind === 'trading_post')
    && !atLandmark
  );
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
  // Wagon rolls only when the day actually advances (player just hit
  // Travel and the engine moved). Between turns the scene is parked
  // so the wagon doesn't appear to keep moving while the player is
  // idle on the trail screen. #164.
  let wagonRolling = $state(false);
  let lastSeenDay = -1;
  $effect(() => {
    const currentDay = gs.day;
    if (lastSeenDay === -1) {
      lastSeenDay = currentDay;
      return;
    }
    if (currentDay !== lastSeenDay) {
      dayFlash = true;
      wagonRolling = true;
      lastSeenDay = currentDay;
      setTimeout(() => { dayFlash = false; }, 800);
      setTimeout(() => { wagonRolling = false; }, 1500);
    }
  });

  const paceOptions: Array<{ value: GameState['pace']; label: string; sublabel: string; icon: string }> = [
    { value: 'slow',     label: 'Slow',     sublabel: '14 mi/day · easy on team',   icon: ICON.pace_options.slow },
    { value: 'moderate', label: 'Moderate', sublabel: '20 mi/day · baseline',        icon: ICON.pace_options.moderate },
    { value: 'fast',     label: 'Fast',     sublabel: '26 mi/day · +fatigue',        icon: ICON.pace_options.fast },
    { value: 'grueling', label: 'Grueling', sublabel: '32 mi/day · injury risk',     icon: ICON.pace_options.grueling }
  ];
  const rationsOptions: Array<{ value: GameState['rations']; label: string; sublabel: string; icon: string }> = [
    { value: 'meager',  label: 'Low',    sublabel: '1 lb/person · health drain', icon: ICON.rations_options.meager },
    { value: 'normal',  label: 'Medium', sublabel: '2 lb/person · baseline',     icon: ICON.rations_options.normal },
    { value: 'filling', label: 'High',   sublabel: '3 lb/person · +morale',      icon: ICON.rations_options.filling }
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
        >{icon('actions', 'menu')}</button>
        <JourneyMenu bind:open={menuOpen} />
      </div>
      <h2 class="journey-title">{gs.party[0].name}'s Journey</h2>
    </div>
    <div class="date-readout {dayFlash ? 'pulse' : ''}">
      <span class="stat" title="Current day of the journey">
        <StatIcon kind="day" size={14} className="stat-svg" />
        <span class="stat-label">DAY</span>
        <span class="day-num">{gs.day}</span>
      </span>
      <span class="stat" title="In-game calendar date">
        <StatIcon kind="date" size={14} className="stat-svg" />
        <span class="stat-label">DATE</span>
        <span>{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][gs.date.month - 1]} {gs.date.day}, {gs.date.year}</span>
      </span>
      <span class="stat" title="Current leg of the trail">
        <StatIcon kind="leg" size={14} className="stat-svg" />
        <span class="stat-label">LEG</span>
        <span>{trailLegOrdinal.current} of {trailLegOrdinal.total}</span>
      </span>
      <!-- Weather stays as per-state emoji (clear/cloudy/rain/storm/fog…)
           rather than the generic <StatIcon kind="weather"> — the
           per-state glyph carries more info than a single SVG would. -->
      <span class="stat" title={todayWeather.tooltip}>
        <span class="stat-icon">{todayWeather.icon}</span>
        <span class="stat-label">WEATHER</span>
        <span>{todayWeather.label}</span>
      </span>
      <StatPicker
        kind="pace"
        label="PACE"
        name="pace"
        action={paceAction}
        current={gs.pace}
        options={paceOptions}
      />
      <StatPicker
        kind="rations"
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
      {#if showCampEffective && !gs.completed}
        <CampStage state={gs} slot={data.slot} onleave={() => (showCamp = false)} />
      {:else if showVisit && atLandmark && atLandmark.kind === 'trading_post' && !gs.completed}
        <TownStage
          state={gs}
          landmark={atLandmark}
          slot={data.slot}
          onleave={() => (showVisit = false)}
          ontrade={() => (showTrade = true)}
        />
      {:else if atLandmark}
        <LandmarkStage state={gs} landmark={atLandmark} />
      {:else}
        <!-- Travel hero (#212): WagonScene is the star of the show.
             Animation gated on `wagonRolling` so wheels + parallax only
             run for ~1.5s after a day-tick — between turns the scene
             is parked. The trail-map snippet moves to the bottom row
             alongside the event log. -->
        <WagonScene state={gs} paused={!wagonRolling} />
      {/if}

      <div class="actions-row">
        {#if gs.completed}
          <EndScreen state={gs} />
        {:else if !showCampEffective}
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

      {#if isTravelStage}
        <!-- Travel-state bottom row (#212) — event log and map snippet
             share the column width 50/50. Map keeps its click-to-expand
             affordance to TrailMapModal. -->
        <div class="travel-bottom">
          <div class="log-half">
            <EventLog state={gs} />
          </div>
          <TrailMapSnippet
            currentMileage={gs.location.milesTraveled}
            onExpand={() => (showTrailMapModal = true)} />
        </div>
      {:else}
        <div class="log-wrap">
          <EventLog state={gs} />
        </div>
      {/if}
    </div>

    <!-- Right rail: party + wagon + inventory -->
    <div class="side-rail">
      <PartyPanel state={gs} onopen={() => (showParty = true)} />
      <WagonPanel state={gs} onopen={() => (showWagon = true)} />
      <WagonTrainPanel state={gs} onopen={() => (showTrain = true)} />
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

{#if showTrain}
  <WagonTrainModal state={gs} slot={data.slot} onclose={() => (showTrain = false)} />
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
  <InventoryModal state={gs} slot={data.slot} onclose={() => (showInventory = false)} />
{/if}

{#if showTrailMapModal}
  <TrailMapModal
    currentMileage={gs.location.milesTraveled}
    onClose={() => (showTrailMapModal = false)}
  />
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

{#if paperBatch && !gs.completed}
  <NewspaperModal batch={paperBatch} slot={data.slot} />
{/if}

{#if pendingLetter && !gs.completed}
  <LetterModal letter={pendingLetter} slot={data.slot} />
{/if}

{#if showFord && !gs.completed}
  <FordModal state={gs} slot={data.slot} onclose={() => (showFord = false)} />
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

  /* Travel-state bottom row (#212) — TrailMapSnippet + EventLog share
     width 50/50, height grows to fill the column. Map snippet's own
     fixed height is overridden via :global so it can flex. */
  .travel-bottom {
    display: flex;
    gap: 0.5em;
    flex: 1;
    min-height: 0;
    width: 100%;
  }
  .travel-bottom > :global(*) {
    flex: 1 1 0;
    min-width: 0;
  }
  .travel-bottom > :global(.snippet-host) {
    height: auto;
    min-height: 0;
  }
  .log-half {
    display: flex;
    min-width: 0;
    min-height: 0;
  }
  .log-half > :global(.event-log) {
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
    /* Match the prototype's tighter inline rhythm: 4px row gap × 16px column gap. */
    gap: 4px 16px;
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
