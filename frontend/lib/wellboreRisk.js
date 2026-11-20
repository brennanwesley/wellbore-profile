export const RISK_LEVEL = {
  HIGH: "high",
  REVIEW: "review",
};

export const RISK_WINDOW_FT = 25;
export const MAX_WINDOW_FT = 40;
export const WINDOW_TOLERANCE_FT = 0.5;
export const MERGE_GAP_FT = 25;
export const NEAR_VERTICAL_INC_DEG = 5;
export const REVERSAL_RATIO = 2;
const EPSILON = 1e-9;

export const DEFAULT_RISK_SETTING_INPUTS = {
  high25: "6",
  review25: "3",
  spikeDls: "6",
  sustainedFt: "15",
};

const DEG = Math.PI / 180;

function toFiniteNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const text = String(value ?? "").trim();

  if (!text) {
    return null;
  }

  const numericValue = Number(text);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatValue(value, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : "";
}

function formatMd(value) {
  return Number.isFinite(value) ? String(round(value, 1)) : "";
}

export function parseRiskSettings(inputs) {
  const settings = {
    high25: toFiniteNumber(inputs?.high25),
    review25: toFiniteNumber(inputs?.review25),
    spikeDls: toFiniteNumber(inputs?.spikeDls),
    sustainedFt: toFiniteNumber(inputs?.sustainedFt),
  };

  if (Object.values(settings).some((value) => value === null)) {
    return { isValid: false, settings, message: "Enter numeric values for every risk screening threshold." };
  }

  if (settings.review25 <= 0 || settings.spikeDls <= 0 || settings.sustainedFt < 0) {
    return { isValid: false, settings, message: "Risk screening thresholds must be positive." };
  }

  if (settings.high25 <= settings.review25) {
    return { isValid: false, settings, message: "High 25-ft DLS must be greater than Review 25-ft DLS." };
  }

  return { isValid: true, settings, message: null };
}

export function calculateDoglegDeg(inc1, azi1, inc2, azi2) {
  const halfInc = ((inc2 - inc1) * DEG) / 2;
  const halfAzi = ((azi2 - azi1) * DEG) / 2;
  const sinSquaredHalfDogleg =
    Math.sin(halfInc) ** 2 + Math.sin(inc1 * DEG) * Math.sin(inc2 * DEG) * Math.sin(halfAzi) ** 2;

  return (2 * Math.asin(Math.min(1, Math.sqrt(Math.max(0, sinSquaredHalfDogleg))))) / DEG;
}

function hasDirectionalData(station) {
  return toFiniteNumber(station?.inclination) !== null && toFiniteNumber(station?.azimuth) !== null;
}

function getNativeDls(station) {
  return toFiniteNumber(station?.dls);
}

export function getSpacingStats(stations) {
  const spacings = [];

  for (let index = 1; index < stations.length; index += 1) {
    const spacing = stations[index].md - stations[index - 1].md;

    if (spacing > 0) {
      spacings.push(spacing);
    }
  }

  if (spacings.length === 0) {
    return null;
  }

  const sorted = [...spacings].sort((left, right) => left - right);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: sorted[Math.floor(sorted.length / 2)],
  };
}

export function calculateWindowDls(stations, { windowFt = RISK_WINDOW_FT, maxWindowFt = MAX_WINDOW_FT } = {}) {
  const directionalStations = stations.filter(hasDirectionalData);
  const courseDoglegs = [];

  for (let index = 1; index < directionalStations.length; index += 1) {
    const previous = directionalStations[index - 1];
    const current = directionalStations[index];
    courseDoglegs.push(
      current.md > previous.md
        ? calculateDoglegDeg(previous.inclination, previous.azimuth, current.inclination, current.azimuth)
        : 0,
    );
  }

  const windows = [];
  const gaps = [];

  for (let index = 1; index < directionalStations.length; index += 1) {
    const length = directionalStations[index].md - directionalStations[index - 1].md;

    if (length > maxWindowFt) {
      gaps.push({ startMd: directionalStations[index - 1].md, endMd: directionalStations[index].md, length });
    }
  }

  for (let startIndex = 0; startIndex < directionalStations.length - 1; startIndex += 1) {
    const start = directionalStations[startIndex];
    let endIndex = startIndex + 1;

    while (
      endIndex < directionalStations.length &&
      directionalStations[endIndex].md - start.md < windowFt - WINDOW_TOLERANCE_FT
    ) {
      endIndex += 1;
    }

    if (endIndex >= directionalStations.length) {
      break;
    }

    const end = directionalStations[endIndex];
    const length = end.md - start.md;

    if (length > maxWindowFt) {
      continue;
    }

    const netDogleg = calculateDoglegDeg(start.inclination, start.azimuth, end.inclination, end.azimuth);
    const cumulativeDogleg = courseDoglegs.slice(startIndex, endIndex).reduce((sum, value) => sum + value, 0);
    const inclinations = directionalStations.slice(startIndex, endIndex + 1).map((station) => station.inclination);

    windows.push({
      startMd: start.md,
      endMd: end.md,
      length,
      netDls: (netDogleg * 100) / length,
      cumulativeDls: (cumulativeDogleg * 100) / length,
      maxInclination: Math.max(...inclinations),
    });
  }

  return {
    windows,
    gaps,
    directionalStationCount: directionalStations.length,
    missingDirectionalCount: stations.length - directionalStations.length,
  };
}

export function findNativeDlsRuns(stations, thresholdDls) {
  const runs = [];
  let activeRun = null;

  stations.forEach((station, index) => {
    const dls = getNativeDls(station);

    if (dls === null || dls < thresholdDls - EPSILON) {
      activeRun = null;
      return;
    }

    if (!activeRun) {
      activeRun = {
        startMd: index > 0 ? stations[index - 1].md : station.md,
        endMd: station.md,
        peakDls: dls,
        peakMd: station.md,
        stationCount: 0,
      };
      runs.push(activeRun);
    }

    activeRun.endMd = station.md;
    activeRun.stationCount += 1;

    if (dls > activeRun.peakDls) {
      activeRun.peakDls = dls;
      activeRun.peakMd = station.md;
    }
  });

  return runs.map((run) => ({ ...run, length: run.endMd - run.startMd }));
}

export function getDrillingContext(drillingStations, startMd, endMd) {
  if (!Array.isArray(drillingStations) || drillingStations.length === 0) {
    return { status: "notLoaded" };
  }

  const courses = [];

  for (let index = 1; index < drillingStations.length; index += 1) {
    const courseStart = drillingStations[index - 1].md;
    const courseEnd = drillingStations[index].md;

    if (courseEnd > courseStart && courseStart < endMd && courseEnd > startMd) {
      courses.push({ startMd: courseStart, endMd: courseEnd, length: courseEnd - courseStart, dls: getNativeDls(drillingStations[index]) });
    }
  }

  if (courses.length === 0) {
    return { status: "noCoverage" };
  }

  const withDls = courses.filter((course) => course.dls !== null);

  if (withDls.length === 0) {
    return { status: "noDls", courseStartMd: courses[0].startMd, courseEndMd: courses[courses.length - 1].endMd };
  }

  const peak = withDls.reduce((best, course) => (course.dls > best.dls ? course : best), withDls[0]);

  return {
    status: "ok",
    maxDls: peak.dls,
    courseStartMd: peak.startMd,
    courseEndMd: peak.endMd,
    courseLength: peak.length,
    rangeStartMd: courses[0].startMd,
    rangeEndMd: courses[courses.length - 1].endMd,
  };
}

export function isAzimuthDrivenNearVertical(previous, current, minCourseDls) {
  const length = current.md - previous.md;

  if (!(length > 0) || Math.max(previous.inclination, current.inclination) >= NEAR_VERTICAL_INC_DEG) {
    return false;
  }

  const inclinationTerm = Math.sin(((current.inclination - previous.inclination) * DEG) / 2) ** 2;
  const azimuthTerm =
    Math.sin(previous.inclination * DEG) * Math.sin(current.inclination * DEG) * Math.sin(((current.azimuth - previous.azimuth) * DEG) / 2) ** 2;
  const courseDls = (calculateDoglegDeg(previous.inclination, previous.azimuth, current.inclination, current.azimuth) * 100) / length;

  return azimuthTerm > inclinationTerm && courseDls >= minCourseDls;
}

function overlaps(item, startMd, endMd) {
  return item.startMd < endMd && item.endMd > startMd;
}

function mergeFlags(flags) {
  const sorted = [...flags].sort((left, right) => left.startMd - right.startMd || left.endMd - right.endMd);
  const groups = [];

  sorted.forEach((flag) => {
    const current = groups[groups.length - 1];

    if (current && flag.startMd <= current.endMd + MERGE_GAP_FT) {
      current.endMd = Math.max(current.endMd, flag.endMd);
      current.flags.push(flag);
      return;
    }

    groups.push({ startMd: flag.startMd, endMd: flag.endMd, flags: [flag] });
  });

  return groups;
}

function describeZone(zone, settings) {
  const types = new Set(zone.flags.map((flag) => flag.type));
  const findings = [];
  const sustainedRun = zone.flags
    .filter((flag) => flag.type === "sustained")
    .reduce((best, flag) => (!best || flag.length > best.length ? flag : best), null);
  const longestGap = zone.flags
    .filter((flag) => flag.type === "gap")
    .reduce((best, flag) => (!best || flag.length > best.length ? flag : best), null);

  if (types.has("noDirectional")) {
    findings.push("Not assessed: inclination/azimuth missing");
  }

  if (types.has("short")) {
    findings.push(`Not assessed: survey shorter than ${RISK_WINDOW_FT} ft`);
  }

  if (longestGap) {
    findings.push(`Not assessed: ${formatValue(longestGap.length, 0)}-ft station gap exceeds ${MAX_WINDOW_FT}-ft 25-ft DLS limit`);
  }

  if (types.has("high25")) {
    findings.push(`25-ft DLS ≥ ${formatValue(settings.high25)} (net curvature)`);
  }

  if (sustainedRun) {
    findings.push(`Sustained native DLS ≥ ${formatValue(settings.spikeDls)} over ${formatValue(sustainedRun.length, 0)} ft`);
  }

  if (types.has("review25") && !types.has("high25")) {
    findings.push(`25-ft DLS ${formatValue(settings.review25)}–${formatValue(settings.high25)}`);
  }

  if (types.has("spike") && !sustainedRun) {
    findings.push(`Isolated native spike ≥ ${formatValue(settings.spikeDls)}`);
  }

  if (zone.reversalWindow) {
    findings.push(
      `Direction reversal: cumulative ${formatValue(zone.reversalWindow.cumulativeDls, 1)} vs net ${formatValue(zone.reversalWindow.netDls, 1)} over ${formatValue(zone.reversalWindow.length, 0)} ft`,
    );
  }

  if (zone.nearVertical) {
    findings.push(`Azimuth-driven at near-vertical inc (< ${NEAR_VERTICAL_INC_DEG}°): measurement-sensitive, verify`);
  }

  if (zone.missingNativeCount > 0) {
    findings.push(`Native DLS missing at ${zone.missingNativeCount} station(s)`);
  }

  const hasCurvatureFlag = ["high25", "review25", "sustained", "spike"].some((type) => types.has(type));

  if (zone.drilling.status === "ok" && hasCurvatureFlag) {
    findings.push(
      zone.drilling.maxDls >= settings.review25
        ? "Also elevated in drilling survey"
        : `Not evident in ${formatValue(zone.drilling.courseLength, 0)}-ft drilling course`,
    );
  }

  return findings;
}

export function analyzeWellboreRisk({ gyroStations, drillingStations = [], settings }) {
  const stations = (Array.isArray(gyroStations) ? gyroStations : []).filter((station) => toFiniteNumber(station?.md) !== null);

  if (stations.length === 0) {
    return null;
  }

  const notes = [];
  const screenedRange = { minMd: stations[0].md, maxMd: stations[stations.length - 1].md };
  const spacing = getSpacingStats(stations);
  const nativeDlsCount = stations.filter((station) => getNativeDls(station) !== null).length;
  const { windows, gaps, directionalStationCount, missingDirectionalCount } = calculateWindowDls(stations);
  const flags = [];

  windows.forEach((window) => {
    if (window.netDls >= settings.high25 - EPSILON) {
      flags.push({ ...window, type: "high25", level: RISK_LEVEL.HIGH });
    } else if (window.netDls >= settings.review25 - EPSILON) {
      flags.push({ ...window, type: "review25", level: RISK_LEVEL.REVIEW });
    }
  });

  findNativeDlsRuns(stations, settings.spikeDls).forEach((run) => {
    const isSustained = run.length >= settings.sustainedFt - EPSILON;
    flags.push({ ...run, type: isSustained ? "sustained" : "spike", level: isSustained ? RISK_LEVEL.HIGH : RISK_LEVEL.REVIEW });
  });

  gaps.forEach((gap) => flags.push({ ...gap, type: "gap", level: RISK_LEVEL.REVIEW }));

  if (directionalStationCount < 2 || (windows.length === 0 && gaps.length === 0)) {
    flags.push({
      startMd: screenedRange.minMd,
      endMd: Math.max(screenedRange.maxMd, screenedRange.minMd + 0.1),
      length: screenedRange.maxMd - screenedRange.minMd,
      type: directionalStationCount < 2 ? "noDirectional" : "short",
      level: RISK_LEVEL.REVIEW,
    });
  }

  const zones = mergeFlags(flags).map((group) => {
    const zoneStations = stations.filter((station) => station.md >= group.startMd && station.md <= group.endMd);
    const nativePeak = zoneStations.reduce((best, station) => {
      const dls = getNativeDls(station);
      return dls !== null && (!best || dls > best.value) ? { value: dls, md: station.md } : best;
    }, null);
    const zoneWindows = windows.filter((window) => overlaps(window, group.startMd, group.endMd));
    const max25 = zoneWindows.reduce(
      (best, window) => (!best || window.netDls > best.value ? { value: window.netDls, startMd: window.startMd, endMd: window.endMd } : best),
      null,
    );
    const reversalWindow = zoneWindows
      .filter((window) => window.cumulativeDls >= settings.review25 && window.cumulativeDls >= REVERSAL_RATIO * window.netDls)
      .reduce((best, window) => (!best || window.cumulativeDls > best.cumulativeDls ? window : best), null);
    const zoneDirectional = zoneStations.filter(hasDirectionalData);
    const nearVertical = zoneDirectional.some(
      (station, index) => index > 0 && isAzimuthDrivenNearVertical(zoneDirectional[index - 1], station, settings.review25),
    );
    const zone = {
      id: `${group.startMd}-${group.endMd}`,
      risk: group.flags.some((flag) => flag.level === RISK_LEVEL.HIGH) ? RISK_LEVEL.HIGH : RISK_LEVEL.REVIEW,
      startMd: group.startMd,
      endMd: group.endMd,
      length: group.endMd - group.startMd,
      flags: group.flags,
      nativePeak,
      max25,
      reversalWindow,
      nearVertical,
      missingNativeCount: nativeDlsCount > 0 ? zoneStations.filter((station) => station !== stations[0] && getNativeDls(station) === null).length : 0,
      drilling: getDrillingContext(drillingStations, group.startMd, group.endMd),
    };

    zone.findings = describeZone(zone, settings);
    zone.finding = zone.findings.join("; ");
    return zone;
  });

  zones.sort((left, right) => {
    if (left.risk !== right.risk) {
      return left.risk === RISK_LEVEL.HIGH ? -1 : 1;
    }

    return left.startMd - right.startMd;
  });

  if (spacing) {
    notes.push(
      `Gyro screened MD ${formatMd(screenedRange.minMd)}–${formatMd(screenedRange.maxMd)} ft: ${stations.length} stations, spacing ${formatValue(spacing.min, 0)}–${formatValue(spacing.max, 0)} ft (median ${formatValue(spacing.median, 0)} ft).`,
    );

    if (spacing.max > 2 * spacing.median) {
      notes.push("Irregular station spacing: 25-ft windows use the nearest station at or beyond 25 ft (max 40 ft).");
    }
  }

  if (nativeDlsCount === 0) {
    notes.push("Native gyro DLS not imported: spike and sustained screening unavailable; 25-ft DLS only.");
  }

  if (directionalStationCount < 2) {
    notes.push("Inclination/azimuth not imported: 25-ft DLS cannot be calculated; survey flagged for review.");
  } else if (missingDirectionalCount > 0) {
    notes.push(`${missingDirectionalCount} gyro station(s) missing inclination/azimuth were skipped in 25-ft DLS.`);
  }

  if (gaps.length > 0) {
    notes.push(`${gaps.length} station gap(s) over ${MAX_WINDOW_FT} ft flagged as not assessed.`);
  }

  if (!Array.isArray(drillingStations) || drillingStations.length === 0) {
    notes.push("Drilling survey not loaded: no drilling comparison.");
  } else if (drillingStations.every((station) => getNativeDls(station) === null)) {
    notes.push("Drilling survey DLS not imported: drilling comparison unavailable.");
  }

  if (zones.length === 0) {
    notes.push("No High or Review intervals in the screened gyro range.");
  }

  return {
    zones,
    notes,
    screenedRange,
    windowCount: windows.length,
    counts: {
      high: zones.filter((zone) => zone.risk === RISK_LEVEL.HIGH).length,
      review: zones.filter((zone) => zone.risk === RISK_LEVEL.REVIEW).length,
    },
  };
}

export function formatDrillingContext(drilling) {
  switch (drilling?.status) {
    case "ok":
      return `${formatValue(drilling.maxDls, 2)} (course ${formatMd(drilling.courseStartMd)}–${formatMd(drilling.courseEndMd)} ft)`;
    case "noDls":
      return "DLS not imported";
    case "noCoverage":
      return "No coverage";
    default:
      return "Not loaded";
  }
}

function escapeCsv(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildRiskCsv({ analysis, settings, gyroLabel = "", drillingLabel = "" }) {
  const lines = [
    ["Wellbore Risk Analysis (screening only; not an equipment passability determination)"],
    ["Gyro survey", gyroLabel],
    ["Drilling survey", drillingLabel || "Not loaded"],
    [
      "Criteria",
      `High: 25-ft DLS >= ${settings.high25} or native DLS >= ${settings.spikeDls} sustained >= ${settings.sustainedFt} ft; Review: 25-ft DLS >= ${settings.review25} or isolated native DLS >= ${settings.spikeDls}; DLS in deg/100ft`,
    ],
    ...(analysis?.notes ?? []).map((note) => ["Note", note]),
    [],
    [
      "Zone",
      "Risk",
      "MD Start (ft)",
      "MD End (ft)",
      "Length (ft)",
      "Peak Gyro DLS - imported (deg/100ft)",
      "Peak Gyro DLS MD (ft)",
      "Max 25-ft DLS - calculated (deg/100ft)",
      "25-ft Window Start (ft)",
      "25-ft Window End (ft)",
      "Drilling DLS - imported (deg/100ft)",
      "Drilling Course Start (ft)",
      "Drilling Course End (ft)",
      "Drilling Status",
      "Finding",
    ],
    ...(analysis?.zones ?? []).map((zone, index) => [
      index + 1,
      zone.risk === RISK_LEVEL.HIGH ? "High" : "Review",
      formatMd(zone.startMd),
      formatMd(zone.endMd),
      formatMd(zone.length),
      zone.nativePeak ? formatValue(zone.nativePeak.value, 2) : "",
      zone.nativePeak ? formatMd(zone.nativePeak.md) : "",
      zone.max25 ? formatValue(zone.max25.value, 2) : "",
      zone.max25 ? formatMd(zone.max25.startMd) : "",
      zone.max25 ? formatMd(zone.max25.endMd) : "",
      zone.drilling.status === "ok" ? formatValue(zone.drilling.maxDls, 2) : "",
      zone.drilling.status === "ok" ? formatMd(zone.drilling.courseStartMd) : "",
      zone.drilling.status === "ok" ? formatMd(zone.drilling.courseEndMd) : "",
      formatDrillingContext(zone.drilling),
      zone.finding,
    ]),
  ];

  return lines.map((row) => row.map(escapeCsv).join(",")).join("\r\n") + "\r\n";
}
