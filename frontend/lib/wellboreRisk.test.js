import { describe, expect, it } from "vitest";
import {
  RISK_LEVEL,
  analyzeWellboreRisk,
  buildRiskCsv,
  calculateDoglegDeg,
  calculateWindowDls,
  findNativeDlsRuns,
  getDrillingContext,
  parseRiskSettings,
} from "./wellboreRisk";

const settings = parseRiskSettings({ high25: "6", review25: "3", spikeDls: "6", sustainedFt: "15" }).settings;

function buildSurvey({ fromMd = 0, toMd = 600, step = 5, inc = 20, azi = 45, events = {} }) {
  const stations = [];
  let currentInc = inc;
  let currentAzi = azi;

  for (let md = fromMd; md <= toMd; md += step) {
    const event = events[md] ?? {};
    currentInc += event.dInc ?? 0;
    currentAzi += event.dAzi ?? 0;
    stations.push({
      md,
      tvd: md,
      x: 0,
      y: 0,
      inclination: event.inclination ?? currentInc,
      azimuth: event.azimuth ?? currentAzi,
      dls: md === fromMd ? null : event.dls ?? 0.1,
    });
  }

  return stations;
}

function acosDogleg(i1, a1, i2, a2) {
  const rad = Math.PI / 180;
  const cosBeta = Math.cos((i2 - i1) * rad) - Math.sin(i1 * rad) * Math.sin(i2 * rad) * (1 - Math.cos((a2 - a1) * rad));
  return Math.acos(cosBeta) / rad;
}

describe("dogleg calculation", () => {
  it("matches the standard dogleg angle formula", () => {
    expect(calculateDoglegDeg(30, 45, 33, 45)).toBeCloseTo(3, 10);
    expect(calculateDoglegDeg(90, 10, 90, 20)).toBeCloseTo(10, 10);
    expect(calculateDoglegDeg(0, 0, 0, 180)).toBe(0);
    expect(calculateDoglegDeg(10, 40, 12, 50)).toBeCloseTo(acosDogleg(10, 40, 12, 50), 8);
  });
});

describe("25-ft DLS windows", () => {
  it("uses actual station spacing and net curvature between window end stations", () => {
    const stations = buildSurvey({ toMd: 200, events: { 105: { dInc: 1 } } });
    const { windows, gaps } = calculateWindowDls(stations);
    const containing = windows.filter((window) => window.startMd < 105 && window.endMd >= 105);

    expect(gaps).toEqual([]);
    expect(windows.every((window) => window.length === 25)).toBe(true);
    expect(containing.map((window) => window.startMd)).toEqual([80, 85, 90, 95, 100]);
    containing.forEach((window) => expect(window.netDls).toBeCloseTo(4, 8));
  });

  it("extends windows to the next station on coarser spacing and flags gaps over 40 ft", () => {
    const stations = [
      ...buildSurvey({ fromMd: 0, toMd: 100, step: 5 }),
      ...buildSurvey({ fromMd: 115, toMd: 205, step: 15 }),
      ...buildSurvey({ fromMd: 260, toMd: 300, step: 5 }),
    ];
    const { windows, gaps } = calculateWindowDls(stations);

    expect(windows.find((window) => window.startMd === 115).length).toBe(30);
    expect(gaps).toEqual([{ startMd: 205, endMd: 260, length: 55 }]);
  });
});

describe("native DLS runs", () => {
  it("measures run length over the survey courses the native DLS represents", () => {
    const stations = buildSurvey({ toMd: 100, events: { 50: { dls: 8 }, 55: { dls: 9 }, 60: { dls: 7 }, 80: { dls: 6 } } });
    const runs = findNativeDlsRuns(stations, 6);

    expect(runs).toHaveLength(2);
    expect(runs[0]).toMatchObject({ startMd: 45, endMd: 60, length: 15, peakDls: 9, peakMd: 55, stationCount: 3 });
    expect(runs[1]).toMatchObject({ startMd: 75, endMd: 80, length: 5, peakDls: 6 });
  });
});

describe("risk classification", () => {
  it("keeps an isolated native spike at Review when 25-ft DLS stays below the High threshold", () => {
    const stations = buildSurvey({ events: { 305: { dInc: 0.4, dls: 8 } } });
    const analysis = analyzeWellboreRisk({ gyroStations: stations, settings });

    expect(analysis.zones).toHaveLength(1);
    expect(analysis.zones[0].risk).toBe(RISK_LEVEL.REVIEW);
    expect(analysis.zones[0].max25.value).toBeCloseTo(1.6, 6);
    expect(analysis.zones[0].nativePeak).toEqual({ value: 8, md: 305 });
    expect(analysis.zones[0].finding).toContain("Isolated native spike");
  });

  it("raises sustained native DLS of at least 15 ft to High", () => {
    const stations = buildSurvey({ events: { 205: { dls: 8 }, 210: { dls: 8 }, 215: { dls: 8 } } });
    const zone = analyzeWellboreRisk({ gyroStations: stations, settings }).zones[0];

    expect(zone.risk).toBe(RISK_LEVEL.HIGH);
    expect(zone.finding).toContain("Sustained native DLS");
  });

  it("applies inclusive 25-ft DLS boundaries with High taking precedence", () => {
    const riskFor = (dInc) =>
      analyzeWellboreRisk({ gyroStations: buildSurvey({ events: { 305: { dInc } } }), settings }).zones.map((zone) => zone.risk);

    expect(riskFor(1.5)).toEqual([RISK_LEVEL.HIGH]);
    expect(riskFor(1.49)).toEqual([RISK_LEVEL.REVIEW]);
    expect(riskFor(0.75)).toEqual([RISK_LEVEL.REVIEW]);
    expect(riskFor(0.74)).toEqual([]);
  });

  it("applies inclusive native spike and sustained-length boundaries", () => {
    const spikeAt = (dls) => analyzeWellboreRisk({ gyroStations: buildSurvey({ events: { 305: { dls } } }), settings }).zones;
    const twoStations = buildSurvey({ events: { 305: { dls: 7 }, 310: { dls: 7 } } });

    expect(spikeAt(6)).toHaveLength(1);
    expect(spikeAt(5.99)).toHaveLength(0);
    expect(analyzeWellboreRisk({ gyroStations: twoStations, settings }).zones[0].risk).toBe(RISK_LEVEL.REVIEW);
  });

  it("flags direction reversals that reduce net 25-ft DLS while keeping native spikes visible", () => {
    const stations = buildSurvey({ events: { 105: { dInc: 1, dls: 20 }, 110: { dInc: -1, dls: 20 } } });
    const zone = analyzeWellboreRisk({ gyroStations: stations, settings }).zones[0];

    expect(zone.risk).toBe(RISK_LEVEL.REVIEW);
    expect(zone.nativePeak.value).toBe(20);
    expect(zone.finding).toContain("Isolated native spike");
    expect(zone.finding).toContain("Direction reversal");
  });

  it("flags near-vertical azimuth-driven curvature without dismissing it", () => {
    const stations = buildSurvey({ inc: 0.5, azi: 0, events: { 305: { dAzi: 120, dls: 17 } } });
    const zone = analyzeWellboreRisk({ gyroStations: stations, settings }).zones[0];

    expect(zone.risk).toBe(RISK_LEVEL.REVIEW);
    expect(zone.finding).toContain("Azimuth-driven at near-vertical");
  });

  it("does not attribute an inclination-only spike at low inclination to azimuth sensitivity", () => {
    const stations = buildSurvey({ inc: 2, azi: 0, events: { 305: { dInc: 0.4, dls: 8 } } });
    const zone = analyzeWellboreRisk({ gyroStations: stations, settings }).zones[0];

    expect(zone.finding).not.toContain("near-vertical");
  });
});

describe("zone consolidation and sorting", () => {
  it("merges nearby flags, keeps distant flags separate, and sorts High before Review by MD", () => {
    const stations = buildSurvey({
      toMd: 1200,
      events: {
        100: { dls: 8 },
        130: { dls: 8 },
        600: { dls: 8 },
        900: { dls: 8 },
        905: { dls: 8 },
        910: { dls: 8 },
      },
    });
    const { zones } = analyzeWellboreRisk({ gyroStations: stations, settings });

    expect(zones.map((zone) => [zone.risk, zone.startMd, zone.endMd])).toEqual([
      [RISK_LEVEL.HIGH, 895, 910],
      [RISK_LEVEL.REVIEW, 95, 130],
      [RISK_LEVEL.REVIEW, 595, 600],
    ]);
  });
});

describe("missing and insufficient data", () => {
  it("flags gaps and missing directional data as Review instead of treating them as safe", () => {
    const stations = buildSurvey({ toMd: 300 }).map((station) =>
      station.md > 100 && station.md < 160 ? { ...station, inclination: null } : station,
    );
    const analysis = analyzeWellboreRisk({ gyroStations: stations, settings });

    expect(analysis.zones).toHaveLength(1);
    expect(analysis.zones[0]).toMatchObject({ risk: RISK_LEVEL.REVIEW, startMd: 100, endMd: 160 });
    expect(analysis.zones[0].finding).toContain("Not assessed");
    expect(analysis.notes.join(" ")).toContain("missing inclination/azimuth");

    const withDrilling = analyzeWellboreRisk({ gyroStations: stations, drillingStations: [{ md: 0, dls: null }, { md: 200, dls: 0.2 }], settings });
    expect(withDrilling.zones[0].drilling.status).toBe("ok");
    expect(withDrilling.zones[0].finding).not.toContain("drilling");
  });

  it("flags the whole survey when inclination/azimuth are absent or coverage is too short", () => {
    const noDirectional = buildSurvey({ toMd: 200 }).map((station) => ({ ...station, inclination: null, azimuth: null }));
    const short = buildSurvey({ toMd: 20 });

    expect(analyzeWellboreRisk({ gyroStations: noDirectional, settings }).zones[0]).toMatchObject({
      risk: RISK_LEVEL.REVIEW,
      startMd: 0,
      endMd: 200,
    });
    expect(analyzeWellboreRisk({ gyroStations: short, settings }).zones[0].finding).toContain("shorter than 25 ft");
  });

  it("notes unavailable native DLS while still screening calculated 25-ft DLS", () => {
    const stations = buildSurvey({ events: { 305: { dInc: 2 } } }).map((station) => ({ ...station, dls: null }));
    const analysis = analyzeWellboreRisk({ gyroStations: stations, settings });

    expect(analysis.zones[0].risk).toBe(RISK_LEVEL.HIGH);
    expect(analysis.zones[0].nativePeak).toBeNull();
    expect(analysis.notes.join(" ")).toContain("Native gyro DLS not imported");
  });
});

describe("drilling survey context", () => {
  const drilling = [
    { md: 2300, dls: null },
    { md: 2400, dls: 0.4 },
    { md: 2500, dls: 0.6 },
    { md: 2600, dls: 2.1 },
  ];

  it("reports the imported DLS of overlapping drilling courses without interpolating", () => {
    expect(getDrillingContext(drilling, 2410, 2445)).toMatchObject({
      status: "ok",
      maxDls: 0.6,
      courseStartMd: 2400,
      courseEndMd: 2500,
      courseLength: 100,
    });
    expect(getDrillingContext(drilling, 2490, 2510)).toMatchObject({ maxDls: 2.1, courseStartMd: 2500, courseEndMd: 2600 });
    expect(getDrillingContext(drilling, 2700, 2750)).toEqual({ status: "noCoverage" });
    expect(getDrillingContext([], 2400, 2450)).toEqual({ status: "notLoaded" });
    expect(getDrillingContext([{ md: 0, dls: null }, { md: 100, dls: null }], 10, 50).status).toBe("noDls");
  });

  it("does not treat a low coarse drilling DLS as proof of smoothness", () => {
    const gyro = buildSurvey({ fromMd: 2300, toMd: 2600, events: { 2410: { dInc: 2, dls: 40 } } });
    const zone = analyzeWellboreRisk({ gyroStations: gyro, drillingStations: drilling, settings }).zones[0];

    expect(zone.risk).toBe(RISK_LEVEL.HIGH);
    expect(zone.finding).toContain("Not evident in 100-ft drilling course");
  });
});

describe("risk CSV export", () => {
  it("exports zones with source labels and escapes text", () => {
    const stations = buildSurvey({ events: { 305: { dInc: 0.4, dls: 8 } } });
    const analysis = analyzeWellboreRisk({ gyroStations: stations, settings });
    const csv = buildRiskCsv({ analysis, settings, gyroLabel: 'gyro "run 2", final.csv' });
    const lines = csv.trim().split("\r\n");

    expect(lines[1]).toBe('Gyro survey,"gyro ""run 2"", final.csv"');
    expect(lines).toContain(
      "Zone,Risk,MD Start (ft),MD End (ft),Length (ft),Peak Gyro DLS - imported (deg/100ft),Peak Gyro DLS MD (ft),Max 25-ft DLS - calculated (deg/100ft),25-ft Window Start (ft),25-ft Window End (ft),Drilling DLS - imported (deg/100ft),Drilling Course Start (ft),Drilling Course End (ft),Drilling Status,Finding",
    );
    expect(lines[lines.length - 1]).toMatch(/^1,Review,300,305,5,8\.00,305,1\.60,/);
  });
});
