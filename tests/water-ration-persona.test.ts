import { describe, it, expect } from "vitest";
import { balancedPersona, cautiousPersona, chaosPersona } from "../src/lib/game/ai/personas";
import type { GameState } from "../src/lib/game/types";

function st(water: number, terrain = "desert"): GameState {
  return {
    waterRation: "normal", morale: 70,
    resources: { water, waterCap: 200 },
    party: Array.from({ length: 4 }, (_, i) => ({ id: `a${i}`, kind: "adult", dead: false, health: 90, conditions: [] })),
    location: { terrain, milesTraveled: 1400, atLandmarkId: null, nextLandmarkId: "ft_boise", previousLandmarkId: "ft_hall" },
    weather: "clear", date: { year: 1849, month: 7, day: 15 }, pace: "moderate", flags: {}
  } as unknown as GameState;
}

describe("pickWaterRation", () => {
  it("normal when not in desert (no dry stretch ahead)", () => {
    // Non-desert terrain: projectedDryDaysToNextWater = 0, always normal.
    expect(balancedPersona.pickWaterRation(st(5, "prairie"), {} as never)).toBe("normal");
  });
  it("rations down as the keg shrinks against a dry stretch", () => {
    // desert at mile 1400 has a long dry gap; 3 gallons won't cover it.
    const low = balancedPersona.pickWaterRation(st(3, "desert"), {} as never);
    expect(["conserve", "drycamp"]).toContain(low);
  });
  it("chaos ignores it (always normal)", () => {
    expect(chaosPersona.pickWaterRation(st(1, "desert"), {} as never)).toBe("normal");
  });
  it("cautious rations on the desert (safetyFactor path)", () => {
    // cautious multiplies projected dry-days by its 1.5 safetyFactor, so it
    // rations at least as eagerly as balanced on a dry leg.
    expect(["conserve", "drycamp"]).toContain(cautiousPersona.pickWaterRation(st(3, "desert"), {} as never));
  });
});
