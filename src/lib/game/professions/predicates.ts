import type { GameState, PartyMember, ProfessionId } from '../types';

// `aliveOf` / `hasLive` only need a `party` field — keeping the
// argument structurally typed lets the same predicate work on
// player `GameState` and on `NpcWagonState` (#280a) without any
// coupling.
export function aliveOf(state: { party: PartyMember[] }, id: ProfessionId): PartyMember[] {
  return state.party.filter((m) => !m.dead && m.profession === id);
}

export function hasLive(state: { party: PartyMember[] }, id: ProfessionId): boolean {
  return aliveOf(state, id).length > 0;
}

export const hasLiveBanker = (s: GameState) => hasLive(s, 'banker');
export const hasLiveFarmer = (s: GameState) => hasLive(s, 'farmer');
export const hasLiveCarpenter = (s: GameState) => hasLive(s, 'carpenter');
export const hasLiveDoctor = (s: GameState) => hasLive(s, 'doctor');
export const hasLiveBlacksmith = (s: GameState) => hasLive(s, 'blacksmith');
export const hasLiveHunter = (s: GameState) => hasLive(s, 'hunter');
export const hasLiveTeamster = (s: GameState) => hasLive(s, 'teamster');
export const hasLiveMerchant = (s: GameState) => hasLive(s, 'merchant');
export const hasLiveWhore = (s: GameState) => hasLive(s, 'whore');
export const hasLiveScout = (s: GameState) => hasLive(s, 'scout');
export const hasLivePreacher = (s: GameState) => hasLive(s, 'preacher');
export const hasLiveIndianTrader = (s: GameState) => hasLive(s, 'indian_trader');
export const hasLiveGunsmith = (s: GameState) => hasLive(s, 'gunsmith');
export const hasLiveTeacher = (s: GameState) => hasLive(s, 'teacher');
export const hasLiveLawyer = (s: GameState) => hasLive(s, 'lawyer');
