import { describe, expect, it } from "vitest";
import { DLS_CATEGORY, classifyDls, parseDlsThresholds, summarizeDls } from "./dlsThresholds";

describe("DLS threshold validation", () => {
  it("accepts numeric thresholds when red is greater than yellow", () => {
    expect(parseDlsThresholds("5", "3")).toMatchObject({ isValid: true, red: 5, yellow: 3 });
  });

  it("rejects red thresholds that do not exceed yellow", () => {
    expect(parseDlsThresholds("3", "3").isValid).toBe(false);
    expect(parseDlsThresholds("2", "3").message).toContain("greater than yellow");
  });

  it("rejects blank, non-numeric, and negative thresholds", () => {
    expect(parseDlsThresholds("", "3").isValid).toBe(false);
    expect(parseDlsThresholds("abc", "3").isValid).toBe(false);
    expect(parseDlsThresholds("5", "-1").isValid).toBe(false);
  });
});

describe("DLS station classification", () => {
  const thresholds = parseDlsThresholds("5", "3");

  it("gives red precedence and uses strict greater-than boundaries", () => {
    expect(classifyDls(5.01, thresholds)).toBe(DLS_CATEGORY.HIGH);
    expect(classifyDls(5, thresholds)).toBe(DLS_CATEGORY.WARNING);
    expect(classifyDls(3.01, thresholds)).toBe(DLS_CATEGORY.WARNING);
    expect(classifyDls(3, thresholds)).toBe(DLS_CATEGORY.NORMAL);
    expect(classifyDls(0, thresholds)).toBe(DLS_CATEGORY.NORMAL);
  });

  it("keeps stations without imported DLS neutral instead of inventing a value", () => {
    expect(classifyDls(null, thresholds)).toBe(DLS_CATEGORY.NO_DATA);
    expect(classifyDls(undefined, thresholds)).toBe(DLS_CATEGORY.NO_DATA);
    expect(classifyDls(Number.NaN, thresholds)).toBe(DLS_CATEGORY.NO_DATA);
  });

  it("pauses highlighting when thresholds are invalid", () => {
    expect(classifyDls(12, parseDlsThresholds("2", "3"))).toBe(DLS_CATEGORY.NORMAL);
  });

  it("summarizes category counts and the maximum imported DLS", () => {
    const points = [
      { md: 100, dls: null },
      { md: 200, dls: 1.2 },
      { md: 300, dls: 4 },
      { md: 400, dls: 7.5 },
      { md: 500, dls: 6 },
    ];

    expect(summarizeDls(points, thresholds)).toEqual({
      high: 2,
      warning: 1,
      normal: 1,
      noData: 1,
      maxDls: { value: 7.5, md: 400 },
    });
  });
});
