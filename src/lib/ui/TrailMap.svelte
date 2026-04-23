<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { LANDMARKS } from '$lib/game/content/landmarks';
  let { state: gameState }: { state: GameState } = $props();

  // Stop-worthy landmarks are the "chunk" boundaries. Everything in between is
  // scenic. We render one chunk at a time so each dot is far enough apart to
  // read. The full-trail scale made every landmark a pixel away from the next.
  const STOP_KINDS = new Set<string>(['start', 'trading_post', 'river', 'end']);

  const totalMiles = LANDMARKS.reduce((s, l) => s + l.milesFromPrevious, 0);

  // Precompute cumulative mile for each landmark.
  const marks = (() => {
    let cum = 0;
    return LANDMARKS.map((l) => {
      cum += l.milesFromPrevious;
      return { ...l, mile: cum };
    });
  })();

  const previousId = $derived(gameState.location.previousLandmarkId);
  const nextId = $derived(gameState.location.nextLandmarkId);

  // Current chunk bounds: walk back from the most recent landmark we've passed
  // to find the start of this chunk, and forward to find its end.
  const leg = $derived.by(() => {
    // At game start `previousLandmarkId` is null — we haven't passed anything
    // yet, so the leg anchors on Independence (index 0). Otherwise anchor on
    // the landmark we just passed.
    const anchorIdx = previousId
      ? Math.max(0, marks.findIndex((m) => m.id === previousId))
      : 0;
    // Avoid an unused-warning on the nextLandmark reactive by touching it;
    // the wagon position and labels still depend on it indirectly through
    // milesTraveled, but keeping the read here guards against future changes.
    void nextId;

    // Start: walk back from anchor (inclusive) to the most recent stop-worthy.
    let startIdx = 0;
    for (let i = anchorIdx; i >= 0; i--) {
      if (STOP_KINDS.has(marks[i].kind)) { startIdx = i; break; }
    }
    // End: walk forward from startIdx+1 to the next stop-worthy.
    let endIdx = marks.length - 1;
    for (let i = startIdx + 1; i < marks.length; i++) {
      if (STOP_KINDS.has(marks[i].kind)) { endIdx = i; break; }
    }

    const chunk = marks.slice(startIdx, endIdx + 1);
    const startMile = marks[startIdx].mile;
    const endMile = marks[endIdx].mile;
    const span = Math.max(1, endMile - startMile);

    return { chunk, startIdx, endIdx, startMile, endMile, span };
  });

  // Wagon position within the leg, as a percentage along it.
  const wagonLegPct = $derived(
    Math.max(0, Math.min(100, ((gameState.location.milesTraveled - leg.startMile) / leg.span) * 100))
  );

  // Overall journey progress (for the mini-strip at the bottom).
  const overallPct = $derived(Math.min(100, (gameState.location.milesTraveled / totalMiles) * 100));

  // Visibility: how many stop-worthy landmarks ahead can the party "see"?
  // Base = 1 (the one at the end of the current leg); Scout adds 2; Spyglass adds 1.
  const hasScout = $derived(gameState.party.some((m) => !m.dead && m.profession === 'scout'));
  const hasSpyglass = $derived((gameState.inventory.spyglass ?? 0) > 0);
  const lookaheadStops = $derived(1 + (hasScout ? 2 : 0) + (hasSpyglass ? 1 : 0));

  // Collect the next N stop-worthy landmarks beyond the current leg's end, for
  // the "Ahead" preview strip.
  const upcoming = $derived.by(() => {
    const out: typeof marks = [];
    for (let i = leg.endIdx + 1; i < marks.length && out.length < lookaheadStops - 1; i++) {
      if (STOP_KINDS.has(marks[i].kind)) out.push(marks[i]);
    }
    return out;
  });

  // Per-landmark glyph — kind alone isn't specific enough (different rivers
  // and forts want different vibe). Fallbacks by kind if unlisted.
  const LANDMARK_GLYPH: Record<string, string> = {
    independence:       '🏠',
    kansas_river:       '🌊',
    alcove_spring:      '💧',
    big_blue_river:     '🌊',
    ft_kearny:          '🏰',
    ash_hollow:         '🌳',
    north_platte_1:     '🌊',
    courthouse_rock:    '🏛️',
    chimney_rock:       '🗼',
    scotts_bluff:       '🏔️',
    ft_laramie:         '🏰',
    register_cliff:     '📜',
    guernsey_ruts:      '〰️',
    north_platte_2:     '🌊',
    independence_rock:  '🗿',
    devils_gate:        '⛰️',
    sweetwater_1:       '🌊',
    south_pass:         '⛰️',
    pacific_springs:    '💧',
    green_river:        '🌊',
    ft_bridger:         '🏰',
    bear_river:         '🌊',
    soda_springs:       '💧',
    ft_hall:            '🏰',
    snake_three_island: '🌊',
    ft_boise:           '🏰',
    farewell_bend:      '🏞️',
    blue_mountains:     '🏔️',
    ft_walla_walla:     '🏰',
    the_dalles:         '🏞️',
    laurel_hill:        '🏔️',
    oregon_city:        '🏁'
  };
  function glyphFor(id: string, kind: string): string {
    return LANDMARK_GLYPH[id] ?? (
      kind === 'trading_post' ? '🏰'
      : kind === 'river'       ? '🌊'
      : kind === 'end'         ? '🏁'
      : kind === 'start'       ? '🏠'
      : '📍'
    );
  }

  // Classic OT orientation: Independence on the RIGHT (east), destination on
  // the LEFT (west). Position dots from the right via `right: X%`.
  function dotRightPctForLeg(mile: number): number {
    const pctAlongLeg = ((mile - leg.startMile) / leg.span) * 100;
    // Inset 4% on each side for breathing room
    return 4 + pctAlongLeg * 0.92;
  }
</script>

<div class="map panel"
  style="
    background: var(--c-parchment);
    color: var(--c-ink);
    position: relative;
    min-height: 340px;
    padding: 1em 1em 5.5em 1em;
  "
>
  <h4 class="map-head">
    <span class="leg-label">{leg.chunk[0].name} → {leg.chunk[leg.chunk.length - 1].name}</span>
    <span class="leg-miles">{Math.round(gameState.location.milesTraveled - leg.startMile)} / {Math.round(leg.span)} mi this leg</span>
  </h4>

  <!-- Dashed trail for the current leg. Independence (east) on the RIGHT. -->
  <div class="trail-wrap">
    <div class="trail-line"></div>

    <div class="compass-east">← EAST</div>
    <div class="compass-west">WEST →</div>

    {#each leg.chunk as m, i}
      {@const dotRight = dotRightPctForLeg(m.mile)}
      {@const reached = gameState.location.milesTraveled >= m.mile}
      <div
        class="lm kind-{m.kind}"
        class:reached
        style="right: calc({dotRight}% - 14px);"
        title="{m.name} ({m.mile} mi)"
      >
        <span class="lm-glyph">{glyphFor(m.id, m.kind)}</span>
      </div>
      <!-- Alternate labels above/below the line so names don't collide on tight legs. -->
      <div
        class="lm-label"
        class:above={i % 2 === 0}
        class:below={i % 2 === 1}
        style="right: calc({dotRight}% - 60px);"
      >
        {m.name}
      </div>
    {/each}

    <!-- Wagon: slides along the current leg -->
    <div class="wagon" style="right: calc({4 + wagonLegPct * 0.92}% - 12px);">🐂🛖</div>
  </div>

  <!-- Upcoming stops (base + scout + spyglass visibility) -->
  {#if upcoming.length > 0}
    <div class="ahead-strip" title={hasScout || hasSpyglass ? `${hasScout ? 'Scout' : ''}${hasScout && hasSpyglass ? ' + ' : ''}${hasSpyglass ? 'Spyglass' : ''} extends your view` : ''}>
      <span class="ahead-label">AHEAD</span>
      <span class="ahead-sep">·</span>
      {#each upcoming as u, i}
        <span class="ahead-item">
          <span class="ahead-glyph">{glyphFor(u.id, u.kind)}</span>
          {u.name}
        </span>
        {#if i < upcoming.length - 1}
          <span class="ahead-sep">·</span>
        {/if}
      {/each}
    </div>
  {/if}

  <!-- Overall journey mini-strip -->
  <div class="mini-strip">
    <div class="mini-label">OVERALL</div>
    <div class="mini-track">
      <div class="mini-fill" style="right: {100 - overallPct}%;"></div>
      <div class="mini-wagon" style="right: calc({overallPct}% - 4px);"></div>
    </div>
    <div class="mini-value">{Math.round(gameState.location.milesTraveled)} / {totalMiles}</div>
  </div>
</div>

<style>
  .map-head {
    color: var(--c-ink);
    margin: 0 0 0.3em 0;
    letter-spacing: 0.1em;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1em;
    flex-wrap: wrap;
    font-size: 0.95em;
  }
  .leg-label {
    font-size: 0.95em;
    color: var(--c-rust-dark);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .leg-miles {
    font-size: 0.78em;
    color: var(--c-wood);
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0.04em;
    font-style: italic;
  }

  .trail-wrap {
    position: relative;
    height: 180px;
    margin-top: 1em;
  }
  .trail-line {
    position: absolute;
    top: 50%;
    left: 4%;
    right: 4%;
    height: 2px;
    background: repeating-linear-gradient(
      to right,
      var(--c-rust) 0 6px,
      transparent 6px 12px
    );
  }

  .compass-east, .compass-west {
    position: absolute;
    top: 0;
    font-size: 0.7em;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--c-ink);
  }
  .compass-east { right: 0; }
  .compass-west { left: 0; }

  .lm {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid var(--c-ink);
    background: var(--c-parchment);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
    /* Ring-color cue by kind, keeps icon legible on parchment */
  }
  .lm-glyph {
    font-size: 0.95em;
    line-height: 1;
    filter: saturate(0.85);
  }
  .lm.reached {
    background: #f0e2c2; /* slightly darker parchment — "visited" */
    box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.25);
  }

  .lm.kind-river         { border-color: #2f5a8a; background: #d6e2ec; }
  .lm.kind-trading_post  { border-color: var(--c-rust); background: #f3dbb8; }
  .lm.kind-end           { border-color: #7a5a10; background: #f5e0a8; }
  .lm.kind-start         { border-color: var(--c-rust-dark); background: #f3dbb8; }
  /* Scenic landmarks keep the default parchment + ink border */

  .lm-label {
    position: absolute;
    width: 120px;
    text-align: center;
    font-size: 0.72em;
    font-weight: 700;
    color: var(--c-ink);
    letter-spacing: 0.02em;
    line-height: 1.2;
    pointer-events: none;
  }
  .lm-label.above { top: calc(50% - 34px); }
  .lm-label.below { top: calc(50% + 22px); }

  .wagon {
    position: absolute;
    top: 38%;
    transform: translateY(-50%);
    font-size: 1.5em;
    transition: right 2.5s cubic-bezier(0.4, 0.0, 0.2, 1);
    animation: wagon-bob 1.8s ease-in-out infinite;
    filter: drop-shadow(0 1px 0 rgba(0, 0, 0, 0.2));
  }
  @keyframes wagon-bob {
    0%, 100% { transform: translateY(-50%) rotate(-0.8deg); }
    50%      { transform: translateY(calc(-50% - 3px)) rotate(0.8deg); }
  }

  /* Upcoming-landmarks preview strip. Sits just above the overall mini-strip. */
  .ahead-strip {
    position: absolute;
    left: 1em;
    right: 1em;
    bottom: 2.3em;
    display: flex;
    align-items: center;
    gap: 0.4em;
    flex-wrap: wrap;
    font-size: 0.72em;
    color: var(--c-wood);
    font-weight: 700;
    letter-spacing: 0.05em;
  }
  .ahead-label {
    font-size: 0.85em;
    letter-spacing: 0.15em;
    color: var(--c-rust-dark);
  }
  .ahead-item {
    display: inline-flex;
    align-items: center;
    gap: 0.3em;
    color: var(--c-ink);
    font-weight: 700;
    letter-spacing: 0.02em;
  }
  .ahead-glyph {
    font-size: 1em;
    line-height: 1;
    filter: saturate(0.85);
  }
  .ahead-sep { color: var(--c-wood); opacity: 0.5; }

  /* Overall journey mini-strip at the bottom */
  .mini-strip {
    position: absolute;
    left: 1em;
    right: 1em;
    bottom: 1em;
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 0.6em;
    align-items: center;
  }
  .mini-label {
    font-size: 0.65em;
    font-weight: 700;
    letter-spacing: 0.15em;
    color: var(--c-wood);
  }
  .mini-track {
    position: relative;
    height: 4px;
    background: rgba(138, 90, 42, 0.25);
    border-radius: 2px;
    overflow: visible;
  }
  .mini-fill {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    background: var(--c-rust);
    border-radius: 2px;
    transition: right 0.6s cubic-bezier(0.4, 0.0, 0.2, 1);
  }
  .mini-wagon {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 8px;
    height: 8px;
    background: var(--c-rust-dark);
    border: 1px solid var(--c-ink);
    border-radius: 50%;
    transition: right 0.6s cubic-bezier(0.4, 0.0, 0.2, 1);
  }
  .mini-value {
    font-size: 0.75em;
    color: var(--c-wood);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
</style>
