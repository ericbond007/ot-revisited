// Wagon catalog. Every game state carries a wagon.model id that points
// into WAGONS. Upgrade.ts maps pre-wagon-model saves → 'prairie_schooner'.

export type WagonModelId = 'light' | 'prairie_schooner' | 'heavy';

export interface WagonModel {
  id: WagonModelId;
  name: string;
  shortName: string;
  description: string;
  // Price at Independence. Reflected in BASE_KIT cash (schooner is pre-paid;
  // Light refunds the difference; Heavy costs extra).
  price: number;
  carryCapacity: number; // lb
  // Speed multiplier applied on top of pace / terrain / team factor.
  baseSpeedMult: number;
  // Team sizing. optimalTeam is the count the wagon is designed for; below
  // minTeam the wagon can't move at all.
  optimalTeam: number;
  minTeam: number;
}

export const WAGONS: Record<WagonModelId, WagonModel> = {
  light: {
    id: 'light',
    name: 'Light wagon',
    shortName: 'Light',
    description:
      "A small farm wagon. Quick over flat ground, easy on a pair of oxen, tight on room. Cheapest option — and the fastest, if you pack light.",
    price: 50,
    carryCapacity: 1500,
    baseSpeedMult: 1.10,
    optimalTeam: 2,
    minTeam: 1
  },
  prairie_schooner: {
    id: 'prairie_schooner',
    name: 'Prairie schooner',
    shortName: 'Prairie',
    description:
      "The classic Oregon Trail wagon. Arched canvas over a 4x10 ft bed, built for the crossing. What most emigrants took.",
    price: 100,
    carryCapacity: 2500,
    baseSpeedMult: 1.00,
    optimalTeam: 4,
    minTeam: 2
  },
  heavy: {
    id: 'heavy',
    name: 'Heavy freighter',
    shortName: 'Heavy',
    description:
      "A freight-class wagon with a Conestoga-style curved bed. Roomy enough to haul a small household; slow and expensive to keep a full team fed. Many owners swapped down at Independence.",
    price: 175,
    carryCapacity: 3500,
    baseSpeedMult: 0.85,
    optimalTeam: 6,
    minTeam: 4
  }
};

export function getWagon(id: WagonModelId): WagonModel {
  const w = WAGONS[id];
  if (!w) throw new Error(`Unknown wagon model: ${id}`);
  return w;
}

export const DEFAULT_WAGON_MODEL: WagonModelId = 'prairie_schooner';
