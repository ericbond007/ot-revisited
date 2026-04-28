<script lang="ts">
  // Letter from home — pops when flags._pendingLetter is set after a
  // post arrival rolled a delivery. Same dismiss pattern as the
  // newspaper / hunt-haul / camp-summary modals: server flag persists
  // until ?/ackLetter clears it, so backdrop close would re-mount.
  //
  // Visual: parchment grain, IM Fell English serif body, signed
  // closing right-aligned. Layout intentionally plain — Claude
  // Design will rework later. Morale-delta footer reads as a small
  // diary aside, not a stat readout.
  import type { PendingLetter } from '$lib/game/systems/letters';
  import ParchmentBg from './trail-map/trail-map-svg/ParchmentBg.svelte';

  let { letter, slot }: { letter: PendingLetter; slot: string } = $props();
  const qp = $derived(encodeURIComponent(slot));

  const moraleSign = $derived(letter.moraleDelta > 0 ? '+' : '');
  const moraleClass = $derived(
    letter.moraleDelta > 0 ? 'tone-good'
    : letter.moraleDelta < 0 ? 'tone-bad'
    : 'tone-neutral'
  );
</script>

<div class="modal-backdrop">
  <div class="paper-shell">
    <ParchmentBg>
      <div class="letter">
        <header class="head">
          <div class="caught">A letter caught up with you at {letter.postName}.</div>
          <div class="from">From {letter.origin}</div>
        </header>

        <section class="body-text">
          <p>{letter.body}</p>
          <p class="closing">{letter.closing}</p>
        </section>

        <footer class="footnote">
          <span class="morale {moraleClass}">
            Morale {moraleSign}{letter.moraleDelta}
          </span>
        </footer>

        <form method="POST" action="?/ackLetter&slot={qp}" class="actions">
          <button type="submit" class="continue">Fold and tuck away</button>
        </form>
      </div>
    </ParchmentBg>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(20, 12, 6, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    padding: 16px;
  }
  .paper-shell {
    width: min(560px, 100%);
    max-height: 92vh;
    border: 1px solid #3a1a08;
    box-shadow:
      0 18px 40px rgba(0, 0, 0, 0.45),
      0 0 0 6px rgba(58, 26, 8, 0.08);
    overflow: hidden;
  }
  .letter {
    position: relative;
    padding: 26px clamp(20px, 5vw, 36px) 22px;
    color: #2a160a;
    overflow-y: auto;
    max-height: 92vh;
    font-family: 'IM Fell English', Georgia, serif;
  }
  .head {
    text-align: center;
    margin-bottom: 18px;
    border-bottom: 1px solid rgba(58, 26, 8, 0.35);
    padding-bottom: 10px;
  }
  .caught {
    font-style: italic;
    font-size: 14px;
    letter-spacing: 0.03em;
  }
  .from {
    margin-top: 4px;
    font-variant: small-caps;
    font-size: 13px;
    letter-spacing: 0.06em;
    color: #5a3a1a;
  }
  .body-text {
    line-height: 1.55;
    font-size: 16px;
  }
  .body-text p {
    margin: 0 0 12px;
  }
  .closing {
    text-align: right;
    font-style: italic;
    margin-top: 14px !important;
  }
  .footnote {
    margin-top: 10px;
    text-align: center;
    border-top: 1px dashed rgba(58, 26, 8, 0.35);
    padding-top: 8px;
  }
  .morale {
    font-size: 12px;
    font-variant: small-caps;
    letter-spacing: 0.08em;
  }
  .morale.tone-good { color: #2f6b2f; }
  .morale.tone-bad { color: #8a2020; }
  .morale.tone-neutral { color: #5a3a1a; }
  .actions {
    margin-top: 14px;
    display: flex;
    justify-content: center;
  }
  .continue {
    background: #3a1a08;
    color: #f0e3c4;
    border: 1px solid #3a1a08;
    padding: 8px 22px;
    font-family: inherit;
    font-size: 15px;
    cursor: pointer;
    border-radius: 2px;
    letter-spacing: 0.03em;
  }
  .continue:hover { background: #5a3a1a; }
</style>
