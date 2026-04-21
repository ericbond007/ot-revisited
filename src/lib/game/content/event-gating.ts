import type { GameState } from '../types';

export function yearBetween(min: number, maxInclusive: number): (s: GameState) => boolean {
  return (s) => s.date.year >= min && s.date.year <= maxInclusive;
}

export function yearAtLeast(min: number): (s: GameState) => boolean {
  return (s) => s.date.year >= min;
}

export function monthIs(...months: number[]): (s: GameState) => boolean {
  return (s) => months.includes(s.date.month);
}

export function inTerrain(...terrain: GameState['location']['terrain'][]): (s: GameState) => boolean {
  return (s) => terrain.includes(s.location.terrain);
}

export function hasFlag(flag: string): (s: GameState) => boolean {
  return (s) => !!s.flags[flag];
}

export function and(...gates: Array<(s: GameState) => boolean>): (s: GameState) => boolean {
  return (s) => gates.every((g) => g(s));
}

export function or(...gates: Array<(s: GameState) => boolean>): (s: GameState) => boolean {
  return (s) => gates.some((g) => g(s));
}
