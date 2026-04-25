<script lang="ts">
  // Day Travel Status — a single landscape-painting view that combines
  // the terrain side view, the wagon rig, weather visuals, and the
  // status readouts as overlay captions. Replaces the previous
  // 2-column split. Eventually this slot hosts real frame-by-frame
  // travel; today it's a static painted scene that reflects current
  // game state (terrain + season + derived weather).

  import type { GameState } from '$lib/game/types';

  let { state }: { state: GameState } = $props();

  const terrain = $derived(state.location.terrain);
  const teamKind = $derived(state.oxen[0]?.kind ?? 'ox');
  const teamGlyph = $derived(teamKind === 'mule' ? '🐴' : '🐂');
  const month = $derived(state.date.month);

  // --- Weather classification (drives both the readout chip + the
  //     particle/cloud overlay). Stand-in until #153 ships real state. ---
  type WeatherKind = 'sunny' | 'partly' | 'cloudy' | 'rainy' | 'snowy';

  const weather = $derived.by<{ kind: WeatherKind; glyph: string; label: string }>(() => {
    const m = month;
    if (terrain === 'desert')   return { kind: 'sunny',  glyph: '☀️', label: 'Hot, arid' };
    if (terrain === 'river')    return { kind: 'cloudy', glyph: '💧', label: 'Damp air' };
    if (terrain === 'mountains') {
      if (m >= 11 || m <= 2)    return { kind: 'snowy',  glyph: '❄️', label: 'Frozen' };
      if (m >= 6 && m <= 8)     return { kind: 'cloudy', glyph: '🌤️', label: 'Cool, thin' };
      return { kind: 'cloudy', glyph: '🌥️', label: 'Crisp' };
    }
    if (terrain === 'forest') {
      if (m >= 11 || m <= 2)    return { kind: 'rainy', glyph: '🌧️', label: 'Cold, wet' };
      return { kind: 'partly', glyph: '🌳', label: 'Damp, shaded' };
    }
    // prairie default
    if (m >= 11 || m <= 2) return { kind: 'snowy',  glyph: '❄️', label: 'Cold, frost' };
    if (m >= 6 && m <= 8)  return { kind: 'sunny',  glyph: '☀️', label: 'Hot, dry' };
    if (m === 3 || m === 4) return { kind: 'partly', glyph: '🌤️', label: 'Cool, breezy' };
    return { kind: 'partly', glyph: '🍂', label: 'Brisk, windy' };
  });

  // --- Sky / horizon / ground per terrain ---

  const skyGradient = $derived.by(() => {
    const m = month;
    if (terrain === 'desert') return 'linear-gradient(180deg, #e8b878 0%, #d99e5a 60%, #b88450 100%)';
    if (weather.kind === 'rainy')   return 'linear-gradient(180deg, #4a5868 0%, #6a7888 60%, #8a98a8 100%)';
    if (weather.kind === 'snowy')   return 'linear-gradient(180deg, #6a7888 0%, #98a8b8 60%, #c8d4e0 100%)';
    if (m >= 5 && m <= 9) return 'linear-gradient(180deg, #6da7d4 0%, #b3d4e8 60%, #d8e4ee 100%)';
    if (m === 4 || m === 10) return 'linear-gradient(180deg, #8a9eb5 0%, #b3c4d4 60%, #d4dce4 100%)';
    return 'linear-gradient(180deg, #5a6878 0%, #8a9aa8 60%, #b8c0c8 100%)';
  });

  const horizonGlyphs = $derived.by(() => {
    if (terrain === 'mountains') return '🏔️ 🏔️ 🏔️ 🏔️ 🏔️ 🏔️ 🏔️';
    if (terrain === 'forest')    return '🌲🌲🌲🌲🌲🌲🌲🌲🌲🌲🌲🌲🌲';
    if (terrain === 'desert')    return '🌵       🌵            🌵        🌵';
    if (terrain === 'river')     return '〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️';
    return '🌾   🌾    🌾   🌾  🌾   🌾   🌾   🌾  🌾'; // prairie
  });

  const groundGradient = $derived.by(() => {
    if (terrain === 'mountains') return 'linear-gradient(180deg, #6e5a45 0%, #443628 100%)';
    if (terrain === 'forest')    return 'linear-gradient(180deg, #4a5d3a 0%, #2e3a23 100%)';
    if (terrain === 'desert')    return 'linear-gradient(180deg, #c9874a 0%, #8a5a2a 100%)';
    if (terrain === 'river')     return 'linear-gradient(180deg, #4a8bc9 0%, #2a5a8c 100%)';
    return 'linear-gradient(180deg, #b8a05a 0%, #8a7a3a 100%)';
  });

  // Sun / moon positioning — rises higher in summer, sits lower in
  // winter. Approximated by vertical offset.
  const skyAccent = $derived.by(() => {
    if (weather.kind === 'rainy' || weather.kind === 'snowy') return null; // hidden behind clouds
    if (month >= 11 || month <= 2) return { glyph: '☀️', top: '30%', right: '8%' };
    if (month >= 6 && month <= 8)  return { glyph: '☀️', top: '8%',  right: '12%' };
    return { glyph: '☀️', top: '18%', right: '10%' };
  });

  // Cloud cover — count varies by weather kind.
  const cloudCount = $derived.by(() => {
    if (weather.kind === 'sunny')  return 0;
    if (weather.kind === 'partly') return 2;
    if (weather.kind === 'cloudy') return 4;
    return 5; // rainy / snowy — heavy cover
  });

  // --- Caption readouts ---

  const terrainLabel = $derived.by(() => {
    if (terrain === 'mountains') return { glyph: '🏔️', name: 'Mountains' };
    if (terrain === 'forest')    return { glyph: '🌲', name: 'Forest' };
    if (terrain === 'desert')    return { glyph: '🌵', name: 'Desert' };
    if (terrain === 'river')     return { glyph: '〰️', name: 'River' };
    return { glyph: '🌾', name: 'Prairie' };
  });

  const seasonLabel = $derived.by(() => {
    if (month >= 3 && month <= 5)  return 'Spring';
    if (month >= 6 && month <= 8)  return 'Summer';
    if (month >= 9 && month <= 11) return 'Fall';
    return 'Winter';
  });

  const milesTraveled = $derived(Math.round(state.location.milesTraveled));
</script>

<div class="status panel">
  <div class="status-head">DAY TRAVEL STATUS</div>

  <div class="landscape" style="background: {skyGradient};">
    <!-- Sun / moon, hidden in heavy weather -->
    {#if skyAccent}
      <span class="sky-accent" style="top: {skyAccent.top}; right: {skyAccent.right};">
        {skyAccent.glyph}
      </span>
    {/if}

    <!-- Drifting clouds — opacity scales with cloud count -->
    {#if cloudCount > 0}
      <div class="clouds">
        {#each Array(cloudCount) as _, i (i)}
          <span
            class="cloud"
            style="left: {(i * 23 + 5) % 100}%; top: {(i * 17 + 8) % 30}%; animation-delay: {-i * 4}s; opacity: {weather.kind === 'partly' ? 0.7 : 0.9};"
          >☁️</span>
        {/each}
      </div>
    {/if}

    <!-- Rain particles -->
    {#if weather.kind === 'rainy'}
      <div class="rain">
        {#each Array(40) as _, i (i)}
          <span class="raindrop" style="left: {(i * 7) % 100}%; animation-delay: {-(i * 0.07) % 1}s;"></span>
        {/each}
      </div>
    {/if}

    <!-- Snow particles -->
    {#if weather.kind === 'snowy'}
      <div class="snow">
        {#each Array(30) as _, i (i)}
          <span class="snowflake" style="left: {(i * 11) % 100}%; animation-delay: {-(i * 0.2) % 4}s;">❄</span>
        {/each}
      </div>
    {/if}

    <!-- Distant horizon silhouettes -->
    <div class="horizon">
      <span class="horizon-row">{horizonGlyphs}</span>
    </div>

    <!-- Foreground ground -->
    <div class="ground" style="background: {groundGradient};"></div>

    <!-- Wagon rig — stays centered, gentle bob -->
    <div class="rig">
      <span class="team">{teamGlyph}</span>
      <div class="wagon">
        <div class="canvas-top"></div>
        <div class="body"></div>
        <div class="wheel wheel-left"></div>
        <div class="wheel wheel-right"></div>
      </div>
    </div>

    <!-- Caption readouts: corner overlays -->
    <div class="cap cap-tl">
      <span class="cap-glyph">{terrainLabel.glyph}</span>
      {terrainLabel.name} · {seasonLabel}
    </div>
    <div class="cap cap-tr">
      <span class="cap-glyph">{weather.glyph}</span>
      {weather.label} · {milesTraveled} mi
    </div>
  </div>
</div>

<style>
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

  /* The landscape painting — single full-width scene. */
  .landscape {
    position: relative;
    height: 180px;
    overflow: hidden;
    border-radius: 3px;
    border: 1px solid rgba(0, 0, 0, 0.35);
  }

  .sky-accent {
    position: absolute;
    font-size: 1.7em;
    line-height: 1;
    filter: drop-shadow(0 0 6px rgba(255, 220, 120, 0.5));
  }

  /* Cloud layer — drifts very slowly across the sky. */
  .clouds {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .cloud {
    position: absolute;
    font-size: 1.4em;
    line-height: 1;
    animation: drift-cloud 80s linear infinite;
  }
  @keyframes drift-cloud {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-120px); }
  }

  /* Rain — vertical streaks falling. */
  .rain {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }
  .raindrop {
    position: absolute;
    top: -10px;
    width: 1px;
    height: 14px;
    background: rgba(180, 200, 220, 0.7);
    animation: rain-fall 0.9s linear infinite;
  }
  @keyframes rain-fall {
    0%   { transform: translateY(0); }
    100% { transform: translateY(190px); }
  }

  /* Snow — drifting flakes. */
  .snow {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }
  .snowflake {
    position: absolute;
    top: -10px;
    color: rgba(255, 255, 255, 0.85);
    font-size: 0.7em;
    animation: snow-fall 5s linear infinite;
  }
  @keyframes snow-fall {
    0%   { transform: translateY(0)    translateX(0); }
    100% { transform: translateY(200px) translateX(15px); }
  }

  /* Distant horizon row of silhouettes. */
  .horizon {
    position: absolute;
    left: 0; right: 0;
    top: 38%;
    height: 32%;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    overflow: hidden;
    font-size: 1.2em;
    line-height: 1;
    letter-spacing: 0.1em;
    pointer-events: none;
    /* Slight haze blends silhouettes with the sky behind. */
    filter: brightness(0.92);
  }
  .horizon-row {
    white-space: nowrap;
    animation: drift-horizon 60s linear infinite;
  }
  @keyframes drift-horizon {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-15%); }
  }

  /* Ground band — fades into the horizon via a soft gradient on top. */
  .ground {
    position: absolute;
    left: 0; right: 0;
    bottom: 0;
    height: 32%;
  }
  .ground::before {
    content: '';
    position: absolute;
    top: -8px; left: 0; right: 0;
    height: 8px;
    background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.18) 100%);
  }

  /* Wagon rig — centered, gentle bob. */
  .rig {
    position: absolute;
    bottom: 0.6em;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: flex-end;
    gap: 0.2em;
    animation: bob 2.4s ease-in-out infinite;
    z-index: 2;
  }
  .team {
    font-size: 2.4em;
    line-height: 1;
    transform: translateY(-2px);
  }

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

  /* Caption readouts — corner overlays. Translucent dark chips so they
     read against any sky color without dominating the painting. */
  .cap {
    position: absolute;
    top: 0.4em;
    padding: 0.25em 0.55em;
    background: rgba(20, 14, 8, 0.65);
    color: var(--c-tan-bright);
    border: 1px solid rgba(201, 106, 42, 0.4);
    border-radius: 3px;
    font-size: 0.78em;
    font-weight: 700;
    letter-spacing: 0.02em;
    backdrop-filter: blur(2px);
    z-index: 3;
  }
  .cap-tl { left: 0.4em; }
  .cap-tr { right: 0.4em; }
  .cap-glyph { margin-right: 0.25em; }

  @media (prefers-reduced-motion: reduce) {
    .rig, .horizon-row, .cloud, .raindrop, .snowflake { animation: none; }
  }
</style>
