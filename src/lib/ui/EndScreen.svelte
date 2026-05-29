<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import { LANDMARKS } from '$lib/game/content/landmarks';
  import { score } from '$lib/game/systems/scoring';
  import { ICON } from '$lib/data/icon-dictionary';
  let { state }: { state: GameState } = $props();
  const result = $derived(score(state));

  // The last landmark the party actually passed (or the one they were
  // parked at when they died) — surfaced as "furthest point reached".
  const lastLandmark = $derived.by(() => {
    const id = state.location.atLandmarkId ?? state.location.previousLandmarkId;
    return id ? (LANDMARKS.find((l) => l.id === id)?.name ?? id) : null;
  });
  const dead = $derived(state.party.filter((m) => m.dead));
  const alive = $derived(state.party.filter((m) => !m.dead));
  const leaderName = $derived(state.party[0]?.name ?? 'the leader');
  // Register Cliff inscription (#228) — set when the party chose to
  // chisel their names into the sandstone. Outlasts the party.
  const cliffInscription = $derived(
    typeof state.flags._registerCliffInscription === 'string'
      ? state.flags._registerCliffInscription
      : null
  );
</script>

{#if state.outcome === 'wiped'}
  <!-- Game over. Big tombstone hero; each fallen member gets their own
       epitaph card. Map + event log remain visible above so the player
       can see where and when it all ended. -->
  <div class="panel tombstone-wrap">
    <div class="hero">
      <div class="big-stone" aria-hidden="true">{ICON.end_screen.tombstone}</div>
      <h2 class="head">Here lies {leaderName}'s party.</h2>
      <p class="epitaph">Perished on the trail — day {state.day} of {state.date.year}.</p>
    </div>

    <div class="stats">
      <span class="stat"><strong>{state.day}</strong> days</span>
      <span class="stat"><strong>{Math.round(state.location.milesTraveled)}</strong> mi</span>
      {#if lastLandmark}
        <span class="stat">last seen at <strong>{lastLandmark}</strong></span>
      {/if}
      <span class="stat">score <strong>{result.total.toLocaleString()}</strong></span>
    </div>

    <div class="graves">
      {#each dead as m}
        <div class="grave">
          <div class="grave-stone">{ICON.end_screen.tombstone}</div>
          <div class="grave-text">
            <div class="grave-name">{m.name}{m.isLeader ? ' (leader)' : ''}</div>
            <div class="grave-role">{m.profession ?? m.kind}</div>
            <div class="grave-cause">d. day {m.deathDay} · {m.deathCause}</div>
          </div>
        </div>
      {/each}
    </div>

    {#if cliffInscription}
      <div class="cliff-inscription">
        <div class="cliff-head">CHISELED INTO REGISTER CLIFF</div>
        <div class="cliff-body">{cliffInscription}</div>
      </div>
    {/if}

    <div class="cta-row">
      <a href="/new" class="cta primary">{ICON.journey_menu.new} New Journey</a>
      <a href="/" class="cta">{ICON.journey_menu.home} Home</a>
    </div>
  </div>
{:else if state.outcome === 'arrived'}
  <!-- Happy ending — party arrived at Oregon City. -->
  <div class="panel arrived-wrap">
    <div class="hero">
      <div class="big-glyph" aria-hidden="true">{ICON.end_screen.tree}</div>
      <h2 class="head arrived-head">You made it to Oregon!</h2>
      <p class="epitaph">Arrived in Oregon City after {state.day} days and {Math.round(state.location.milesTraveled)} miles.</p>
    </div>

    <div class="stats">
      <span class="stat"><strong>{alive.length}</strong> survivors</span>
      {#if dead.length > 0}
        <span class="stat"><strong>{dead.length}</strong> lost on the trail</span>
      {/if}
    </div>

    <ul class="roster">
      {#each state.party as m}
        <li class="roster-row" class:is-dead={m.dead}>
          <span class="roster-name">{m.name} ({m.profession ?? m.kind})</span>
          <span class="roster-fate">
            {#if m.dead}
              ✝ day {m.deathDay} · {m.deathCause}
            {:else}
              ❤ HP {m.health}
            {/if}
          </span>
        </li>
      {/each}
    </ul>

    <div class="score">
      <div class="score-head">FINAL SCORE</div>
      <div class="score-total">{result.total.toLocaleString()}</div>
      <ul class="score-breakdown">
        <li><span>Miles</span><span>{result.miles.toLocaleString()}</span></li>
        <li><span>Survivors</span><span>+{result.survivors}</span></li>
        <li><span>Reached Oregon City</span><span>+{result.arrival.toLocaleString()}</span></li>
        {#if result.luxuries > 0}
          <li class="luxury-head"><span>Luxuries delivered</span><span>+{result.luxuries.toLocaleString()}</span></li>
          {#each result.luxuryItems as lux}
            <li class="luxury-item">
              <span>· {lux.name}{lux.qty > 1 ? ` × ${lux.qty}` : ''}</span>
              <span>+{lux.points.toLocaleString()}</span>
            </li>
          {/each}
        {/if}
      </ul>
    </div>

    {#if result.epilogueLines.length > 0}
      <div class="epilogue">
        <div class="epilogue-head">WHAT THOSE CHOICES BECAME</div>
        <ul class="epilogue-list">
          {#each result.epilogueLines as line}
            <li>{line.line}</li>
          {/each}
        </ul>
      </div>
    {/if}

    {#if cliffInscription}
      <div class="cliff-inscription">
        <div class="cliff-head">CHISELED INTO REGISTER CLIFF</div>
        <div class="cliff-body">{cliffInscription}</div>
      </div>
    {/if}

    <div class="cta-row">
      <a href="/new" class="cta primary">{ICON.journey_menu.new} New Journey</a>
      <a href="/" class="cta">{ICON.journey_menu.home} Home</a>
    </div>
  </div>
{:else}
  <!-- Fallback for `stranded` or any future outcome. -->
  <div class="panel">
    <h2>Journey's End</h2>
    <p>Stranded on the trail on day {state.day}.</p>
    <ul>
      {#each state.party as m}
        <li>{m.name} ({m.profession ?? m.kind}) — {m.dead ? `✝ died day ${m.deathDay}, ${m.deathCause}` : `survived, HP ${m.health}`}</li>
      {/each}
    </ul>
    <div class="cta-row">
      <a href="/new" class="cta primary">{ICON.journey_menu.new} New Journey</a>
      <a href="/" class="cta">{ICON.journey_menu.home} Home</a>
    </div>
  </div>
{/if}

<style>
  /* Shared --- */
  .hero {
    text-align: center;
    padding: 0.8em 0;
  }
  .head {
    margin: 0.3em 0 0.15em;
    font-size: 1.4em;
    letter-spacing: 0.02em;
  }
  .epitaph {
    margin: 0;
    font-style: italic;
    color: var(--of-ink);
    font-size: 0.95em;
  }
  .stats {
    display: flex;
    justify-content: center;
    gap: 1.5em;
    flex-wrap: wrap;
    padding: 0.6em 0;
    border-top: 1px solid rgba(138, 90, 42, 0.3);
    border-bottom: 1px solid rgba(138, 90, 42, 0.3);
    font-size: 0.9em;
    color: var(--of-ink);
  }
  .stat strong {
    color: var(--of-ink);
    font-size: 1.15em;
    font-weight: 900;
  }
  .cta-row {
    display: flex;
    gap: 0.6em;
    justify-content: center;
    margin-top: 1em;
  }
  .cta {
    display: inline-flex;
    align-items: center;
    gap: 0.4em;
    padding: 0.55em 1.2em;
    background: var(--of-paper);
    color: var(--of-ink);
    border: 2px solid var(--of-ink-soft);
    border-radius: 4px;
    text-decoration: none;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    font-size: 0.8em;
    transition: border-color 0.15s, background 0.15s;
  }
  .cta:hover {
    border-color: var(--of-rust);
    background: var(--of-paper-soft);
  }
  .cta.primary {
    background: var(--of-rust-dark);
    border-color: var(--of-rust);
    color: var(--of-paper-soft);
  }
  .cta.primary:hover {
    background: var(--of-rust);
    color: var(--of-paper-soft);
  }

  /* Tombstone / wiped --- */
  .tombstone-wrap {
    padding: 1.2em 1.4em;
    border-color: #4a4840;
    background: linear-gradient(180deg, var(--of-paper-soft) 0%, #15130f 100%);
  }
  .big-stone {
    font-size: 5em;
    line-height: 1;
    filter: grayscale(0.35) brightness(0.9);
    animation: stone-sink 3s ease-out both;
  }
  @keyframes stone-sink {
    0%   { opacity: 0; transform: translateY(-20px); }
    60%  { opacity: 1; transform: translateY(0); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .tombstone-wrap .head {
    color: var(--of-ink);
    font-family: var(--f-mono, 'Georgia', serif);
    font-weight: 900;
  }

  .graves {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 0.5em;
    margin-top: 0.9em;
  }
  .grave {
    display: flex;
    align-items: center;
    gap: 0.6em;
    padding: 0.5em 0.7em;
    background: #1a1816;
    border: 1px solid #4a4840;
    border-radius: 3px;
  }
  .grave-stone {
    font-size: 1.6em;
    line-height: 1;
    flex-shrink: 0;
  }
  .grave-text {
    display: flex;
    flex-direction: column;
    gap: 0.1em;
    min-width: 0;
  }
  .grave-name {
    font-weight: 700;
    color: var(--of-ink);
    font-size: 0.92em;
  }
  .grave-role {
    font-size: 0.72em;
    color: var(--of-ink-soft);
    text-transform: capitalize;
  }
  .grave-cause {
    font-size: 0.75em;
    color: var(--of-ink);
    font-style: italic;
  }

  /* Arrived --- */
  .arrived-wrap {
    padding: 1.2em 1.4em;
    border-color: #8bb96a;
  }
  .big-glyph {
    font-size: 4em;
    line-height: 1;
  }
  .arrived-head {
    color: #8bb96a;
  }
  .roster {
    list-style: none;
    padding: 0;
    margin: 0.8em 0 0;
    display: flex;
    flex-direction: column;
    gap: 0.2em;
  }
  .roster-row {
    display: flex;
    justify-content: space-between;
    padding: 0.3em 0.5em;
    background: var(--of-paper);
    border-radius: 3px;
    font-size: 0.88em;
  }
  .roster-row.is-dead {
    opacity: 0.55;
    color: var(--of-ink-soft);
  }
  .roster-name {
    color: var(--of-ink);
  }
  .roster-fate {
    color: var(--of-ink);
    font-style: italic;
  }

  /* Score panel — celebratory accent on the arrived screen. */
  .score {
    margin-top: 1em;
    padding: 0.8em 1em;
    background: var(--of-paper);
    border: 1px solid var(--of-rust);
    border-radius: 4px;
  }
  .score-head {
    font-family: var(--f-mono);
    font-size: 0.7em;
    letter-spacing: 0.18em;
    color: var(--of-ink-soft);
    font-weight: 700;
    text-align: center;
  }
  .score-total {
    font-family: var(--f-display);
    font-size: 2.2em;
    color: var(--of-rust);
    text-align: center;
    line-height: 1.1;
    margin: 0.1em 0 0.4em 0;
    letter-spacing: 0.04em;
  }
  .score-breakdown {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.18em;
    font-size: 0.85em;
    color: var(--of-ink);
    border-top: 1px solid rgba(138, 90, 42, 0.3);
    padding-top: 0.5em;
  }
  .score-breakdown li {
    display: flex;
    justify-content: space-between;
  }
  .score-breakdown li.luxury-head {
    margin-top: 0.3em;
    color: var(--of-ink);
    font-weight: 700;
  }
  .score-breakdown li.luxury-item {
    padding-left: 0.6em;
    color: var(--of-ink-soft);
    font-size: 0.92em;
  }

  /* Register Cliff inscription (#228) — chiseled letters on a sandy
     parchment band. Reads like the actual sandstone face: small caps,
     period dot separator, a thin rule above + below. */
  .cliff-inscription {
    margin: 1.2em 0 0.6em;
    padding: 0.9em 1em;
    background: rgba(232, 217, 184, 0.15);
    border-top: 1px solid var(--of-ink-soft);
    border-bottom: 1px solid var(--of-ink-soft);
    text-align: center;
  }
  .cliff-head {
    font-size: 0.72em;
    letter-spacing: 0.18em;
    color: var(--of-ink-soft);
    font-weight: 700;
    margin-bottom: 0.5em;
  }
  .cliff-body {
    font-family: 'IM Fell English', 'Special Elite', Georgia, serif;
    font-size: 1.2em;
    letter-spacing: 0.06em;
    color: var(--of-ink);
  }
  .epilogue {
    margin: 1.2em 0 0.6em;
    padding: 0.9em 1em;
    border-top: 1px solid var(--of-ink-soft);
    border-bottom: 1px solid var(--of-ink-soft);
  }
  .epilogue-head {
    font-size: 0.72em;
    letter-spacing: 0.18em;
    color: var(--of-ink-soft);
    font-weight: 700;
    margin-bottom: 0.6em;
    text-align: center;
  }
  .epilogue-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.55em;
  }
  .epilogue-list li {
    font-family: 'IM Fell English', 'Special Elite', Georgia, serif;
    font-size: 1.02em;
    line-height: 1.45;
    color: var(--of-ink);
    padding-left: 0.9em;
    border-left: 2px solid var(--of-ink-soft);
  }
</style>
