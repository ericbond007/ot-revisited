<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import CardRadio from './CardRadio.svelte';
  import { ICON } from '$lib/data/icon-dictionary';

  let { state: gameState, slot, onclose }: { state: GameState; slot: string; onclose: () => void } = $props();

  const qp = $derived(encodeURIComponent(slot));
  const rifleCount = $derived(gameState.inventory.rifle ?? 0);
  // #1056 — `bullets` was removed in #174 (split into gunpowder +
  // lead_balls + percussion_caps). The engine fires
  // min(gunpowder, lead_balls, percussion_caps) shots (hunt.ts
  // `spentBullets`); mirror that exactly so the modal's gate matches
  // what hunt() will actually do. Reading the dead `inventory.bullets`
  // here made it always 0 → every rifle target disabled "Out of
  // bullets" → rifle hunting unreachable for the player.
  const availableShots = $derived(Math.min(
    gameState.inventory.gunpowder ?? 0,
    gameState.inventory.lead_balls ?? 0,
    gameState.inventory.percussion_caps ?? 0
  ));
  // Children can't hunt — they stay at camp. "Able-bodied" = alive adults.
  const aliveCount = $derived(
    gameState.party.filter((m) => !m.dead && m.kind === 'adult').length
  );
  const aliveNames = $derived(
    gameState.party.filter((m) => !m.dead && m.kind === 'adult').map((m) => m.name)
  );

  type Target = 'small' | 'medium' | 'big' | 'gather';
  type Ammo = 'light' | 'moderate' | 'heavy';
  type Style = 'full' | 'prize_only';
  type Mode = 'solo' | 'company';

  let target = $state<Target>('small');
  let ammo = $state<Ammo>('moderate');
  let hunters = $state(1);
  // #199 — only consulted when target='big'. 'full' butchers the
  // animal and brings everything; 'prize_only' takes tongue + hump
  // and leaves the rest. Period truth — emigrant diaries describe
  // this as a celebrated delicacy run, not a moral failing.
  let style = $state<Style>('full');
  // Independent of style — render the fat into tallow? Costs nothing
  // beyond hunt time; default on. Player can opt out if their wagon
  // weight budget is tight (tallow is heavy).
  let tallowChoice = $state<'yes' | 'no'>('yes');
  // #294 — solo (current) vs company (in-train hunting party). Default
  // to company when in a train; the equity rule is the period default.
  // The initial value is captured non-reactively via untrack — the
  // modal opens once per hunt and wagonTrain doesn't change underneath.
  import { untrack } from 'svelte';
  let mode = $state<Mode>(untrack(() => gameState.wagonTrain != null ? 'company' : 'solo'));

  const liveCompanionCount = $derived(
    gameState.wagonTrain
      ? gameState.wagonTrain.companions.filter((c) => c.outcome === 'in-progress').length
      : 0
  );

  // Guardrails: if rifles vanish or party shrinks while the modal is open.
  $effect(() => {
    if (rifleCount === 0 && target !== 'gather') target = 'gather';
  });
  $effect(() => {
    if (hunters > aliveCount) hunters = Math.max(1, aliveCount);
  });

  // Smart defaults based on available resources
  $effect(() => {
    if (rifleCount === 0 && target !== 'gather') target = 'gather';
    if (availableShots === 0 && target !== 'gather') target = 'gather';
  });

  // Target options — gated by rifle presence
  const noRifle = $derived(rifleCount === 0);
  const noAmmo = $derived(availableShots === 0);

  const targetOptions = $derived([
    {
      value: 'small' as const,
      label: 'Small Game',
      sublabel: 'Rabbits, birds, prairie chickens',
      icon: ICON.fauna.small,
      disabled: noRifle || noAmmo,
      disabledReason: noRifle ? 'Need a rifle' : noAmmo ? 'Out of ammunition' : undefined
    },
    {
      value: 'medium' as const,
      label: 'Medium Game',
      sublabel: 'Deer, pronghorn — balanced',
      icon: ICON.fauna.medium,
      disabled: noRifle || noAmmo,
      disabledReason: noRifle ? 'Need a rifle' : noAmmo ? 'Out of ammunition' : undefined
    },
    {
      value: 'big' as const,
      label: 'Big Game',
      sublabel: 'Buffalo, bear — high yield, injury risk',
      icon: ICON.fauna.big,
      disabled: noRifle || noAmmo,
      disabledReason: noRifle ? 'Need a rifle' : noAmmo ? 'Out of ammunition' : undefined
    },
    {
      value: 'gather' as const,
      label: 'Forage',
      sublabel: 'Berries, roots, herbs — no rifle needed',
      icon: ICON.fauna.forage
    }
  ]);

  const ammoOptions = [
    { value: 'light' as const,    label: 'Light',    sublabel: '5 shots',  icon: '🔸' },
    { value: 'moderate' as const, label: 'Moderate', sublabel: '10 shots', icon: '🔹' },
    { value: 'heavy' as const,    label: 'Heavy',    sublabel: '20 shots', icon: '💥' }
  ];

  const styleOptions = [
    {
      value: 'full' as const,
      label: 'Full butchery',
      sublabel: 'Take everything — meat, hide, prize cuts',
      icon: '🥩'
    },
    {
      value: 'prize_only' as const,
      label: 'Prize cuts only',
      sublabel: 'Tongue + hump · leave the rest · feast tonight',
      icon: '🍖'
    }
  ];

  const tallowOptions = [
    { value: 'yes' as const, label: 'Render tallow', sublabel: 'Take the fat too — heavy, but tradeable', icon: '🟡' },
    { value: 'no'  as const, label: 'Skip tallow',   sublabel: 'Save wagon weight, leave the fat',     icon: '🚫' }
  ];

  // #294 — solo vs company hunt picker, only relevant when in a train.
  // Period: trains organized hunts at sundown; solo hunts while
  // attached to a company drew side-eye for breaking equity.
  const modeOptions = $derived([
    {
      value: 'company' as const,
      label: 'Lead the company hunt',
      sublabel: liveCompanionCount > 0
        ? `${liveCompanionCount} other ${liveCompanionCount === 1 ? 'wagon' : 'wagons'} chip in — bigger haul, divided by household`
        : 'Bigger haul, divided across the train',
      icon: '🤝'
    },
    {
      value: 'solo' as const,
      label: 'Hunt alone',
      sublabel: 'Keep the whole kill — the company will notice (-train morale)',
      icon: '🧍'
    }
  ]);

  const peopleOptions = $derived([
    {
      value: 1,
      label: 'Solo',
      sublabel: aliveNames[0] ? `${aliveNames[0]} alone` : 'One hunter',
      icon: '🧍'
    },
    {
      value: 2,
      label: 'Two',
      sublabel:
        rifleCount >= 2
          ? 'Parallel hunt — both use rifles'
          : '1 hunts, 1 gathers — +carry cap',
      icon: '👥',
      disabled: aliveCount < 2,
      disabledReason: aliveCount < 2 ? 'Only one able-bodied' : undefined
    }
  ]);
</script>

<div class="modal-backdrop">
  <div class="panel modal-body">
    <h2 class="modal-title">Hunt or Gather</h2>
    <div class="stats">
      <span><strong>Rifles:</strong> {rifleCount}</span>
      <span><strong>Ammo:</strong> {availableShots} shots</span>
      <span><strong>Able-bodied:</strong> {aliveCount}</span>
    </div>

    {#if aliveCount === 0}
      <p style="color: var(--c-rust);">No one is left to hunt or gather.</p>
      <button type="button" onclick={onclose}>Close</button>
    {:else}
      <form method="POST" action="?/hunt&slot={qp}">
        <CardRadio label="Target" name="target" bind:value={target} options={targetOptions} />

        {#if target !== 'gather'}
          <CardRadio label="Ammo" name="ammo" bind:value={ammo} options={ammoOptions} columns={3} />
        {:else}
          <input type="hidden" name="ammo" value="light" />
        {/if}

        {#if target === 'big'}
          <CardRadio label="Approach" name="style" bind:value={style} options={styleOptions} columns={2} />
        {:else}
          <input type="hidden" name="style" value="full" />
        {/if}

        {#if target === 'medium' || target === 'big'}
          <CardRadio label="Tallow" name="render_tallow" bind:value={tallowChoice} options={tallowOptions} columns={2} />
        {:else}
          <input type="hidden" name="render_tallow" value="yes" />
        {/if}

        <CardRadio label="Party" name="hunters" bind:value={hunters} options={peopleOptions} columns={2} />

        {#if gameState.wagonTrain && liveCompanionCount > 0 && target !== 'gather'}
          <CardRadio label="Hunting style" name="mode" bind:value={mode} options={modeOptions} columns={2} />
        {:else}
          <input type="hidden" name="mode" value="solo" />
        {/if}

        <div class="actions">
          <button type="submit" class="go-btn">Go</button>
          <button type="button" onclick={onclose}>Cancel</button>
        </div>
      </form>
    {/if}
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(26, 15, 8, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1em;
    overflow-y: auto;
  }
  .modal-body {
    max-width: 640px;
    width: 100%;
    padding: 1.5em;
    border-color: var(--c-rust);
  }

  .stats {
    display: flex;
    gap: 1em;
    flex-wrap: wrap;
    font-size: 0.9em;
    color: var(--c-wood);
    padding: 0.4em 0.6em;
    background: var(--c-bg-raised);
    border-radius: 3px;
    margin-bottom: 1em;
  }
  .stats strong { color: var(--c-tan); }

  .actions {
    display: flex;
    gap: 0.5em;
    margin-top: 1.2em;
  }
  .go-btn {
    font-size: 1.05em;
    padding: 0.7em 1.5em;
  }
</style>
