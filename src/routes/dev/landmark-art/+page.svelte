<script lang="ts">
  // Visual-diff harness for the landmark-art port (#89).
  //
  // Renders every registered landmark id as a card so we can compare
  // side-by-side against the bundled Trail Atlas.html. Cards for
  // un-ported ids render the placeholder chrome (LandmarkArt itself
  // no-ops; we still draw a labeled tile so the gap is visible).
  //
  // Toggles:
  //   - abandoned: exercises the desaturation wrapper (Whitman post-1847).
  //   - showOverlay: hides every SVG element except the FLUX <image>
  //     backdrop, so the painterly raster can be evaluated standalone
  //     during a backdrop-iteration pass (#1078 follow-up).
  //
  // Click a card → fullscreen dialog with the same composition (both
  // toggles still apply). Esc / click backdrop to close.

  import LandmarkArt, { hasLandmarkArt } from '$lib/ui/landmark-art/LandmarkArt.svelte';
  import type { LandmarkId } from '$lib/ui/landmark-art/landmark-art-tokens';

  // Trail order — mirrors the sequence in `LANDMARKS`.
  const ALL_IDS: LandmarkId[] = [
    'independence_mo',
    'lone_elm_campground',
    'kansas_river',
    'vieux_crossing',
    'alcove_spring',
    'big_blue_river',
    'hollenberg_ranch',
    'rock_creek_station',
    'ft_kearny',
    'windlass_hill',
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
    'ft_caspar',
    'martins_cove',
    'north_platte_2',
    'willow_springs',
    'independence_rock',
    'devils_gate',
    'sweetwater_1',
    'cheyenne_camp',
    'ice_slough',
    'south_pass',
    'pacific_springs',
    'parting_of_ways',
    'green_river',
    'big_hill',
    'ft_bridger',
    'shoshone_camp',
    'bear_river',
    'soda_springs',
    'massacre_rocks',
    'ft_hall',
    'salmon_falls',
    'snake_three_island',
    'ft_boise',
    'burnt_river_canyon',
    'flagstaff_hill',
    'farewell_bend',
    'blue_mountains',
    'grande_ronde',
    'ft_walla_walla',
    'whitman_mission',
    'the_dalles',
    'barlow_road',
    'laurel_hill',
    'oregon_city'
  ];

  let abandoned = $state(false);
  let showOverlay = $state(true);
  let lightboxId: LandmarkId | null = $state(null);

  function open(id: LandmarkId) {
    if (!hasLandmarkArt(id)) return;
    lightboxId = id;
  }
  function close() {
    lightboxId = null;
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }
</script>

<svelte:head>
  <title>Landmark Art Showcase — dev</title>
</svelte:head>

<svelte:window on:keydown={onKey} />

<div class="page" class:overlay-hidden={!showOverlay}>
  <header>
    <h1>Landmark Art Showcase</h1>
    <p class="subtitle">
      Visual-diff target for the landmark-art port. Compare against
      <code>docs/handoff/landmark-art/Trail Atlas.html</code>.
    </p>
    <div class="toggles">
      <label class="toggle">
        <input type="checkbox" bind:checked={abandoned} />
        <span>abandoned (e.g. Whitman post-1847)</span>
      </label>
      <label class="toggle">
        <input type="checkbox" bind:checked={showOverlay} />
        <span>show SVG overlay <em>(uncheck to see just the FLUX backdrop)</em></span>
      </label>
      <span class="hint">click a card to enlarge</span>
    </div>
  </header>

  <section class="grid">
    {#each ALL_IDS as id (id)}
      <button type="button" class="card" class:missing={!hasLandmarkArt(id)} onclick={() => open(id)}>
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
      </button>
    {/each}
  </section>
</div>

{#if lightboxId}
  <!-- Backdrop click closes; inner panel stops propagation so clicks on
       the art itself don't dismiss. Esc also closes (window keydown). -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="lightbox" role="dialog" aria-modal="true" aria-label="Landmark art enlarged" tabindex="-1" onclick={close} class:overlay-hidden={!showOverlay}>
    <button type="button" class="close" onclick={close} aria-label="Close">×</button>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="lightbox-stage" role="presentation" onclick={(e) => e.stopPropagation()}>
      <div class="eyebrow lightbox-label">{lightboxId}</div>
      <div class="stage lightbox-art">
        <LandmarkArt id={lightboxId} {abandoned} />
      </div>
    </div>
  </div>
{/if}

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
    font-family: var(--of-display, Georgia, serif);
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
  .toggles {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 16px;
  }
  .toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 14px;
  }
  .toggle em {
    color: #a08868;
    font-style: italic;
    font-size: 12px;
  }
  .hint {
    color: #a08868;
    font-size: 12px;
    font-style: italic;
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
    cursor: pointer;
    text-align: left;
    color: inherit;
    font: inherit;
    transition: border-color 0.15s, transform 0.15s;
  }
  .card:hover:not(.missing) {
    border-color: #c96a2a;
    transform: translateY(-2px);
  }
  .card.missing { opacity: 0.55; cursor: default; }
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

  /* SVG overlay toggle — per-landmark art components emit
     <image href="…webp"> first (FLUX backdrop) then a stack of
     <path>/<g>/<text>/etc. (decorative overlay). Hiding every non-
     <image> element inside the mounted SVG shows just the painterly
     raster. Applies to both grid cards AND the lightbox. */
  :global(.overlay-hidden) :global(.stage svg g > *:not(image)) {
    display: none;
  }

  /* Lightbox */
  .lightbox {
    position: fixed;
    inset: 0;
    background: rgba(10, 5, 2, 0.92);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4vh 4vw;
  }
  .close {
    position: absolute;
    top: 12px;
    right: 18px;
    background: none;
    border: none;
    color: #e8c89a;
    font-size: 36px;
    line-height: 1;
    cursor: pointer;
    padding: 8px 12px;
  }
  .close:hover { color: #c96a2a; }
  .lightbox-stage {
    width: min(100%, 1800px);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .lightbox-label {
    color: #e8c89a;
    font-size: 14px;
  }
  .lightbox-art {
    aspect-ratio: 16 / 7;
    max-height: 88vh;
  }
</style>
