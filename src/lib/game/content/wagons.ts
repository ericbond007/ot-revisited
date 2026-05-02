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
  // Base water-carrying capacity in gallons, reflecting how many wooden
  // kegs / casks can strap to the wagon. Historically: light ~10 gal
  // (one small keg), prairie schooner ~20 gal (one or two kegs),
  // heavy Conestoga ~30 gal (a full shanty barrel). Water skins stack
  // +5 gal each on top of this baseline.
  baseWaterCapGal: number;
  // How many live chickens fit in a coop strapped to this wagon.
  // Represents the physical coop footprint, not a food-weight cap.
  chickenCap: number;
  // Yokes needed to hitch the full optimal team (one yoke per pair of
  // oxen). Without this many yokes in inventory the surplus oxen go
  // unhitched and don't contribute to pulling speed. (#107)
  requiredYokes: number;
  // Per-model bonuses added on top of BASE_KIT in buildStarterKit.
  // Heavy wagons get extra spares to reflect higher break rates;
  // light wagons get nothing extra. (#107)
  starterSpares?: Record<string, number>;
  // Bran-fill bacon barrel ships with the wagon by default? (#264)
  // Light wagons skip it (no room in the bed); the player can buy
  // the upgrade at outfit. Schooner + heavy include it.
  shipsWithBranBarrel?: boolean;
}

/** Outfit-screen upgrade price for adding a bran barrel to a light
 *  wagon at Independence. ($4 — a barrel + the bran fill, period rate.) */
export const BRAN_BARREL_UPGRADE_PRICE = 4;

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
    minTeam: 1,
    baseWaterCapGal: 15,
    chickenCap: 3,
    requiredYokes: 1
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
    minTeam: 2,
    baseWaterCapGal: 20,
    chickenCap: 5,
    requiredYokes: 2,
    shipsWithBranBarrel: true
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
    minTeam: 4,
    baseWaterCapGal: 25,
    chickenCap: 8,
    requiredYokes: 3,
    // Heavy wagons break parts more often. Extra spares reflect that
    // an outfit big enough to load a household into would also pack
    // contingency parts for the haul.
    starterSpares: { wheel: 1, spare_plank: 2 },
    shipsWithBranBarrel: true
  }
};

export function getWagon(id: WagonModelId): WagonModel {
  const w = WAGONS[id];
  if (!w) throw new Error(`Unknown wagon model: ${id}`);
  return w;
}

export const DEFAULT_WAGON_MODEL: WagonModelId = 'prairie_schooner';
