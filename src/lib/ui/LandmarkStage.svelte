<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import type { Landmark } from '$lib/game/content/landmarks';
  import { isLandmarkAbandoned } from '$lib/game/content/landmarks';

  let { state, landmark }: { state: GameState; landmark: Landmark } = $props();

  // Trading posts can be shuttered by the time the party arrives (Fort
  // Hall was abandoned by HBC in 1856). Surface this as an "abandoned"
  // variant of the stage — no Visit action, empty-stockade flavor.
  const abandoned = $derived(isLandmarkAbandoned(landmark, state.date.year));

  const icon = $derived(
    abandoned ? '🏚️'
    : landmark.kind === 'trading_post' ? '🏛️'
    : landmark.kind === 'river'       ? '🌊'
    : landmark.kind === 'end'         ? '🏁'
    : '📍'
  );
  const kindLabel = $derived(
    abandoned ? 'ABANDONED POST'
    : landmark.kind === 'trading_post' ? 'TRADING POST'
    : landmark.kind === 'river'       ? 'RIVER CROSSING'
    : landmark.kind === 'end'         ? "JOURNEY'S END"
    : 'STOPPED AT'
  );
  const prompt = $derived(
    abandoned ? "An empty stockade. The gates swing open to nothing. Rest and press on."
    : landmark.kind === 'trading_post' ? 'You may trade supplies, rest, hunt, or continue when ready.'
    : landmark.kind === 'river'       ? 'The river blocks your path. Ford, caulk & float, hire a ferry, or wait it out.'
    : landmark.kind === 'end'         ? "The trail ends here. Your journey is complete."
    : 'You have arrived.'
  );

  // Light flavor text by landmark id (placeholder until phase 2 rich content).
  const FLAVOR: Record<string, string> = {
    ft_kearny: 'A sod-and-timber military post on the Platte. Soldiers drill at dawn, emigrants trade at dusk.',
    ft_laramie: 'A great adobe fort at the fork of the Laramie and North Platte. Last outpost before the Rockies.',
    ft_bridger: "Jim Bridger's post — a weathered stockade among the Uintas. Supplies are dear.",
    ft_hall: 'A Hudson\'s Bay Company post on the Snake River. The California Trail splits here.',
    ft_boise: 'A small HBC station by the Boise River. Worn travelers rest among cottonwoods.',
    ft_walla_walla: 'A lonely outpost by the Columbia. The final stretch begins.',
    oregon_city: 'The end of the trail. Wagons gather in the willow bottoms along the Willamette.'
  };
  // Replace the normal flavor line with the landmark's own blurb when
  // the post is closed — "empty stockade" reads, not the old hub flavor.
  const flavor = $derived(
    abandoned
      ? (landmark.blurb ? `Once: ${landmark.blurb}` : null)
      : (FLAVOR[landmark.id] ?? null)
  );

  // Miles remaining along the trail
  const remainingMiles = $derived(
    Math.max(0, Math.round((landmark.kind === 'end' ? 0 : (1 - state.location.trailPosition) * 2000)))
  );
</script>

<div class="stage panel stage-{landmark.kind}">
  <div class="hero">
    <div class="hero-icon">{icon}</div>
    <div class="hero-text">
      <div class="kind">{kindLabel}</div>
      <h2 class="name">{landmark.name}</h2>
      <p class="prompt">{prompt}</p>
    </div>
  </div>

  {#if flavor}
    <div class="flavor">{flavor}</div>
  {/if}

  {#if landmark.kind === 'river' && landmark.river}
    <div class="river-details">
      <div class="river-head">RIVER CONDITIONS</div>
      <div class="river-grid">
        <div class="river-stat">
          <span class="river-icon">📏</span>
          <span class="river-label">DEPTH</span>
          <span class="river-val">{landmark.river.depthFt.toFixed(1)} ft</span>
        </div>
        <div class="river-stat">
          <span class="river-icon">🌊</span>
          <span class="river-label">CURRENT</span>
          <span class="river-val">{landmark.river.currentMph} mph</span>
        </div>
        <div class="river-stat">
          <span class="river-icon">⛵</span>
          <span class="river-label">FERRY</span>
          <span class="river-val">${landmark.river.ferryPrice}</span>
        </div>
      </div>
      <p class="river-hint">
        {landmark.river.depthFt >= 4 ? 'Deep — fording risks soaking supplies or losing livestock.'
         : landmark.river.depthFt >= 3 ? 'Moderate depth — fording is feasible but not safe.'
         : 'Shallow enough to ford, most days.'}
        {landmark.river.currentMph >= 3 ? ' Current is swift — watch for drifting.' : ''}
      </p>
    </div>
  {/if}

  <div class="meta-row">
    <div class="meta-cell">
      <span class="meta-head">DAY</span>
      <span class="meta-val">{state.day}</span>
    </div>
    <div class="meta-cell">
      <span class="meta-head">MILES TRAVELED</span>
      <span class="meta-val">{Math.round(state.location.milesTraveled)}</span>
    </div>
    {#if landmark.kind !== 'end'}
      <div class="meta-cell">
        <span class="meta-head">MILES REMAINING</span>
        <span class="meta-val">~{remainingMiles}</span>
      </div>
    {/if}
  </div>

  <!-- Placeholder for phase 2 rich visuals -->
  <div class="art-placeholder">
    <span class="placeholder-note">
      (Rich landmark artwork — phase 2)
    </span>
  </div>
</div>

<style>
  .stage {
    display: flex;
    flex-direction: column;
    gap: 1em;
    padding: 1.2em 1.4em;
    min-height: 0;
    flex: 1;
  }

  /* Trading post: warm parchment / rust — welcoming */
  .stage-trading_post {
    background: var(--c-parchment);
    color: var(--c-ink);
    border-color: var(--c-rust);
  }
  .stage-trading_post .kind { color: var(--c-rust-dark); }
  .stage-trading_post .name { color: var(--c-rust-dark); }
  .stage-trading_post .meta-head { color: var(--c-rust-dark); }
  .stage-trading_post .meta-val { color: var(--c-ink); }
  .stage-trading_post .flavor { color: var(--c-ink); }
  .stage-trading_post .art-placeholder {
    background: rgba(138, 90, 42, 0.12);
    border-color: rgba(138, 90, 42, 0.4);
  }

  /* River: cool, insistent */
  .stage-river {
    background: #1a2a3a;
    color: #c8dae8;
    border-color: #4a8bc9;
  }
  .stage-river .kind { color: #4a8bc9; }
  .stage-river .name { color: #c8dae8; }
  .stage-river .meta-head { color: #6aa4d4; }
  .stage-river .meta-val { color: #c8dae8; }
  .stage-river .art-placeholder {
    background: rgba(74, 139, 201, 0.12);
    border-color: rgba(74, 139, 201, 0.4);
  }

  /* End: celebratory gold */
  .stage-end {
    background: #3a2a10;
    color: #f5c96a;
    border-color: #f5c96a;
  }
  .stage-end .kind { color: #e8c89a; }
  .stage-end .name { color: #f5c96a; }
  .stage-end .meta-head { color: #e8c89a; }
  .stage-end .meta-val { color: #f5c96a; }
  .stage-end .art-placeholder {
    background: rgba(245, 201, 106, 0.08);
    border-color: rgba(245, 201, 106, 0.4);
  }

  .hero {
    display: flex;
    gap: 1em;
    align-items: center;
  }
  .hero-icon {
    font-size: 3em;
    line-height: 1;
    flex-shrink: 0;
  }
  .hero-text { flex: 1; min-width: 0; }
  .kind {
    font-size: 0.75em;
    font-weight: 700;
    letter-spacing: 0.2em;
    opacity: 0.85;
  }
  .name {
    font-size: 1.6em;
    font-weight: 700;
    letter-spacing: 0.04em;
    margin: 0.1em 0 0.3em 0;
  }
  .prompt {
    font-size: 0.95em;
    line-height: 1.4;
    font-style: italic;
    margin: 0;
  }

  .flavor {
    font-size: 0.9em;
    line-height: 1.5;
    padding: 0.5em 0;
    border-top: 1px dashed rgba(0, 0, 0, 0.15);
  }
  .stage-river .flavor,
  .stage-end .flavor {
    border-top-color: rgba(255, 255, 255, 0.15);
  }

  .river-details {
    padding: 0.6em 0.8em;
    background: rgba(74, 139, 201, 0.08);
    border: 1px solid rgba(74, 139, 201, 0.35);
    border-radius: 3px;
  }
  .river-head {
    font-size: 0.7em;
    letter-spacing: 0.15em;
    font-weight: 700;
    color: #6aa4d4;
    margin-bottom: 0.4em;
  }
  .river-grid {
    display: flex;
    gap: 1.5em;
    flex-wrap: wrap;
    margin-bottom: 0.4em;
  }
  .river-stat {
    display: inline-flex;
    align-items: baseline;
    gap: 0.4em;
  }
  .river-icon { font-size: 1.2em; line-height: 1; }
  .river-label {
    font-size: 0.7em;
    letter-spacing: 0.12em;
    color: #6aa4d4;
    font-weight: 700;
  }
  .river-val {
    font-weight: 700;
    color: #c8dae8;
  }
  .river-hint {
    font-size: 0.85em;
    font-style: italic;
    color: #a9c4dc;
    margin: 0;
    line-height: 1.4;
  }

  .meta-row {
    display: flex;
    gap: 1.5em;
    flex-wrap: wrap;
  }
  .meta-cell {
    display: flex;
    flex-direction: column;
    gap: 0.1em;
  }
  .meta-head {
    font-size: 0.7em;
    letter-spacing: 0.15em;
    font-weight: 700;
  }
  .meta-val {
    font-size: 1.3em;
    font-weight: 700;
  }

  .art-placeholder {
    flex: 1;
    min-height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px dashed;
    border-radius: 3px;
  }
  .placeholder-note {
    font-size: 0.8em;
    font-style: italic;
    opacity: 0.6;
  }
</style>
