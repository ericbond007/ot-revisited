<script lang="ts">
  // Precipitation overlays — rain, snow, lightning. One file per the
  // brief's slot map. The composer enables only the variants that
  // match the active weather:
  //
  //   weather='rain'/'storm' → showRain=true (storm also enables lightning)
  //   weather='snow'         → showSnow=true
  //
  // Kurosawa-style rain: dense diagonal streaks blowing left (matches
  // the westward heading + prevailing west winds), splash dots on the
  // ground band. Snow drifts at half the speed with sinusoidal sway
  // and a low accumulated blanket along the ground line.
  //
  // Lightning fires for ~0.06s every ~6s — a periodic flash + bolt
  // that the rest of the scene reads via the brief flash overlay.

  interface Props {
    /** Scene-tick seconds. */
    t: number;
    /** Scene width. */
    w: number;
    /** Scene height. */
    h: number;
    /** Y of the ground band (rain splashes + snow blanket). */
    groundY: number;
    showRain?: boolean;
    showSnow?: boolean;
    showLightning?: boolean;
  }

  let {
    t,
    w,
    h,
    groundY,
    showRain = false,
    showSnow = false,
    showLightning = false
  }: Props = $props();

  // ---------- RAIN ----------
  // showLightning fires only on weather='storm' — use it as the
  // signal to crank rain density / speed for Kurosawa-feel committed
  // weather. Plain rain stays moderate.
  const isStorm = $derived(showLightning);
  const RAIN_COUNT = $derived(isStorm ? 260 : 140);
  const RAIN_ANGLE_DEG = $derived(isStorm ? 22 : 18);
  const RAIN_ANGLE = $derived((RAIN_ANGLE_DEG * Math.PI) / 180);
  const RAIN_SPEED = $derived(isStorm ? 780 : 600);
  const RAIN_OPACITY = $derived(isStorm ? 0.7 : 0.55);
  const RAIN_STROKE = $derived(isStorm ? 0.9 : 0.7);
  const SPLASH_COUNT = $derived(isStorm ? 56 : 30);
  const SPLASH_SPEED = 30;

  type Drop = { x1: number; y1: number; x2: number; y2: number; key: number };
  const drops = $derived.by<Drop[]>(() => {
    if (!showRain) return [];
    const out: Drop[] = [];
    for (let i = 0; i < RAIN_COUNT; i++) {
      const seed = i * 13;
      const x0 = (seed * 31) % w;
      const y0 = ((seed * 47 + t * RAIN_SPEED) % (h + 80)) - 40;
      const len = 14 + (seed % 8);
      out.push({
        x1: x0,
        y1: y0,
        x2: x0 + len * Math.sin(RAIN_ANGLE),
        y2: y0 + len * Math.cos(RAIN_ANGLE),
        key: i
      });
    }
    return out;
  });

  type Splash = { cx: number; cy: number; key: number };
  const splashes = $derived.by<Splash[]>(() => {
    if (!showRain) return [];
    const out: Splash[] = [];
    for (let i = 0; i < SPLASH_COUNT; i++) {
      const seed = i * 19;
      out.push({
        cx: (seed * 23 + t * SPLASH_SPEED) % w,
        cy: groundY + 2 + (seed % 5),
        key: i
      });
    }
    return out;
  });

  // ---------- SNOW ----------
  const SNOW_COUNT = 80;
  const SNOW_FALL_SPEED = 80;
  const SNOW_DRIFT_AMPL = 18;

  type Flake = { cx: number; cy: number; r: number; opacity: number; key: number };
  const flakes = $derived.by<Flake[]>(() => {
    if (!showSnow) return [];
    const out: Flake[] = [];
    for (let i = 0; i < SNOW_COUNT; i++) {
      const seed = i * 11;
      const x0 = (seed * 31) % w;
      const drift = Math.sin((t + seed * 0.3) * 0.5) * SNOW_DRIFT_AMPL;
      const y0 = ((seed * 47 + t * SNOW_FALL_SPEED) % (h + 40)) - 20;
      out.push({
        cx: x0 + drift,
        cy: y0,
        r: 0.8 + (seed % 3) * 0.3,
        opacity: 0.65 + (seed % 4) * 0.08,
        key: i
      });
    }
    return out;
  });

  // Snow blanket — wobbly path along the ground line.
  const snowBlanketD = $derived.by(() => {
    if (!showSnow) return '';
    const segments: string[] = [`M 0 ${groundY + 2}`];
    for (let i = 0; i < 60; i++) {
      const x = (i / 60) * w;
      const wobble = Math.sin(i * 1.7) * 0.5;
      segments.push(`L ${x} ${groundY + 1 + wobble}`);
    }
    segments.push(`L ${w} ${groundY + 4}`);
    segments.push(`L 0 ${groundY + 4} Z`);
    return segments.join(' ');
  });

  // ---------- LIGHTNING ----------
  // Flash every ~6 seconds for ~0.06s with a sub-flash inside that.
  const lightningPeriod = 6;
  const lightningCycle = $derived((t % lightningPeriod) / lightningPeriod);
  const isFlashing = $derived(showLightning && lightningCycle > 0.92 && lightningCycle < 0.98);
  const isSubFlash = $derived(showLightning && lightningCycle > 0.95 && lightningCycle < 0.96);

  // Bolt path origin — wanders horizontally over time.
  const boltStartX = $derived(w * 0.3 + Math.sin(t) * w * 0.4);
  const boltD = $derived(
    `M ${boltStartX} 0
     L ${boltStartX - 8} 60
     L ${boltStartX + 4} 70
     L ${boltStartX - 12} 130
     L ${boltStartX - 4} 140
     L ${boltStartX - 18} 180`
  );
</script>

<g>
  {#if showRain}
    {#each drops as d (d.key)}
      <line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2}
            stroke="#b8c8d8" stroke-width={RAIN_STROKE} opacity={RAIN_OPACITY} />
    {/each}
    {#each splashes as s (s.key)}
      <ellipse cx={s.cx} cy={s.cy} rx="1.2" ry="0.4"
               fill="#b8c8d8" opacity="0.6" />
    {/each}
  {/if}

  {#if showSnow}
    {#each flakes as f (f.key)}
      <circle cx={f.cx} cy={f.cy} r={f.r} fill="#f8f8ff" opacity={f.opacity} />
    {/each}
    <path d={snowBlanketD} fill="#f0f4f8" opacity="0.85" />
  {/if}

  {#if isFlashing}
    <rect x="0" y="0" width={w} height={h} fill="#fff" opacity={isSubFlash ? 0.4 : 0.18} />
    <path d={boltD} stroke="#fff" stroke-width="2.5" fill="none"
          stroke-linejoin="miter" opacity="0.95" />
    <path d={boltD} stroke="#e8e0ff" stroke-width="0.8" fill="none" />
  {/if}
</g>
