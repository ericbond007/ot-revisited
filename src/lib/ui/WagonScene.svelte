<script lang="ts">
  // Day Travel Status view — a vertical split panel that goes under the
  // trail map. Left half: side-view scene of the wagon on terrain (sky
  // band, horizon row, ground band, custom CSS wagon pulled by ox/mule).
  // Right half: text readouts for the current day — terrain, weather,
  // season, miles. Eventually the left panel hosts real frame-by-frame
  // travel; the right panel widens to include actual weather state
  // (#153) and per-day mileage tracking.

  import type { GameState } from '$lib/game/types';

  let { state }: { state: GameState } = $props();

  const terrain = $derived(state.location.terrain);
  const teamKind = $derived(state.oxen[0]?.kind ?? 'ox');
  const teamGlyph = $derived(teamKind === 'mule' ? '🐴' : '🐂');

  // Sky color shifts with month — late-fall / winter sky goes grey, summer
  // is bright blue, shoulder months are a muted sky.
  const skyGradient = $derived.by(() => {
    const m = state.date.month;
    if (terrain === 'desert') return 'linear-gradient(180deg, #e8b878 0%, #d99e5a 100%)';
    if (m >= 5 && m <= 9) return 'linear-gradient(180deg, #6da7d4 0%, #b3d4e8 100%)';
    if (m === 4 || m === 10) return 'linear-gradient(180deg, #8a9eb5 0%, #c3cfd9 100%)';
    return 'linear-gradient(180deg, #5a6878 0%, #8a9aa8 100%)'; // winter grey
  });

  // Horizon glyphs and ground gradient vary by terrain. Strings concat'd
  // so the silhouette reads as a "row of trees / peaks / cacti".
  const horizonGlyphs = $derived.by(() => {
    if (terrain === 'mountains') return '🏔️ 🏔️ 🏔️ 🏔️ 🏔️ 🏔️';
    if (terrain === 'forest')    return '🌲🌲🌲🌲🌲🌲🌲🌲🌲🌲🌲🌲';
    if (terrain === 'desert')    return '🌵     🌵         🌵      🌵';
    if (terrain === 'river')     return '〰️〰️〰️〰️〰️〰️〰️〰️〰️';
    return '🌾  🌾    🌾   🌾  🌾   🌾    🌾'; // prairie
  });

  const groundGradient = $derived.by(() => {
    if (terrain === 'mountains') return 'linear-gradient(180deg, #6e5a45 0%, #443628 100%)';
    if (terrain === 'forest')    return 'linear-gradient(180deg, #4a5d3a 0%, #2e3a23 100%)';
    if (terrain === 'desert')    return 'linear-gradient(180deg, #c9874a 0%, #8a5a2a 100%)';
    if (terrain === 'river')     return 'linear-gradient(180deg, #4a8bc9 0%, #2a5a8c 100%)';
    return 'linear-gradient(180deg, #b8a05a 0%, #8a7a3a 100%)'; // prairie tan
  });

  // Sun / moon glyph — month-driven. December sun rides low, July high;
  // approximated visually with vertical position.
  const skyAccent = $derived(state.date.month >= 11 || state.date.month <= 2 ? '🌥️' : '☀️');

  // --- Right-pane status readouts ---

  // Pretty terrain label + glyph for the readout column.
  const terrainLabel = $derived.by(() => {
    if (terrain === 'mountains') return { glyph: '🏔️', name: 'Mountains' };
    if (terrain === 'forest')    return { glyph: '🌲', name: 'Forest' };
    if (terrain === 'desert')    return { glyph: '🌵', name: 'Desert' };
    if (terrain === 'river')     return { glyph: '〰️', name: 'River' };
    return { glyph: '🌾', name: 'Prairie' };
  });

  // Stand-in weather flavor — derived from month + terrain until #153
  // (real weather pass) lands. Two-word descriptors keep the column tight.
  const weatherLabel = $derived.by(() => {
    const m = state.date.month;
    if (terrain === 'desert')   return { glyph: '☀️', text: 'Hot, arid' };
    if (terrain === 'river')    return { glyph: '💧', text: 'Damp air' };
    if (terrain === 'mountains') {
      if (m >= 11 || m <= 2)    return { glyph: '❄️', text: 'Frozen' };
      if (m >= 6 && m <= 8)     return { glyph: '🌤️', text: 'Cool, thin' };
      return { glyph: '🌥️', text: 'Crisp' };
    }
    if (terrain === 'forest') {
      if (m >= 11 || m <= 2)    return { glyph: '🌧️', text: 'Cold, wet' };
      return { glyph: '🌳', text: 'Damp, shaded' };
    }
    // prairie default
    if (m >= 11 || m <= 2) return { glyph: '❄️', text: 'Cold, frost' };
    if (m >= 6 && m <= 8)  return { glyph: '☀️', text: 'Hot, dry' };
    if (m === 3 || m === 4) return { glyph: '🌤️', text: 'Cool, breezy' };
    return { glyph: '🍂', text: 'Brisk, windy' };
  });

  // Season label — flavor only.
  const seasonLabel = $derived.by(() => {
    const m = state.date.month;
    if (m >= 3 && m <= 5)  return 'Spring';
    if (m >= 6 && m <= 8)  return 'Summer';
    if (m >= 9 && m <= 11) return 'Fall';
    return 'Winter';
  });

  // Lifetime miles traveled — quick reference. Per-day mileage tracking
  // would slot in here once the engine surfaces it.
  const milesTraveled = $derived(Math.round(state.location.milesTraveled));
</script>

<div class="status panel">
  <div class="status-head">DAY TRAVEL STATUS</div>
  <div class="status-body">
    <!-- Left pane: side-view scene. Sky / horizon / ground bands +
         the wagon rig. Decorative — aria-hidden so screen readers
         skip to the status readouts on the right. -->
    <div class="scene" aria-hidden="true">
      <div class="sky" style="background: {skyGradient};">
        <span class="sky-accent">{skyAccent}</span>
      </div>
      <div class="horizon">
        <span class="horizon-row">{horizonGlyphs}</span>
      </div>
      <div class="ground" style="background: {groundGradient};"></div>
      <div class="rig">
        <span class="team">{teamGlyph}</span>
        <div class="wagon">
          <div class="canvas-top"></div>
          <div class="body"></div>
          <div class="wheel wheel-left"></div>
          <div class="wheel wheel-right"></div>
        </div>
      </div>
    </div>

    <!-- Right pane: text readouts. Terrain / weather / season /
         miles. Real weather state arrives with #153. -->
    <dl class="readouts">
      <div class="readout">
        <dt>Terrain</dt>
        <dd><span class="r-glyph">{terrainLabel.glyph}</span> {terrainLabel.name}</dd>
      </div>
      <div class="readout">
        <dt>Weather</dt>
        <dd><span class="r-glyph">{weatherLabel.glyph}</span> {weatherLabel.text}</dd>
      </div>
      <div class="readout">
        <dt>Season</dt>
        <dd>{seasonLabel}</dd>
      </div>
      <div class="readout">
        <dt>Miles</dt>
        <dd>{milesTraveled} mi</dd>
      </div>
    </dl>
  </div>
</div>

<style>
  /* Outer panel — header + 2-column body. Same chrome as other panels. */
  .status {
    display: flex;
    flex-direction: column;
    padding: 0.4em 0.5em;
    border: 2px solid var(--c-wood);
    border-radius: 4px;
    background: var(--c-panel);
    gap: 0.35em;
  }
  .status-head {
    font-size: 0.7em;
    letter-spacing: 0.18em;
    color: var(--c-rust);
    font-weight: 700;
  }
  .status-body {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 0.5em;
    align-items: stretch;
    min-height: 140px;
  }

  /* Left pane: side-view scene. */
  .scene {
    position: relative;
    overflow: hidden;
    border-radius: 3px;
    border: 1px solid rgba(0, 0, 0, 0.35);
  }

  .sky, .horizon, .ground {
    position: absolute;
    left: 0;
    right: 0;
  }
  .sky {
    top: 0;
    height: 50%;
  }
  .horizon {
    top: 32%;
    height: 30%;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    overflow: hidden;
    font-size: 1.2em;
    line-height: 1;
    letter-spacing: 0.1em;
    pointer-events: none;
  }
  .horizon-row {
    white-space: nowrap;
    /* Gentle parallax — silhouettes drift slowly in the background. */
    animation: drift 60s linear infinite;
  }
  .ground {
    bottom: 0;
    height: 35%;
  }
  .ground::after {
    /* Subtle texture line where the ground meets the horizon. */
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: rgba(0, 0, 0, 0.25);
  }

  .sky-accent {
    position: absolute;
    top: 0.3em;
    right: 1em;
    font-size: 1.6em;
    line-height: 1;
  }

  /* The rig — ox + wagon. Sits on the ground band, bobs gently. */
  .rig {
    position: absolute;
    bottom: 0.4em;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: flex-end;
    gap: 0.2em;
    animation: bob 2.4s ease-in-out infinite;
  }
  .team {
    font-size: 2.2em;
    line-height: 1;
    transform: translateY(-2px);
  }

  /* Custom CSS wagon — canvas + body + two wheels. */
  .wagon {
    position: relative;
    width: 64px;
    height: 56px;
  }
  .canvas-top {
    position: absolute;
    top: 0;
    left: 4px;
    right: 4px;
    height: 30px;
    background: linear-gradient(180deg, #f5e8c8 0%, #d8c69a 100%);
    border: 2px solid #6a4a2a;
    border-radius: 28px 28px 0 0;
  }
  .body {
    position: absolute;
    top: 26px;
    left: 0;
    right: 0;
    height: 14px;
    background: linear-gradient(180deg, #8a5a2a 0%, #5a3a1a 100%);
    border: 2px solid #3a2410;
    border-radius: 2px;
  }
  .wheel {
    position: absolute;
    bottom: 0;
    width: 18px;
    height: 18px;
    background: radial-gradient(circle, #4a3018 30%, #2a1a08 100%);
    border: 2px solid #1a0e04;
    border-radius: 50%;
    box-shadow: inset 0 0 0 2px #6a4830;
  }
  .wheel-left  { left: 4px; }
  .wheel-right { right: 4px; }

  @keyframes bob {
    0%, 100% { transform: translateX(-50%) translateY(0); }
    50%      { transform: translateX(-50%) translateY(-2px); }
  }
  @keyframes drift {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-15%); }
  }

  @media (prefers-reduced-motion: reduce) {
    .rig, .horizon-row { animation: none; }
  }

  /* Right pane: status readouts. */
  .readouts {
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 0.3em;
  }
  .readout {
    display: flex;
    align-items: baseline;
    gap: 0.5em;
    padding: 0.3em 0.5em;
    background: var(--c-bg-raised);
    border-radius: 3px;
    border: 1px solid rgba(138, 90, 42, 0.25);
  }
  .readout dt {
    font-size: 0.65em;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--c-wood);
    font-weight: 700;
    margin: 0;
    min-width: 4.5em;
  }
  .readout dd {
    margin: 0;
    color: var(--c-tan-bright);
    font-size: 0.92em;
    font-weight: 700;
    flex: 1;
  }
  .r-glyph {
    margin-right: 0.25em;
  }
</style>
