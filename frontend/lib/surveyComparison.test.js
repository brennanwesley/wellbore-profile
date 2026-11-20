import { describe, expect, it } from "vitest";
import {
  buildSharedFrame,
  filterStationsByMdWindow,
  getMdRange,
  mergeMdRanges,
  resolveMdWindow,
  sortStationsByMd,
} from "./surveyComparison";

const drilling = [
  { md: 0, tvd: 0, x: 0, y: 0 },
  { md: 100, tvd: 100, x: 1, y: 2 },
  { md: 200, tvd: 199, x: 3, y: 5 },
  { md: 1000, tvd: 900, x: 300, y: 400 },
];

const gyro = [
  { md: 0, tvd: 0, x: 0, y: 0 },
  { md: 10, tvd: 10, x: 0.2, y: 0.1 },
  { md: 20, tvd: 20, x: -0.5, y: 0.4 },
  { md: 150, tvd: 149, x: 2, y: 3 },
];

describe("survey comparison MD window", () => {
  it("sorts stations by MD and drops stations without MD or TVD", () => {
    const sorted = sortStationsByMd([{ md: 20, tvd: 20 }, { md: 10, tvd: 10 }, { md: null, tvd: 5 }, { md: 5, tvd: null }]);
    expect(sorted.map((point) => point.md)).toEqual([10, 20]);
  });

  it("merges both survey ranges so the window can extend beyond gyro coverage", () => {
    const bounds = mergeMdRanges(getMdRange(drilling), getMdRange(gyro));
    expect(bounds).toEqual({ minMd: 0, maxMd: 1000 });

    const mdWindow = resolveMdWindow({ startInput: "100", endInput: "900", bounds });
    expect(mdWindow).toMatchObject({ isValid: true, start: 100, end: 900 });
    expect(filterStationsByMdWindow(drilling, mdWindow).map((point) => point.md)).toEqual([100, 200]);
    expect(filterStationsByMdWindow(gyro, mdWindow).map((point) => point.md)).toEqual([150]);
  });

  it("orders reversed inputs, clamps to loaded data, and rejects empty windows", () => {
    const bounds = { minMd: 0, maxMd: 1000 };

    expect(resolveMdWindow({ startInput: "1500", endInput: "-50", bounds })).toMatchObject({ isValid: true, start: 0, end: 1000 });
    expect(resolveMdWindow({ startInput: "2000", endInput: "3000", bounds }).isValid).toBe(false);
    expect(resolveMdWindow({ startInput: "abc", endInput: "100", bounds }).isValid).toBe(false);
    expect(resolveMdWindow({ startInput: "0", endInput: "100", bounds: null }).isValid).toBe(false);
  });
});

describe("survey comparison shared frame", () => {
  it("spans every renderable survey without shifting either trajectory", () => {
    expect(buildSharedFrame([drilling, gyro])).toEqual({
      minX: -0.5,
      maxX: 300,
      minY: 0,
      maxY: 400,
      minTvd: 0,
      maxTvd: 900,
    });
  });

  it("ignores surveys that have fewer than two stations in the window", () => {
    expect(buildSharedFrame([drilling.slice(0, 2), [gyro[3]]])).toEqual({
      minX: 0,
      maxX: 1,
      minY: 0,
      maxY: 2,
      minTvd: 0,
      maxTvd: 100,
    });
    expect(buildSharedFrame([[], [gyro[0]]])).toBeNull();
  });
});
