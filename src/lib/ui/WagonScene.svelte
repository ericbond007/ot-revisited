<script lang="ts">
  // Side-view of the wagon traveling along the current terrain. Renders
  // under the trail map. Three horizontal bands — sky / horizon / ground
  // — restyled per terrain. Custom CSS wagon (canvas top + body + two
  // wheels) is pulled by an ox or mule glyph based on the team kind.
  //
  // For now, the wagon idles in place with a gentle bobbing animation.
  // Eventually this slot will host real frame-by-frame travel.

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
</script>

<div class="wagon-scene panel" aria-hidden="true">
  <div class="sky" style="background: {skyGradient};">
    <span class="sky-accent">{skyAccent}</span>
  </div>
  <div class="horizon">
    <span class="horizon-row">{horizonGlyphs}</span>
  </div>
  <div class="ground" style="background: {groundGradient};"></div>

  <!-- The rig: ox/mule pulling a custom CSS wagon. Bobbing animation
       gives the impression of travel without committing to scrolling. -->
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

<style>
  .wagon-scene {
    position: relative;
    height: 140px;
    overflow: hidden;
    padding: 0;
    border: 2px solid var(--c-wood);
    border-radius: 4px;
    background: var(--c-panel);
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
</style>
