<script lang="ts">
  import type { BotProfile } from '$lib/game/content/bot-profiles';

  interface Props {
    profile: BotProfile | null;
    selected: boolean;
    onselect: () => void;
  }
  let { profile, selected, onselect }: Props = $props();

  const DIFFICULTY_LABEL = {
    easy: 'Easy',
    normal: 'Normal',
    hard: 'Hard',
    legendary: 'Legendary'
  } as const;

  const compositionSummary = (p: BotProfile): string => {
    const adults = p.party.filter((m) => m.role !== 'child').length;
    const children = p.party.filter((m) => m.role === 'child').length;
    if (adults === 1 && children === 0) return 'solo';
    if (children === 0) return `${adults} adults`;
    return `${adults} adults + ${children} ${children === 1 ? 'child' : 'children'}`;
  };
</script>

<button
  type="button"
  class="profile-card"
  class:selected
  class:custom={!profile}
  onclick={onselect}
>
  {#if profile}
    <div class="card-head">
      <span class="card-title">{profile.displayName}</span>
      <span class="badge badge-{profile.difficulty}">{DIFFICULTY_LABEL[profile.difficulty]}</span>
    </div>
    <div class="card-meta">{profile.year} · {compositionSummary(profile)} · {profile.leaderProfession}</div>
    <div class="card-trait">{profile.trait}</div>
  {:else}
    <div class="card-head">
      <span class="card-title">Build a custom party</span>
    </div>
    <div class="card-meta">Pick your own crew + departure date.</div>
    <div class="card-trait">No historical fate attached.</div>
  {/if}
</button>

<style>
  .profile-card {
    text-align: left;
    background: var(--card-bg, #fff8ef);
    border: 1px solid var(--card-border, #c9bba0);
    border-radius: 6px;
    padding: 0.75rem 0.9rem;
    cursor: pointer;
    font: inherit;
    color: inherit;
    transition: border-color 120ms, background 120ms, transform 120ms;
  }
  .profile-card:hover { border-color: #990000; transform: translateY(-1px); }
  .profile-card.selected { border-color: #990000; background: #eeedeb; box-shadow: 0 0 0 2px rgba(153,0,0,0.2); }
  .profile-card.custom { background: #eeedeb; font-style: italic; }
  .card-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.25rem; }
  .card-title { font-weight: 600; font-size: 1.05em; }
  .card-meta { font-size: 0.85em; color: #555; margin-bottom: 0.25rem; }
  .card-trait { font-size: 0.85em; line-height: 1.3; color: #333; }
  .badge { font-size: 0.7em; padding: 0.1em 0.5em; border-radius: 3px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
  .badge-easy { background: #d6e9c6; color: #3c763d; }
  .badge-normal { background: #fcf8e3; color: #8a6d3b; }
  .badge-hard { background: #f2dede; color: #a94442; }
  .badge-legendary { background: #2b2b2b; color: #eeedeb; }
</style>
