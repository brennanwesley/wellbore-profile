function toNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function toNormalizedPoint(point) {
  if (!point || typeof point !== "object") {
    return null;
  }

  const md = toNumber(point.md);
  const tvd = toNumber(point.tvd ?? point.z);
  const northing = toNumber(point.northing ?? point.y);
  const easting = toNumber(point.easting ?? point.x);

  if (md === null || tvd === null || northing === null || easting === null) {
    return null;
  }

  return { md, tvd, northing, easting };
}

function segmentPlanarDistance(startPoint, endPoint) {
  const northingDelta = endPoint.northing - startPoint.northing;
  const eastingDelta = endPoint.easting - startPoint.easting;
  return Math.hypot(northingDelta, eastingDelta);
}

function normalizeTargetInterval(targetInterval) {
  if (!targetInterval || typeof targetInterval !== "object") {
    return null;
  }

  const top = toNumber(targetInterval.top);
  const bottom = toNumber(targetInterval.bottom);

  if (top === null || bottom === null) {
    return null;
  }

  return {
    top: Math.min(top, bottom),
    bottom: Math.max(top, bottom),
  };
}

export function calculateKpiMetrics(points, targetInterval = null) {
  const normalizedPoints = Array.isArray(points)
    ? points.map((point) => toNormalizedPoint(point)).filter((point) => point !== null)
    : [];

  if (normalizedPoints.length < 2) {
    return {
      totalMd: 0,
      maxTvd: 0,
      totalHorizontalDisplacement: 0,
      approximateLateralLength: 0,
      inZoneLateralLength: 0,
      inZonePercentage: 0,
      pointCount: normalizedPoints.length,
    };
  }

  const sortedPoints = [...normalizedPoints].sort((left, right) => left.md - right.md);
  const firstPoint = sortedPoints[0];
  const lastPoint = sortedPoints[sortedPoints.length - 1];

  const totalMd = Math.max(lastPoint.md - firstPoint.md, 0);
  const maxTvd = sortedPoints.reduce((maxValue, point) => Math.max(maxValue, point.tvd), 0);
  const totalHorizontalDisplacement = segmentPlanarDistance(firstPoint, lastPoint);

  const approximateLateralLength = sortedPoints.slice(1).reduce((sum, point, index) => {
    const previousPoint = sortedPoints[index];
    return sum + segmentPlanarDistance(previousPoint, point);
  }, 0);

  const normalizedTarget = normalizeTargetInterval(targetInterval);

  let inZoneLateralLength = 0;
  if (normalizedTarget) {
    inZoneLateralLength = sortedPoints.slice(1).reduce((sum, point, index) => {
      const previousPoint = sortedPoints[index];
      const midpointTvd = (previousPoint.tvd + point.tvd) / 2;

      if (midpointTvd >= normalizedTarget.top && midpointTvd <= normalizedTarget.bottom) {
        return sum + segmentPlanarDistance(previousPoint, point);
      }

      return sum;
    }, 0);
  }

  const inZonePercentage =
    approximateLateralLength > 0 ? (inZoneLateralLength / approximateLateralLength) * 100 : 0;

  return {
    totalMd,
    maxTvd,
    totalHorizontalDisplacement,
    approximateLateralLength,
    inZoneLateralLength,
    inZonePercentage,
    pointCount: sortedPoints.length,
  };
}
