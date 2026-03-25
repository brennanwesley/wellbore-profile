import { describe, expect, it } from "vitest";
import { buildDsuSurfaceLayout, DSU_PROXIMITY_WARNING_FT } from "./dsuSpatial";

describe("buildDsuSurfaceLayout", () => {
  it("positions ready wells relative to the first valid surface location", () => {
    const layout = buildDsuSurfaceLayout([
      {
        id: "well-a",
        name: "Well A",
        latitude: 31,
        longitude: -102,
        points: [{ x: 0, y: 0, z: 0 }, { x: 10, y: 20, z: 30 }],
      },
      {
        id: "well-b",
        name: "Well B",
        latitude: 31.001,
        longitude: -102.002,
        points: [{ x: 0, y: 0, z: 0 }, { x: 15, y: 25, z: 35 }],
      },
      {
        id: "well-c",
        name: "Well C",
        latitude: "",
        longitude: -102.005,
        points: [{ x: 0, y: 0, z: 0 }, { x: 8, y: 11, z: 14 }],
      },
    ]);

    expect(layout.readyWells).toHaveLength(2);
    expect(layout.readyWells[0].surfaceOffsetNorthingFt).toBeCloseTo(0, 5);
    expect(layout.readyWells[0].surfaceOffsetEastingFt).toBeCloseTo(0, 5);
    expect(layout.readyWells[1].surfaceOffsetNorthingFt).toBeCloseTo(364, 0);
    expect(layout.readyWells[1].surfaceOffsetEastingFt).toBeLessThan(-600);
    expect(layout.shouldWarnWideSpacing).toBe(false);
  });

  it("flags wells that are spaced far apart on the surface", () => {
    const layout = buildDsuSurfaceLayout([
      {
        id: "well-a",
        name: "Well A",
        latitude: 31,
        longitude: -102,
        points: [{ x: 0, y: 0, z: 0 }, { x: 10, y: 20, z: 30 }],
      },
      {
        id: "well-b",
        name: "Well B",
        latitude: 31,
        longitude: -101.95,
        points: [{ x: 0, y: 0, z: 0 }, { x: 10, y: 20, z: 30 }],
      },
    ]);

    expect(layout.maxSurfaceSeparationFt).toBeGreaterThan(DSU_PROXIMITY_WARNING_FT);
    expect(layout.shouldWarnWideSpacing).toBe(true);
    expect(layout.farthestPair).toMatchObject({
      firstWellName: "Well A",
      secondWellName: "Well B",
    });
  });
});
