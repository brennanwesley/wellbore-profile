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

export function sortStationsByMd(points) {
  return (Array.isArray(points) ? points : [])
    .filter((point) => toFiniteNumber(point?.md) !== null && toFiniteNumber(point?.tvd ?? point?.z) !== null)
    .sort((left, right) => left.md - right.md);
}

export function getMdRange(points) {
  const mdValues = (Array.isArray(points) ? points : [])
    .map((point) => toFiniteNumber(point?.md))
    .filter((value) => value !== null);

  if (mdValues.length === 0) {
    return null;
  }

  return mdValues.reduce(
    (range, md) => ({ minMd: Math.min(range.minMd, md), maxMd: Math.max(range.maxMd, md) }),
    { minMd: mdValues[0], maxMd: mdValues[0] },
  );
}

export function mergeMdRanges(...ranges) {
  const validRanges = ranges.filter(Boolean);

  if (validRanges.length === 0) {
    return null;
  }

  return {
    minMd: Math.min(...validRanges.map((range) => range.minMd)),
    maxMd: Math.max(...validRanges.map((range) => range.maxMd)),
  };
}

export function resolveMdWindow({ startInput, endInput, bounds }) {
  if (!bounds) {
    return { isValid: false, start: null, end: null, message: "Load a survey before setting an MD window." };
  }

  const parsedStart = toFiniteNumber(startInput);
  const parsedEnd = toFiniteNumber(endInput);

  if (parsedStart === null || parsedEnd === null) {
    return { isValid: false, start: null, end: null, message: "Enter numeric Start and End MD values." };
  }

  const clampMd = (value) => Math.min(Math.max(value, bounds.minMd), bounds.maxMd);
  const start = clampMd(Math.min(parsedStart, parsedEnd));
  const end = clampMd(Math.max(parsedStart, parsedEnd));

  if (end <= start) {
    return {
      isValid: false,
      start: null,
      end: null,
      message: "Enter an MD window that overlaps the loaded surveys and has End MD greater than Start MD.",
    };
  }

  return { isValid: true, start, end, message: null };
}

export function filterStationsByMdWindow(points, mdWindow) {
  const stations = Array.isArray(points) ? points : [];

  if (!mdWindow) {
    return stations;
  }

  return stations.filter((point) => point.md >= mdWindow.start && point.md <= mdWindow.end);
}

export function buildSharedFrame(pointSets) {
  const frame = {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
    minTvd: Number.POSITIVE_INFINITY,
    maxTvd: Number.NEGATIVE_INFINITY,
  };
  let hasPoints = false;

  (Array.isArray(pointSets) ? pointSets : [])
    .filter((points) => Array.isArray(points) && points.length >= 2)
    .forEach((points) => {
      points.forEach((point) => {
        const x = toFiniteNumber(point?.x);
        const y = toFiniteNumber(point?.y);
        const tvd = toFiniteNumber(point?.tvd ?? point?.z);

        if (x === null || y === null || tvd === null) {
          return;
        }

        hasPoints = true;
        frame.minX = Math.min(frame.minX, x);
        frame.maxX = Math.max(frame.maxX, x);
        frame.minY = Math.min(frame.minY, y);
        frame.maxY = Math.max(frame.maxY, y);
        frame.minTvd = Math.min(frame.minTvd, tvd);
        frame.maxTvd = Math.max(frame.maxTvd, tvd);
      });
    });

  return hasPoints ? frame : null;
}
