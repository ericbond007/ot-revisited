import type { GameState } from '../types';

// Lightweight grudge tracker keyed by sorted pair of member ids. Used
// by personal events (#129) — high grudge between two members raises
// the chance of conflict events firing and lowers the chance of bond
// events. Resets nothing; reconciliation events bring grudges down.

function pairKey(idA: string, idB: string): string {
  return idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`;
}

function readGrudges(state: GameState): Record<string, number> {
  return (state.flags._grudges as Record<string, number> | undefined) ?? {};
}

function writeGrudges(state: GameState, map: Record<string, number>): GameState {
  return { ...state, flags: { ...state.flags, _grudges: map } };
}

export function getGrudge(state: GameState, idA: string, idB: string): number {
  return readGrudges(state)[pairKey(idA, idB)] ?? 0;
}

export function adjustGrudge(
  state: GameState,
  idA: string,
  idB: string,
  delta: number
): GameState {
  if (delta === 0 || idA === idB) return state;
  const map = readGrudges(state);
  const key = pairKey(idA, idB);
  const next = Math.max(0, Math.min(100, (map[key] ?? 0) + delta));
  if (next === 0) {
    const { [key]: _drop, ...rest } = map;
    void _drop;
    return writeGrudges(state, rest);
  }
  return writeGrudges(state, { ...map, [key]: next });
}

/** All currently-tracked pairs with positive grudge, sorted descending. */
export function activeGrudges(state: GameState): Array<{ idA: string; idB: string; level: number }> {
  const map = readGrudges(state);
  return Object.entries(map)
    .map(([key, level]) => {
      const [idA, idB] = key.split('|');
      return { idA, idB, level };
    })
    .sort((a, b) => b.level - a.level);
}

/** True if any tracked pair (whose members are still alive) has grudge >= threshold. */
export function hasFestering(state: GameState, threshold: number): boolean {
  const alive = new Set(state.party.filter((m) => !m.dead).map((m) => m.id));
  return activeGrudges(state).some(
    (g) => g.level >= threshold && alive.has(g.idA) && alive.has(g.idB)
  );
}
