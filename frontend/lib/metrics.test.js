import { describe, expect, it } from "vitest";
import { calculateKpiMetrics } from "./metrics";

describe("kpi metrics", () => {
  it("calculates core trajectory KPI metrics", () => {
    const points = [
      { md: 1000, tvd: 8500, northing: 0, easting: 0 },
      { md: 1500, tvd: 8600, northing: 300, easting: 400 },
      { md: 2000, tvd: 8700, northing: 600, easting: 800 },
    ];

    const metrics = calculateKpiMetrics(points);

    expect(metrics.pointCount).toBe(3);
    expect(metrics.totalMd).toBe(1000);
    expect(metrics.maxTvd).toBe(8700);
    expect(metrics.totalHorizontalDisplacement).toBeCloseTo(1000, 6);
    expect(metrics.approximateLateralLength).toBeCloseTo(1000, 6);
    expect(metrics.inZoneLateralLength).toBe(0);
    expect(metrics.inZonePercentage).toBe(0);
  });

  it("calculates in-zone lateral length and in-zone percentage", () => {
    const points = [
      { md: 1000, tvd: 8300, northing: 0, easting: 0 },
      { md: 1200, tvd: 8450, northing: 200, easting: 0 },
      { md: 1400, tvd: 8550, northing: 400, easting: 0 },
      { md: 1600, tvd: 9000, northing: 600, easting: 0 },
    ];

    const metrics = calculateKpiMetrics(points, { top: 8400, bottom: 8600 });

    expect(metrics.approximateLateralLength).toBeCloseTo(600, 6);
    expect(metrics.inZoneLateralLength).toBeCloseTo(200, 6);
    expect(metrics.inZonePercentage).toBeCloseTo((200 / 600) * 100, 6);
  });

  it("returns zeroed metrics for fewer than two valid points", () => {
    const metrics = calculateKpiMetrics([{ md: 1000, tvd: 8000, northing: 0, easting: 0 }]);

    expect(metrics).toMatchObject({
      totalMd: 0,
      maxTvd: 0,
      totalHorizontalDisplacement: 0,
      approximateLateralLength: 0,
      inZoneLateralLength: 0,
      inZonePercentage: 0,
      pointCount: 1,
    });
  });
});
