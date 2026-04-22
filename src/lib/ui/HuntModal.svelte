<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import CardRadio from './CardRadio.svelte';

  let { state: gameState, slot, onclose }: { state: GameState; slot: string; onclose: () => void } = $props();

  const qp = $derived(encodeURIComponent(slot));
  const rifleCount = $derived(gameState.inventory.rifle ?? 0);
  const bullets = $derived(gameState.inventory.bullets ?? 0);
  const aliveCount = $derived(gameState.party.filter((m) => !m.dead).length);
  const aliveNames = $derived(gameState.party.filter((m) => !m.dead).map((m) => m.name));

  type Target = 'small' | 'medium' | 'big' | 'gather';
  type Ammo = 'light' | 'moderate' | 'heavy';

  let target = $state<Target>('small');
  let ammo = $state<Ammo>('moderate');
  let hunters = $state(1);

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
    if (bullets === 0 && target !== 'gather') target = 'gather';
  });

  // Target options — gated by rifle presence
  const noRifle = $derived(rifleCount === 0);
  const noBullets = $derived(bullets === 0);

  const targetOptions = $derived([
    {
      value: 'small' as const,
      label: 'Small Game',
      sublabel: 'Rabbits, birds, prairie chickens',
      icon: '🐇',
      disabled: noRifle || noBullets,
      disabledReason: noRifle ? 'Need a rifle' : noBullets ? 'Out of bullets' : undefined
    },
    {
      value: 'medium' as const,
      label: 'Medium Game',
      sublabel: 'Deer, antelope — balanced',
      icon: '🦌',
      disabled: noRifle || noBullets,
      disabledReason: noRifle ? 'Need a rifle' : noBullets ? 'Out of bullets' : undefined
    },
    {
      value: 'big' as const,
      label: 'Big Game',
      sublabel: 'Buffalo, bear — high yield, injury risk',
      icon: '🦬',
      disabled: noRifle || noBullets,
      disabledReason: noRifle ? 'Need a rifle' : noBullets ? 'Out of bullets' : undefined
    },
    {
      value: 'gather' as const,
      label: 'Forage',
      sublabel: 'Berries, roots, herbs — no rifle needed',
      icon: '🌿'
    }
  ]);

  const ammoOptions = [
    { value: 'light' as const,    label: 'Light',    sublabel: '5 bullets',  icon: '🔸' },
    { value: 'moderate' as const, label: 'Moderate', sublabel: '10 bullets', icon: '🔹' },
    { value: 'heavy' as const,    label: 'Heavy',    sublabel: '20 bullets', icon: '💥' }
  ];

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
    <h2 style="color: var(--c-rust);">Hunt or Gather</h2>
    <div class="stats">
      <span><strong>Rifles:</strong> {rifleCount}</span>
      <span><strong>Bullets:</strong> {bullets}</span>
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

        <CardRadio label="Party" name="hunters" bind:value={hunters} options={peopleOptions} columns={2} />

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
