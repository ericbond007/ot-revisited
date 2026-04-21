import type { Terrain } from '../types';

export interface Landmark {
  id: string;
  name: string;
  milesFromPrevious: number;
  terrain: Terrain;
  kind: 'start' | 'trading_post' | 'landmark' | 'river' | 'end';
}

export const LANDMARKS: readonly Landmark[] = [
  { id: 'independence', name: 'Independence, MO', milesFromPrevious: 0, terrain: 'prairie', kind: 'start' },
  { id: 'ft_kearny', name: 'Fort Kearny', milesFromPrevious: 300, terrain: 'prairie', kind: 'trading_post' },
  { id: 'chimney_rock', name: 'Chimney Rock', milesFromPrevious: 250, terrain: 'prairie', kind: 'landmark' }
];

export function getLandmark(id: string): Landmark {
  const found = LANDMARKS.find((l) => l.id === id);
  if (!found) throw new Error(`Unknown landmark: ${id}`);
  return found;
}

export function nextLandmarkAfter(id: string): Landmark | null {
  const idx = LANDMARKS.findIndex((l) => l.id === id);
  if (idx < 0 || idx >= LANDMARKS.length - 1) return null;
  return LANDMARKS[idx + 1];
}
