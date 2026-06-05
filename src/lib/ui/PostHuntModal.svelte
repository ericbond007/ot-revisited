<script lang="ts">
  // Shown when flags._huntHaul is set — displays the breakdown of what
  // the hunt yielded and lets the player acknowledge before returning to
  // the main play view. The disposition choice (Keep fresh vs. Cure to
  // jerky) is a future extension tied to the camp curing action (#124);
  // for now this modal is a read + acknowledge step.
  import type { HuntHaul } from '$lib/game/actions/hunt';
  import { ICON } from '$lib/data/icon-dictionary';
  import { dialogA11y } from '$lib/ui/actions/dialog-a11y';

  // No backdrop-close on this modal — the server-side flag (_huntHaul)
  // persists until the Continue button's form submission clears it, so
  // a backdrop dismiss would just re-open on the next render. The
  // Continue form POSTs to ?/ackHunt.
  let { haul, slot, currentDay }: {
    haul: HuntHaul;
    slot: string;
    currentDay: number;
  } = $props();

  const qp = $derived(encodeURIComponent(slot));
  const daysUntilSpoil = $derived(
    haul.spoilDay !== null ? Math.max(0, haul.spoilDay - currentDay) : 0
  );

  // Target-specific flavor. Drives the header glyph + animal name so the
  // modal reads right for each kill type.
  const TARGET_FLAVOR: Record<HuntHaul['target'], { glyph: string; label: string }> = {
    small:  { glyph: ICON.fauna.small,  label: 'Small game' },
    medium: { glyph: ICON.fauna.medium, label: 'Medium game' },
    big:    { glyph: ICON.fauna.big,    label: 'Big game' },
    gather: { glyph: ICON.fauna.forage, label: 'Foraging' }
  };
  const flavor = $derived(TARGET_FLAVOR[haul.target]);

  const successful = $derived(haul.meat > 0 || haul.berries > 0);
</script>

<div class="modal-backdrop">
  <div class="panel modal-body" role="dialog" use:dialogA11y={{}}>
    <div class="head">
      <span class="head-glyph">{flavor.glyph}</span>
      <div class="head-titles">
        <span class="head-tag">{flavor.label.toUpperCase()}</span>
        <h2 class="modal-title">{successful ? 'The Haul' : 'Empty-handed'}</h2>
      </div>
    </div>

    {#if successful}
      <div class="haul-list">
        {#if haul.meat > 0}
          <div class="haul-row meat">
            <span class="row-glyph">🥩</span>
            <div class="row-body">
              <span class="row-name">Fresh game meat</span>
              <span class="row-detail">
                {haul.meat} lb —
                <span class="spoil-warn">spoils in {daysUntilSpoil} day{daysUntilSpoil === 1 ? '' : 's'}</span>
              </span>
            </div>
          </div>
        {/if}

        {#if haul.liver}
          <div class="haul-row liver">
            <span class="row-glyph">🫀</span>
            <div class="row-body">
              <span class="row-name">Liver, shared fresh</span>
              <span class="row-detail">
                Iron-rich, eaten raw or seared that night — <span class="good">+3 morale, +2 health</span>
              </span>
            </div>
          </div>
        {/if}

        {#if haul.berries > 0}
          <div class="haul-row berries">
            <span class="row-glyph">🫐</span>
            <div class="row-body">
              <span class="row-name">Wild berries</span>
              <span class="row-detail">{haul.berries} lb — currants, chokecherries, wild plums</span>
            </div>
          </div>
        {/if}

        {#if haul.prizeCut && haul.prizeCut > 0}
          <div class="haul-row prize">
            <span class="row-glyph">🍖</span>
            <div class="row-body">
              <span class="row-name">Prize cuts</span>
              <span class="row-detail">{haul.prizeCut} lb of tongue and hump — the choicest cut, a feast tonight</span>
            </div>
          </div>
        {/if}

        {#if haul.tallow && haul.tallow > 0}
          <div class="haul-row tallow">
            <span class="row-glyph">🟡</span>
            <div class="row-body">
              <span class="row-name">Tallow</span>
              <span class="row-detail">{haul.tallow} lb of rendered fat — cooking grease, candles, soap</span>
            </div>
          </div>
        {/if}

        {#if haul.rawHides && haul.rawHides > 0}
          <div class="haul-row hides">
            <span class="row-glyph">🟫</span>
            <div class="row-body">
              <span class="row-name">Raw hides</span>
              <span class="row-detail">{haul.rawHides} dried flat — trade with natives or posts (no time on the trail to tan)</span>
            </div>
          </div>
        {/if}

        {#if haul.bullets > 0}
          <div class="haul-row spent">
            <span class="row-glyph">🎯</span>
            <div class="row-body">
              <span class="row-name">Shots fired</span>
              <span class="row-detail">{haul.bullets}</span>
            </div>
          </div>
        {/if}

        {#if haul.injured}
          <div class="haul-row injury">
            <span class="row-glyph">{haul.mauled ? '🐻' : '🩹'}</span>
            <div class="row-body">
              <span class="row-name"><strong>{haul.injured}</strong> {haul.mauled ? 'was mauled by a grizzly' : 'was injured'}</span>
              <span class="row-detail">{haul.mauled ? 'Severe wounds. Bleeding bad. Bandages and laudanum, fast.' : 'Broken leg from the chase. Will need rest.'}</span>
            </div>
          </div>
        {/if}

        {#if haul.mode === 'company' && (haul.companyShareLb ?? 0) > 0}
          <div class="haul-row company">
            <span class="row-glyph">🤝</span>
            <div class="row-body">
              <span class="row-name">Divided across the train</span>
              <span class="row-detail">
                <strong>{haul.companyShareLb} lb</strong> went to the other wagons by household — the
                company keeps the equity rule. <span class="good">+2 train morale.</span>
              </span>
            </div>
          </div>
        {/if}
      </div>

      {#if haul.meat > 0}
        <p class="advice">
          The meat will spoil in <strong>{daysUntilSpoil} day{daysUntilSpoil === 1 ? '' : 's'}</strong>.
          The party eats it first at every meal. To preserve it, make camp and
          pick <strong>Cure meat into jerky</strong> — <strong>salt</strong> halves the cure time and raises the yield.
        </p>
      {/if}
    {:else}
      <p class="empty">
        {#if haul.target === 'gather'}
          The foragers turned up nothing worth bringing back.
        {:else}
          No game in the glass. The hunters returned hungry — {haul.bullets} shot{haul.bullets === 1 ? '' : 's'} wasted, that much powder and lead gone.
        {/if}
      </p>

      {#if haul.injured}
        <div class="haul-row injury standalone">
          <span class="row-glyph">{haul.mauled ? '🐻' : '🩹'}</span>
          <div class="row-body">
            <span class="row-name"><strong>{haul.injured}</strong> {haul.mauled ? 'was mauled by a grizzly' : 'was injured'}</span>
            <span class="row-detail">{haul.mauled ? 'Severe wounds. Bleeding bad. Bandages and laudanum, fast.' : 'Broken leg from the chase. Will need rest.'}</span>
          </div>
        </div>
      {/if}
    {/if}

    <form method="POST" action="?/ackHunt&slot={qp}" class="actions">
      <button type="submit" class="continue">Continue</button>
    </form>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(42, 29, 12, 0.80);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1em;
    animation: backdrop-fade 0.2s ease-out;
  }
  @keyframes backdrop-fade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .modal-body {
    max-width: 560px;
    width: 100%;
    padding: 1.5em;
    border-color: var(--of-rust);
    border-width: 3px;
    animation: card-slide 0.3s cubic-bezier(0.2, 0.9, 0.3, 1.1);
  }
  @keyframes card-slide {
    from { opacity: 0; transform: translateY(16px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .head {
    display: flex;
    align-items: center;
    gap: 0.7em;
    margin-bottom: 1em;
  }
  .head-glyph {
    font-size: 2.2em;
    line-height: 1;
  }
  .head-titles {
    display: flex;
    flex-direction: column;
    gap: 0.1em;
    min-width: 0;
  }
  .head-tag {
    font-size: 0.7em;
    letter-spacing: 0.15em;
    font-weight: 700;
    color: var(--of-ink-soft);
  }
  .head-titles h2 {
    margin: 0;
    color: var(--of-rust);
    font-size: 1.5em;
    line-height: 1.1;
  }

  .haul-list {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    margin-bottom: 1em;
  }
  .haul-row {
    display: flex;
    align-items: flex-start;
    gap: 0.7em;
    padding: 0.6em 0.8em;
    background: var(--of-paper);
    border: 1px solid var(--of-rule);
    border-radius: 3px;
    animation: row-in 0.3s ease-out backwards;
  }
  .haul-row:nth-child(1) { animation-delay: 60ms; }
  .haul-row:nth-child(2) { animation-delay: 120ms; }
  .haul-row:nth-child(3) { animation-delay: 180ms; }
  .haul-row:nth-child(4) { animation-delay: 240ms; }
  .haul-row:nth-child(5) { animation-delay: 300ms; }
  @keyframes row-in {
    from { opacity: 0; transform: translateX(-10px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  .haul-row.standalone { margin: 0.5em 0; }
  .haul-row.meat    { border-left: 3px solid var(--of-rust); }
  .haul-row.liver   { border-left: 3px solid #c94a4a; }
  .haul-row.berries { border-left: 3px solid #7a4a8c; }
  .haul-row.spent   { opacity: 0.8; }
  .haul-row.injury  { border-left: 3px solid #e85a4a; background: rgba(232, 90, 74, 0.08); }

  .row-glyph {
    font-size: 1.6em;
    line-height: 1;
    flex-shrink: 0;
  }
  .row-body {
    display: flex;
    flex-direction: column;
    gap: 0.1em;
    min-width: 0;
  }
  .row-name {
    color: var(--of-ink);
    font-weight: 700;
  }
  .row-detail {
    color: var(--of-ink);
    font-size: 0.88em;
  }
  .spoil-warn {
    color: #c96a2a;
    font-weight: 700;
  }
  .good {
    color: #8bb96a;
    font-weight: 700;
  }

  .advice {
    margin: 0 0 1em 0;
    padding: 0.6em 0.8em;
    background: rgba(201, 106, 42, 0.1);
    border-left: 3px solid #c96a2a;
    border-radius: 0 3px 3px 0;
    color: var(--of-ink);
    font-size: 0.9em;
    line-height: 1.5;
  }
  .advice strong { color: var(--of-ink); }

  .empty {
    color: var(--of-ink-soft);
    font-style: italic;
    line-height: 1.5;
    margin: 0 0 1em 0;
    padding: 1em;
    text-align: center;
    background: var(--of-paper);
    border-radius: 3px;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 0.5em;
  }
  .continue {
    font-size: 1em;
    padding: 0.65em 1.6em;
  }
</style>
