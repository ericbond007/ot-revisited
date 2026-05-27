<script lang="ts">
  // Visual-diff harness for the landmark-art port (#89).
  //
  // Renders every registered landmark id as a card so we can compare
  // side-by-side against the bundled Trail Atlas.html. Cards for
  // un-ported ids render the placeholder chrome (LandmarkArt itself
  // no-ops; we still draw a labeled tile so the gap is visible).
  //
  // The "abandoned" toggle exercises the desaturation wrapper —
  // Whitman Mission is the canonical case (post-1847 ruin).

  import LandmarkArt, { hasLandmarkArt } from '$lib/ui/landmark-art/LandmarkArt.svelte';
  import type { LandmarkId } from '$lib/ui/landmark-art/landmark-art-tokens';

  // Trail order — mirrors the sequence in `LANDMARKS`.
  const ALL_IDS: LandmarkId[] = [
    'independence_mo',
    'kansas_river',
    'alcove_spring',
    'big_blue_river',
    'hollenberg_ranch',
    'ft_kearny',
    'ash_hollow',
    'rachel_pattison_grave',
    'north_platte_1',
    'courthouse_rock',
    'chimney_rock',
    'scotts_bluff',
    'robidoux_post',
    'ft_laramie',
    'register_cliff',
    'guernsey_ruts',
    'north_platte_2',
    'willow_springs',
    'independence_rock',
    'devils_gate',
    'sweetwater_1',
    'ice_slough',
    'south_pass',
    'pacific_springs',
    'parting_of_ways',
    'green_river',
    'ft_bridger',
    'bear_river',
    'soda_springs',
    'ft_hall',
    'snake_three_island',
    'ft_boise',
    'farewell_bend',
    'blue_mountains',
    'grande_ronde',
    'ft_walla_walla',
    'whitman_mission',
    'the_dalles',
    'barlow_road',
    'oregon_city'
  ];

  let abandoned = $state(false);
</script>

<svelte:head>
  <title>Landmark Art Showcase — dev</title>
</svelte:head>

<div class="page">
  <header>
    <h1>Landmark Art Showcase</h1>
    <p class="subtitle">
      Visual-diff target for the landmark-art port. Compare against
      <code>docs/handoff/landmark-art/Trail Atlas.html</code>.
    </p>
    <label class="toggle">
      <input type="checkbox" bind:checked={abandoned} />
      <span>abandoned (e.g. Whitman post-1847)</span>
    </label>
  </header>

  <section class="grid">
    {#each ALL_IDS as id (id)}
      <div class="card" class:missing={!hasLandmarkArt(id)}>
        <div class="eyebrow">
          {id}{#if !hasLandmarkArt(id)} <span class="todo">— not yet ported</span>{/if}
        </div>
        <div class="stage">
          {#if hasLandmarkArt(id)}
            <LandmarkArt {id} {abandoned} />
          {:else}
            <div class="placeholder">art pending</div>
          {/if}
        </div>
      </div>
    {/each}
  </section>
</div>

<style>
  .page {
    max-width: 1400px;
    margin: 0 auto;
    padding: 24px;
    background: #2a1a10;
    min-height: 100vh;
  }
  header {
    margin-bottom: 24px;
    color: #e8c89a;
    font-family: 'Special Elite', monospace;
  }
  h1 {
    color: #c96a2a;
    font-family: var(--f-display, Georgia, serif);
    margin: 0 0 8px 0;
  }
  .subtitle {
    margin: 0 0 12px 0;
    font-size: 14px;
  }
  code {
    background: rgba(0, 0, 0, 0.3);
    padding: 2px 6px;
    border-radius: 2px;
    font-size: 12px;
  }
  .toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 14px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }

  .card {
    background: #3a2410;
    border: 1px solid #5a3818;
    border-radius: 3px;
    padding: 10px;
  }
  .card.missing { opacity: 0.55; }
  .eyebrow {
    color: #c8a878;
    font-family: 'Special Elite', monospace;
    font-size: 11px;
    letter-spacing: 0.08em;
    margin-bottom: 6px;
  }
  .todo {
    color: #c96a2a;
    font-style: italic;
  }
  .stage {
    aspect-ratio: 16 / 7;
    background: #1a0e04;
    border-radius: 2px;
    overflow: hidden;
    position: relative;
  }
  .placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6a4a1a;
    font-family: 'Special Elite', monospace;
    font-size: 12px;
    font-style: italic;
    border: 2px dashed #5a3818;
    margin: 8px;
    border-radius: 2px;
  }
</style>
