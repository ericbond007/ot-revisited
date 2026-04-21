<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { LANDMARKS } from '$lib/game/content/landmarks';
  let { state: gameState }: { state: GameState } = $props();

  // Total trail miles (sum of milesFromPrevious).
  const totalMiles = LANDMARKS.reduce((s, l) => s + l.milesFromPrevious, 0);

  // For each landmark compute its cumulative mileage and percentage along the trail.
  const markers = (() => {
    let cum = 0;
    return LANDMARKS.map((l) => {
      cum += l.milesFromPrevious;
      return {
        ...l,
        mile: cum,
        pct: (cum / totalMiles) * 100
      };
    });
  })();

  const wagonPct = $derived(Math.min(100, (gameState.location.milesTraveled / totalMiles) * 100));
  const previousId = $derived(gameState.location.previousLandmarkId);

  let fullscreen = $state(false);
</script>

<div class="map panel"
  style="
    background: var(--c-parchment);
    color: var(--c-ink);
    position: {fullscreen ? 'fixed' : 'relative'};
    {fullscreen ? 'inset: 0; z-index: 50;' : ''}
    min-height: 320px;
    padding: 1em 1em 4em 1em;
  "
>
  <button type="button" onclick={() => (fullscreen = !fullscreen)}
    style="position: absolute; top: 0.5em; right: 0.5em; padding: 0.3em 0.6em; font-size: 0.8em; background: var(--c-ink); color: var(--c-parchment);">
    {fullscreen ? '✕ Close' : '⛶ Expand'}
  </button>

  <h4 style="color: var(--c-ink); margin: 0 0 0.5em 0; letter-spacing: 0.15em;">THE TRAIL — {Math.round(gameState.location.milesTraveled)} / {totalMiles} mi</h4>

  <!-- Dashed trail. Independence on the RIGHT (east), Oregon City on the LEFT (west) — geographically correct + classic OT. -->
  <div style="position: relative; height: 200px; margin-top: 1em;">
    <div style="position: absolute; top: 50%; left: 4%; right: 4%; height: 2px; background: repeating-linear-gradient(to right, var(--c-rust) 0 6px, transparent 6px 12px);"></div>

    <!-- Compass labels on the edges -->
    <div style="position: absolute; top: 0; right: 0; font-size: 0.7em; font-weight: 700; letter-spacing: 0.1em; color: var(--c-ink);">← EAST</div>
    <div style="position: absolute; top: 0; left: 0; font-size: 0.7em; font-weight: 700; letter-spacing: 0.1em; color: var(--c-ink);">WEST →</div>

    {#each markers as m}
      {@const reached = previousId && markers.findIndex((x) => x.id === previousId) >= markers.indexOf(m)}
      <div
        style="
          position: absolute;
          right: calc({Math.max(4, Math.min(96, m.pct))}% - 6px);
          top: 50%;
          transform: translateY(-50%);
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: {m.kind === 'river' ? '#6a8aa8' : (reached ? 'var(--c-ink)' : 'var(--c-wood)')};
          border: 2px solid var(--c-ink);
        "
        title="{m.name} ({m.mile} mi)"
      ></div>
    {/each}

    <!-- Wagon — starts at right (Independence), moves leftward (west) -->
    <div style="
      position: absolute;
      right: calc({Math.max(2, Math.min(98, wagonPct))}% - 12px);
      top: 38%;
      transform: translateY(-50%);
      font-size: 1.5em;
    ">🐂🛖</div>
  </div>

  <!-- Next landmark flavor -->
  <div style="font-size: 0.85em; font-style: italic; position: absolute; bottom: 1em; left: 1em; right: 1em; text-align: center;">
    Heading for {markers.find((m) => m.id === gameState.location.nextLandmarkId)?.name ?? '—'}
  </div>
</div>
