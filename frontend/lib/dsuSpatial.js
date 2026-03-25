export const FEET_PER_LATITUDE_DEGREE = 364000;
export const DSU_PROXIMITY_WARNING_FT = 10000;

function toFiniteNumber(value) {
  const cleaned = String(value ?? "").replace(/,/g, "").trim();
  if (!cleaned) {
    return null;
  }

  const numericValue = Number(cleaned);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function normalizeWellName(well, index) {
  const preferredName = String(well?.name ?? well?.wellName ?? "").trim();
  return preferredName || `Well ${index + 1}`;
}

export function validateSurfaceCoordinates(well) {
  const latitudeText = String(well?.latitude ?? "").trim();
  const longitudeText = String(well?.longitude ?? "").trim();

  if (!latitudeText || !longitudeText) {
    return {
      isComplete: false,
      isValid: false,
      latitude: null,
      longitude: null,
      message: null,
    };
  }

  const latitude = toFiniteNumber(latitudeText);
  if (latitude === null || latitude < -90 || latitude > 90) {
    return {
      isComplete: true,
      isValid: false,
      latitude,
      longitude: null,
      message: "Latitude must be a decimal value between -90 and 90.",
    };
  }

  const longitude = toFiniteNumber(longitudeText);
  if (longitude === null || longitude < -180 || longitude > 180) {
    return {
      isComplete: true,
      isValid: false,
      latitude,
      longitude,
      message: "Longitude must be a decimal value between -180 and 180.",
    };
  }

  return {
    isComplete: true,
    isValid: true,
    latitude,
    longitude,
    message: null,
  };
}

export function buildDsuSurfaceLayout(wells) {
  const renderableWells = (Array.isArray(wells) ? wells : []).reduce((accumulator, well, index) => {
    const coordinateValidation = validateSurfaceCoordinates(well);
    const points = Array.isArray(well?.points) ? well.points : [];

    if (!coordinateValidation.isValid || points.length < 2) {
      return accumulator;
    }

    accumulator.push({
      ...well,
      latitude: coordinateValidation.latitude,
      longitude: coordinateValidation.longitude,
      points,
      wellName: normalizeWellName(well, index),
    });

    return accumulator;
  }, []);

  if (renderableWells.length === 0) {
    return {
      readyWells: [],
      referenceLatitude: null,
      referenceLongitude: null,
      maxSurfaceSeparationFt: 0,
      farthestPair: null,
      shouldWarnWideSpacing: false,
    };
  }

  const referenceWell = renderableWells[0];
  const averageLatitude =
    renderableWells.reduce((total, well) => total + well.latitude, 0) / renderableWells.length;
  const longitudeFeetPerDegree = FEET_PER_LATITUDE_DEGREE * Math.max(Math.cos((averageLatitude * Math.PI) / 180), 0.15);

  const readyWells = renderableWells.map((well) => {
    const surfaceOffsetNorthingFt = (well.latitude - referenceWell.latitude) * FEET_PER_LATITUDE_DEGREE;
    const surfaceOffsetEastingFt = (well.longitude - referenceWell.longitude) * longitudeFeetPerDegree;

    return {
      ...well,
      surfaceOffsetNorthingFt,
      surfaceOffsetEastingFt,
      surfaceDistanceFromReferenceFt: Math.hypot(surfaceOffsetNorthingFt, surfaceOffsetEastingFt),
    };
  });

  let maxSurfaceSeparationFt = 0;
  let farthestPair = null;

  for (let firstIndex = 0; firstIndex < readyWells.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < readyWells.length; secondIndex += 1) {
      const firstWell = readyWells[firstIndex];
      const secondWell = readyWells[secondIndex];
      const northingDelta = secondWell.surfaceOffsetNorthingFt - firstWell.surfaceOffsetNorthingFt;
      const eastingDelta = secondWell.surfaceOffsetEastingFt - firstWell.surfaceOffsetEastingFt;
      const distanceFt = Math.hypot(northingDelta, eastingDelta);

      if (distanceFt > maxSurfaceSeparationFt) {
        maxSurfaceSeparationFt = distanceFt;
        farthestPair = {
          firstWellId: firstWell.id,
          firstWellName: firstWell.wellName,
          secondWellId: secondWell.id,
          secondWellName: secondWell.wellName,
          distanceFt,
        };
      }
    }
  }

  return {
    readyWells,
    referenceLatitude: referenceWell.latitude,
    referenceLongitude: referenceWell.longitude,
    maxSurfaceSeparationFt,
    farthestPair,
    shouldWarnWideSpacing: maxSurfaceSeparationFt > DSU_PROXIMITY_WARNING_FT,
  };
}
