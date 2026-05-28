<script lang="ts">
  // Chicken coop — slat-walled wooden box strapped to the wagon side.
  // `size` keys off the parent wagon model (sm = light, md = prairie,
  // lg = heavy Conestoga). `chickens` controls how many bird shapes
  // are visible inside.
  import { W_INK, W_WOOD_LIGHT } from './wagon-tokens';

  interface Props {
    x: number;
    y: number;
    size?: 'sm' | 'md' | 'lg';
    chickens?: number;
  }

  let { x, y, size = 'md', chickens = 3 }: Props = $props();

  const w = $derived(size === 'sm' ? 4 : size === 'md' ? 5.5 : 7);
  const h = $derived(size === 'sm' ? 2.8 : size === 'md' ? 3.5 : 4.5);
  const slats = $derived(size === 'sm' ? 4 : size === 'md' ? 5 : 6);

  type Slat = { sx: number; idx: number };
  const slatList = $derived.by<Slat[]>(() => {
    const out: Slat[] = [];
    for (let i = 0; i < slats - 1; i++) {
      out.push({ sx: -w / 2 + (w / slats) * (i + 1), idx: i });
    }
    return out;
  });

  type Bird = { cx: number; cy: number; idx: number };
  const birdList = $derived.by<Bird[]>(() => {
    const out: Bird[] = [];
    const visible = Math.min(chickens, slats - 1);
    for (let i = 0; i < visible; i++) {
      const cx = -w / 2 + (w / slats) * (i + 1) - (w / slats) / 2;
      const cy = -h * 0.35;
      out.push({ cx, cy, idx: i });
    }
    return out;
  });
</script>

<g transform="translate({x} {y})">
  <!-- coop body -->
  <rect x={-w / 2} y={-h} width={w} height={h}
        fill={W_WOOD_LIGHT} stroke={W_INK} stroke-width="0.5" stroke-linejoin="round" />
  <!-- slats (vertical bars) -->
  {#each slatList as s (s.idx)}
    <line x1={s.sx} y1={-h + 0.3} x2={s.sx} y2="-0.3"
          stroke={W_INK} stroke-width="0.35" opacity="0.85" />
  {/each}
  <!-- horizontal cross-brace -->
  <line x1={-w / 2 + 0.3} y1={-h * 0.55} x2={w / 2 - 0.3} y2={-h * 0.55}
        stroke={W_INK} stroke-width="0.3" />
  <!-- hint of chickens -->
  {#each birdList as b (b.idx)}
    <ellipse cx={b.cx} cy={b.cy} rx="0.7" ry="0.5" fill="#e8c89a" />
    <circle cx={b.cx + 0.4} cy={b.cy - 0.4} r="0.3" fill="#e8c89a" />
    <path d={`M${b.cx + 0.65} ${b.cy - 0.5} l0.3 -0.15`}
          stroke="#c96a2a" stroke-width="0.2" />
  {/each}
  <!-- lashing ropes -->
  <path d={`M${-w / 2 - 0.5} ${-h * 0.5} L${w / 2 + 0.5} ${-h * 0.5}`}
        stroke="#8a6a3a" stroke-width="0.4" />
  <path d={`M${-w / 2 - 0.4} ${-h * 0.8} L${w / 2 + 0.4} ${-h * 0.8}`}
        stroke="#8a6a3a" stroke-width="0.35" />
</g>
