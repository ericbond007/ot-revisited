<script lang="ts">
  // Visual-diff harness for PartyPanel. Mirrors the four member states
  // from docs/handoff/components/src/party-panel.html: leader/banker
  // healthy, doctor healthy, ill child, dead scout. Plus a sparkline
  // worth of fake morale history and the mini-stats footer.
  import PartyPanel from '$lib/ui/PartyPanel.svelte';
  import type { GameState, PartyMember, Ox } from '$lib/game/types';

  function member(over: Partial<PartyMember>): PartyMember {
    return {
      id: 'p1',
      name: 'X',
      sex: 'male',
      kind: 'adult',
      isLeader: false,
      age: 30,
      health: 80,
      conditions: [],
      dead: false,
      ...over
    };
  }

  const ezra   = member({ id: 'p1', name: 'Ezra',  profession: 'banker', isLeader: true, health: 78 });
  const mary   = member({ id: 'p2', name: 'Mary',  profession: 'doctor', sex: 'female', health: 92 });
  const sarah  = member({ id: 'p3', name: 'Sarah', kind: 'child', sex: 'female', age: 8, health: 34, conditions: [{ id: 'cholera', daysSinceOnset: 2 }] });
  const amos   = member({ id: 'p4', name: 'Amos',  profession: 'scout', dead: true, deathCause: 'cholera', deathDay: 41, health: 0 });

  const oxen: Ox[] = [
    { id: 'o1', health: 100, fatigue: 30, shod: true,  kind: 'ox' },
    { id: 'o2', health: 100, fatigue: 28, shod: true,  kind: 'ox' },
    { id: 'o3', health: 100, fatigue: 35, shod: false, kind: 'ox' }
  ];

  // Mock GameState — only the fields PartyPanel reads.
  function mock(over: Partial<GameState>): GameState {
    return {
      party: [ezra, mary, sarah, amos],
      oxen,
      morale: 64,
      moraleHistory: [70, 68, 72, 60, 65, 68, 64],
      pace: 'fast',
      rations: 'normal',
      inventory: { flour: 60, beans: 30, bacon: 12, coffee: 4 },
      ...over
    } as unknown as GameState;
  }

  const healthy   = mock({ morale: 78, moraleHistory: [60, 64, 68, 72, 74, 76, 78] });
  const trending  = mock({ morale: 64, moraleHistory: [70, 68, 72, 60, 65, 68, 64] });
  const lowMorale = mock({ morale: 22, moraleHistory: [70, 60, 50, 42, 35, 28, 22] });
  const earlyGame = mock({ morale: 88, moraleHistory: [88] });
</script>

<svelte:head><title>PartyPanel Showcase — dev</title></svelte:head>

<div class="page">
  <h1 class="brand-title">PartyPanel Showcase</h1>
  <p class="subtitle">
    Mocked roster mirrors the prototype: Ezra (banker, leader, healthy),
    Mary (doctor, healthy), Sarah (child, ill — fever), Amos (scout, dead).
    Diff against <code>docs/handoff/components/src/party-panel.html</code>.
  </p>

  <div class="grid">
    <section class="card">
      <div class="eyebrow">Trending UP — sparkline rises right</div>
      <PartyPanel state={healthy} />
    </section>

    <section class="card">
      <div class="eyebrow">Trending DOWN — prototype reference</div>
      <PartyPanel state={trending} />
    </section>

    <section class="card">
      <div class="eyebrow">Crashing morale — sparkline plummets</div>
      <PartyPanel state={lowMorale} />
    </section>

    <section class="card">
      <div class="eyebrow">Day 1 — only one history sample (sparkline pads flat)</div>
      <PartyPanel state={earlyGame} />
    </section>
  </div>
</div>

<style>
  .page {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--s-6) var(--s-4);
  }
  .brand-title {
    font-family: var(--f-display);
    font-size: var(--fs-3xl);
    color: var(--of-rust);
    letter-spacing: var(--ls-medium);
    margin: 0 0 var(--s-2) 0;
  }
  .subtitle {
    color: var(--of-ink);
    font-family: var(--f-body);
    margin: 0 0 var(--s-4) 0;
  }
  code { background: var(--of-paper); padding: 0 .25em; border-radius: 2px; }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: var(--s-3);
  }
  .card {
    background: var(--of-paper);
    border: var(--bw-2) solid var(--of-ink-soft);
    border-radius: var(--r-sm);
    padding: var(--s-3);
  }
  .eyebrow {
    color: var(--of-ink-soft);
    font-size: var(--fs-xs);
    letter-spacing: var(--ls-loose);
    text-transform: uppercase;
    margin-bottom: var(--s-2);
  }
</style>
