// Lookup table mirroring the WAGON_MODELS object in the original
// wagon-svg.jsx — maps the repo's wagon-model ids to the right Svelte
// component plus the addon defaults the brief committed to.
//
// `defaultKegs` is bound to the wagon model rather than to inventory:
// bigger wagon = bigger keg complement (light=1 small, prairie=2,
// heavy=2 large). `defaultCoop` is the chicken cap from
// content/wagons.ts — kept here as a render hint.

import type { Component } from 'svelte';
import type { WagonModelId } from '$lib/game/content/wagons';
import LightWagon from './LightWagon.svelte';
import PrairieSchooner from './PrairieSchooner.svelte';
import HeavyFreighter from './HeavyFreighter.svelte';
import type { WagonAddons } from './wagon-tokens';

export interface WagonRender {
  Component: Component<{
    angle?: number;
    bounce?: number;
    health?: number;
    addons?: WagonAddons;
  }>;
  defaultKegs: number;
  defaultCoop: number;
}

export const WAGON_RENDER: Record<WagonModelId, WagonRender> = {
  light: { Component: LightWagon, defaultKegs: 1, defaultCoop: 3 },
  prairie_schooner: { Component: PrairieSchooner, defaultKegs: 2, defaultCoop: 5 },
  heavy: { Component: HeavyFreighter, defaultKegs: 2, defaultCoop: 8 }
};

export { LightWagon, PrairieSchooner, HeavyFreighter };
export { default as HistoricalWheel } from './HistoricalWheel.svelte';
export { default as PlankBed } from './PlankBed.svelte';
export { default as CanvasTop } from './CanvasTop.svelte';
export { default as Driver } from './Driver.svelte';
export { default as WaterKeg } from './WaterKeg.svelte';
export { default as ChickenCoop } from './ChickenCoop.svelte';
export type { WagonAddons, WagonDamage } from './wagon-tokens';
export { healthToDamage } from './wagon-tokens';
