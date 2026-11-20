export const DLS_CATEGORY = {
  HIGH: "high",
  WARNING: "warning",
  NORMAL: "normal",
  NO_DATA: "noData",
};

export const DEFAULT_DLS_THRESHOLD_INPUTS = {
  red: "5",
  yellow: "3",
};

function parseThreshold(value) {
  const text = String(value ?? "").trim();

  if (!text) {
    return null;
  }

  const numericValue = Number(text);
  return Number.isFinite(numericValue) ? numericValue : null;
}

export function parseDlsThresholds(redInput, yellowInput) {
  const red = parseThreshold(redInput);
  const yellow = parseThreshold(yellowInput);

  if (red === null || yellow === null) {
    return { isValid: false, red, yellow, message: "Enter numeric red and yellow DLS thresholds." };
  }

  if (red < 0 || yellow < 0) {
    return { isValid: false, red, yellow, message: "DLS thresholds must be zero or greater." };
  }

  if (red <= yellow) {
    return { isValid: false, red, yellow, message: "Red threshold (X) must be greater than yellow threshold (Y)." };
  }

  return { isValid: true, red, yellow, message: null };
}

export function getImportedDls(point) {
  return typeof point?.dls === "number" && Number.isFinite(point.dls) ? point.dls : null;
}

export function classifyDls(dls, thresholds) {
  if (typeof dls !== "number" || !Number.isFinite(dls)) {
    return DLS_CATEGORY.NO_DATA;
  }

  if (!thresholds?.isValid) {
    return DLS_CATEGORY.NORMAL;
  }

  if (dls > thresholds.red) {
    return DLS_CATEGORY.HIGH;
  }

  if (dls > thresholds.yellow) {
    return DLS_CATEGORY.WARNING;
  }

  return DLS_CATEGORY.NORMAL;
}

export function summarizeDls(points, thresholds) {
  const summary = {
    [DLS_CATEGORY.HIGH]: 0,
    [DLS_CATEGORY.WARNING]: 0,
    [DLS_CATEGORY.NORMAL]: 0,
    [DLS_CATEGORY.NO_DATA]: 0,
    maxDls: null,
  };

  (Array.isArray(points) ? points : []).forEach((point) => {
    const dls = getImportedDls(point);
    summary[classifyDls(dls, thresholds)] += 1;

    if (dls !== null && (summary.maxDls === null || dls > summary.maxDls.value)) {
      summary.maxDls = { value: dls, md: point.md };
    }
  });

  return summary;
}
