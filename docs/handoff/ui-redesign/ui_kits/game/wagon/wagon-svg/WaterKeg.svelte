<script lang="ts">
  // Water keg lashed to the side of the wagon. Wood with iron bands;
  // larger barrel ("large") sits on Conestoga-class wagons.
  import { W_INK, W_IRON, W_WOOD_LIGHT } from './wagon-tokens';

  interface Props {
    x: number;
    y: number;
    large?: boolean;
  }

  let { x, y, large = false }: Props = $props();
  const w = $derived(large ? 3.5 : 2.6);
  const h = $derived(large ? 4 : 3.2);
</script>

<g transform="translate({x} {y})">
  <!-- keg body — vertical, wood with iron bands -->
  <ellipse cx="0" cy={-h + 0.3} rx={w / 2} ry="0.5"
           fill={W_WOOD_LIGHT} stroke={W_INK} stroke-width="0.3" />
  <path d={`M${-w / 2} ${-h + 0.3} L${-w / 2 + 0.2} 0 L${w / 2 - 0.2} 0 L${w / 2} ${-h + 0.3}`}
        fill={W_WOOD_LIGHT} stroke={W_INK} stroke-width="0.4" stroke-linejoin="round" />
  <!-- iron bands -->
  <path d={`M${-w / 2 + 0.05} ${-h * 0.3} L${w / 2 - 0.05} ${-h * 0.3}`}
        stroke={W_IRON} stroke-width="0.4" />
  <path d={`M${-w / 2 + 0.1} ${-h * 0.7} L${w / 2 - 0.1} ${-h * 0.7}`}
        stroke={W_IRON} stroke-width="0.4" />
  <!-- stave lines -->
  <line x1="-0.6" y1={-h + 0.3} x2="-0.5" y2="-0.2"
        stroke={W_INK} stroke-width="0.25" opacity="0.6" />
  <line x1="0.6" y1={-h + 0.3} x2="0.5" y2="-0.2"
        stroke={W_INK} stroke-width="0.25" opacity="0.6" />
  <!-- lashing rope -->
  <path d={`M${-w / 2 - 0.5} ${-h * 0.5} Q0 ${-h * 0.5 - 1} ${w / 2 + 0.5} ${-h * 0.5}`}
        fill="none" stroke="#8a6a3a" stroke-width="0.35" />
</g>
