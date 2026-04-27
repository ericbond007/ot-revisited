// Display metadata per Weather state — pretty label + tooltip
// summarizing the in-game effects. Numbers mirror the multipliers in
// `systems/weather.ts` (and `systems/fire.ts` for wet-firewood gather);
// keep this map and those systems in sync.

import type { Weather } from '$lib/game/types';
import { ICON } from './icon-dictionary';

export interface WeatherInfo {
  icon: string;
  label: string;
  tooltip: string;
}

export const WEATHER_INFO: Record<Weather, WeatherInfo> = {
  clear: {
    icon: ICON.weather_states.clear,
    label: 'CLEAR',
    tooltip: 'Bright and dry. Full travel speed; no penalty.'
  },
  overcast: {
    icon: ICON.weather_states.overcast,
    label: 'OVERCAST',
    tooltip: 'Cool and grey. Full travel speed; ~10% less water lost.'
  },
  rain: {
    icon: ICON.weather_states.rain,
    label: 'RAIN',
    tooltip:
      'Travel ×0.85. Light water refill (~3 gal in the canvas). Wet firewood gather ×0.5.'
  },
  storm: {
    icon: ICON.weather_states.storm,
    label: 'STORM',
    tooltip:
      'Travel ×0.5. Wagon-damage risk. Morale hit. Firewood gather ×0.2.'
  },
  snow: {
    icon: ICON.weather_states.snow,
    label: 'SNOW',
    tooltip:
      'Travel ×0.6 (mountains may halt entirely). Firewood gather ×0.6.'
  },
  heat: {
    icon: ICON.weather_states.heat,
    label: 'HEAT',
    tooltip: 'Travel ×0.85. Water consumption doubled — drink up.'
  },
  fog: {
    icon: ICON.weather_states.fog,
    label: 'FOG',
    tooltip: 'Travel ×0.85. Easy to wander off-trail.'
  },
  frost: {
    icon: ICON.weather_states.frost,
    label: 'FROST',
    tooltip: 'Cold morning. Slight morale hit; minor travel slowdown.'
  }
};

/** Lookup with a graceful fallback for legacy saves where weather is
 *  undefined (pre-#153). */
export function weatherInfo(w: Weather | undefined): WeatherInfo {
  return WEATHER_INFO[w ?? 'clear'];
}
