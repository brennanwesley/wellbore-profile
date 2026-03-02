import Papa from "papaparse";

export const MAPPING_FIELDS = [
  {
    key: "md",
    label: "MD (ft)",
    required: true,
    aliases: ["md", "measured depth", "depth"],
  },
  {
    key: "tvd",
    label: "TVD (ft)",
    required: true,
    aliases: ["tvd", "true vertical depth"],
  },
  {
    key: "northing",
    label: "Northing (ft)",
    required: true,
    aliases: [
      "northing",
      "global n coord",
      "local n coord",
      "n coord",
      "ns",
      "north south",
      "north",
      "y",
    ],
  },
  {
    key: "easting",
    label: "Easting (ft)",
    required: true,
    aliases: [
      "easting",
      "global e coord",
      "local e coord",
      "e coord",
      "ew",
      "east west",
      "east",
      "x",
    ],
  },
  {
    key: "inclination",
    label: "Inclination (deg)",
    required: false,
    aliases: ["incl", "inclination", "inc", "deviation"],
  },
  {
    key: "azimuth",
    label: "Azimuth (deg)",
    required: false,
    aliases: ["azimuth", "azim", "azi", "bearing"],
  },
  {
    key: "dls",
    label: "DLS (deg/100ft)",
    required: false,
    aliases: ["dogleg", "dogleg severity", "dls", "dega/100ft", "deg/100ft"],
  },
  {
    key: "verticalSection",
    label: "Vertical Section (ft)",
    required: false,
    aliases: ["vertical section", "vs"],
  },
  {
    key: "subSea",
    label: "Sub-Sea (ft)",
    required: false,
    aliases: ["sub-sea", "sub sea", "subsea"],
  },
  {
    key: "annotations",
    label: "Annotations",
    required: false,
    aliases: ["annotation", "annotations", "comment", "notes"],
  },
];

export const REQUIRED_MAPPING_KEYS = MAPPING_FIELDS.filter((field) => field.required).map(
  (field) => field.key,
);

const METADATA_FIELD_MATCHERS = {
  wellName: ["wellname", "well name", "well"],
  kellyBushing: ["kelly bushing", "kelly bushing elev", "kelly bushing elevation", "kb", "kb elev"],
  groundElevation: ["ground elev", "ground elevation", "ground"],
};

function normalizeValue(value) {
  return String(value ?? "").trim();
}

function normalizeMatch(value) {
  return normalizeValue(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getCellValue(row = [], columnIndex) {
  if (typeof columnIndex !== "number" || columnIndex < 0) {
    return "";
  }

  return normalizeValue(row[columnIndex]);
}

function toNumber(value) {
  if (value === "") {
    return null;
  }

  const cleaned = String(value).replace(/,/g, "").trim();
  const numberValue = Number(cleaned);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function hasMetadataValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

export function extractMetadataSuggestions(rows) {
  const suggestions = {
    wellName: "",
    kellyBushing: null,
    groundElevation: null,
    sourceRows: {},
  };

  if (!Array.isArray(rows) || rows.length === 0) {
    return suggestions;
  }

  const maxRowsToScan = Math.min(rows.length, 45);

  for (let rowIndex = 0; rowIndex < maxRowsToScan; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    const leftCell = normalizeValue(row[0]);
    const rightCell = normalizeValue(row[1]);

    if (!leftCell || !rightCell) {
      continue;
    }

    const normalizedLeft = normalizeMatch(leftCell);

    if (
      !suggestions.wellName &&
      METADATA_FIELD_MATCHERS.wellName.some((alias) => normalizedLeft.includes(normalizeMatch(alias)))
    ) {
      suggestions.wellName = rightCell;
      suggestions.sourceRows.wellName = rowIndex + 1;
      continue;
    }

    if (
      suggestions.kellyBushing === null &&
      METADATA_FIELD_MATCHERS.kellyBushing.some((alias) => normalizedLeft.includes(normalizeMatch(alias)))
    ) {
      const parsedKb = toNumber(rightCell);

      if (parsedKb !== null) {
        suggestions.kellyBushing = parsedKb;
        suggestions.sourceRows.kellyBushing = rowIndex + 1;
      }

      continue;
    }

    if (
      suggestions.groundElevation === null &&
      METADATA_FIELD_MATCHERS.groundElevation.some((alias) => normalizedLeft.includes(normalizeMatch(alias)))
    ) {
      const parsedGround = toNumber(rightCell);

      if (parsedGround !== null) {
        suggestions.groundElevation = parsedGround;
        suggestions.sourceRows.groundElevation = rowIndex + 1;
      }
    }
  }

  return suggestions;
}

export function hasMetadataSuggestions(metadata) {
  if (!metadata) {
    return false;
  }

  return (
    hasMetadataValue(metadata.wellName) ||
    hasMetadataValue(metadata.kellyBushing) ||
    hasMetadataValue(metadata.groundElevation)
  );
}

export function getSpreadsheetColumnLabel(columnIndex) {
  if (!Number.isInteger(columnIndex) || columnIndex < 0) {
    return "?";
  }

  let index = columnIndex;
  let label = "";

  while (index >= 0) {
    label = String.fromCharCode((index % 26) + 65) + label;
    index = Math.floor(index / 26) - 1;
  }

  return label;
}

export function parseTableText(rawText) {
  const inputText = String(rawText ?? "");

  if (!inputText.trim()) {
    return {
      rows: [],
      parseErrors: [],
      maxColumns: 0,
    };
  }

  const parsed = Papa.parse(inputText, {
    delimiter: "",
    skipEmptyLines: false,
  });

  const rows = parsed.data
    .filter((row) => Array.isArray(row))
    .map((row) => row.map((value) => normalizeValue(value)));

  const maxColumns = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const normalizedRows = rows.map((row) => {
    if (row.length >= maxColumns) {
      return row;
    }

    return [...row, ...new Array(maxColumns - row.length).fill("")];
  });

  const parseErrors = (parsed.errors ?? []).map((error) => {
    const rowNumber = typeof error.row === "number" ? error.row + 1 : "?";
    return `Row ${rowNumber}: ${error.message}`;
  });

  return {
    rows: normalizedRows,
    parseErrors,
    maxColumns,
  };
}

export function detectHeaderRowIndex(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return 0;
  }

  const maxRowsToScan = Math.min(rows.length, 40);
  const aliases = MAPPING_FIELDS.flatMap((field) => field.aliases.map(normalizeMatch));

  let bestIndex = 0;
  let bestScore = 0;

  for (let rowIndex = 0; rowIndex < maxRowsToScan; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];

    const score = row.reduce((acc, cellValue) => {
      const normalizedCell = normalizeMatch(cellValue);

      if (!normalizedCell) {
        return acc;
      }

      const hasExact = aliases.includes(normalizedCell);
      if (hasExact) {
        return acc + 3;
      }

      const hasPartial = aliases.some((alias) => {
        if (alias.length < 3) {
          return false;
        }

        return normalizedCell.includes(alias) || alias.includes(normalizedCell);
      });

      return hasPartial ? acc + 1 : acc;
    }, 0);

    if (score > bestScore) {
      bestScore = score;
      bestIndex = rowIndex;
    }
  }

  return bestIndex;
}

export function buildColumnOptions(rows, headerRowIndex = null) {
  const maxColumns = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const headerRow = Number.isInteger(headerRowIndex) && headerRowIndex >= 0 ? rows[headerRowIndex] ?? [] : [];

  return Array.from({ length: maxColumns }, (_, columnIndex) => {
    const fallbackLabel = getSpreadsheetColumnLabel(columnIndex);
    const header = normalizeValue(headerRow[columnIndex]);

    return {
      index: columnIndex,
      fallbackLabel,
      header,
      label: header ? `${fallbackLabel} - ${header}` : fallbackLabel,
    };
  });
}

export function suggestMappings(columnOptions) {
  const suggestions = {};

  MAPPING_FIELDS.forEach((field) => {
    let bestMatch = null;

    columnOptions.forEach((option) => {
      const normalizedHeader = normalizeMatch(option.header || option.label);

      if (!normalizedHeader) {
        return;
      }

      field.aliases.forEach((alias) => {
        const normalizedAlias = normalizeMatch(alias);

        if (!normalizedAlias) {
          return;
        }

        let score = 0;

        if (normalizedHeader === normalizedAlias) {
          score = 100;
        } else if (normalizedHeader.includes(normalizedAlias)) {
          score = 60;
        } else if (normalizedAlias.includes(normalizedHeader)) {
          score = 35;
        }

        if (!bestMatch || score > bestMatch.score) {
          bestMatch = {
            index: option.index,
            score,
          };
        }
      });
    });

    suggestions[field.key] = bestMatch && bestMatch.score > 0 ? bestMatch.index : "";
  });

  return suggestions;
}

export function extractMappedSurvey({ rows, mappings, dataStartRowIndex }) {
  const result = {
    canApply: false,
    points: [],
    records: [],
    summary: {
      totalRowsScanned: 0,
      validRowCount: 0,
      invalidRowCount: 0,
      skippedBlankRows: 0,
      nonEmptyRequiredCounts: {},
    },
    fatalErrors: [],
    warnings: [],
    invalidRows: [],
  };

  if (!Array.isArray(rows) || rows.length === 0) {
    result.fatalErrors.push("No rows available. Upload a file or parse pasted data first.");
    return result;
  }

  const startRowIndex = Number.isInteger(dataStartRowIndex)
    ? Math.min(Math.max(dataStartRowIndex, 0), rows.length)
    : 0;

  const requiredColumnIndexes = {};

  REQUIRED_MAPPING_KEYS.forEach((fieldKey) => {
    const columnIndex = mappings?.[fieldKey];

    if (!Number.isInteger(columnIndex) || columnIndex < 0) {
      result.fatalErrors.push(`Map required field: ${fieldKey.toUpperCase()}.`);
      return;
    }

    requiredColumnIndexes[fieldKey] = columnIndex;
  });

  if (result.fatalErrors.length > 0) {
    return result;
  }

  const requiredFieldDuplicates = new Set();
  const columnUsage = new Set();

  REQUIRED_MAPPING_KEYS.forEach((fieldKey) => {
    const columnIndex = requiredColumnIndexes[fieldKey];

    if (columnUsage.has(columnIndex)) {
      requiredFieldDuplicates.add(columnIndex);
    }

    columnUsage.add(columnIndex);
  });

  if (requiredFieldDuplicates.size > 0) {
    result.fatalErrors.push("Required fields must map to different source columns.");
    return result;
  }

  const nonEmptyRequiredCounts = REQUIRED_MAPPING_KEYS.reduce((acc, fieldKey) => {
    acc[fieldKey] = 0;
    return acc;
  }, {});

  for (let rowIndex = startRowIndex; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    const rowNumber = rowIndex + 1;

    const requiredRaw = REQUIRED_MAPPING_KEYS.map((fieldKey) => getCellValue(row, requiredColumnIndexes[fieldKey]));

    if (requiredRaw.every((value) => value === "")) {
      result.summary.skippedBlankRows += 1;
      continue;
    }

    REQUIRED_MAPPING_KEYS.forEach((fieldKey, index) => {
      if (requiredRaw[index] !== "") {
        nonEmptyRequiredCounts[fieldKey] += 1;
      }
    });

    const requiredNumbers = {};
    let invalidReason = "";

    REQUIRED_MAPPING_KEYS.forEach((fieldKey, index) => {
      if (invalidReason) {
        return;
      }

      const numberValue = toNumber(requiredRaw[index]);

      if (numberValue === null) {
        invalidReason = `${fieldKey.toUpperCase()} is missing or non-numeric`;
        return;
      }

      requiredNumbers[fieldKey] = numberValue;
    });

    if (invalidReason) {
      result.invalidRows.push({ rowNumber, reason: invalidReason });
      continue;
    }

    const optionalNumber = (fieldKey) => {
      const columnIndex = mappings?.[fieldKey];
      const rawValue = getCellValue(row, columnIndex);
      return toNumber(rawValue);
    };

    const annotationsColumnIndex = mappings?.annotations;

    result.records.push({
      rowNumber,
      md: requiredNumbers.md,
      tvd: requiredNumbers.tvd,
      northing: requiredNumbers.northing,
      easting: requiredNumbers.easting,
      inclination: optionalNumber("inclination"),
      azimuth: optionalNumber("azimuth"),
      dls: optionalNumber("dls"),
      verticalSection: optionalNumber("verticalSection"),
      subSea: optionalNumber("subSea"),
      annotations: getCellValue(row, annotationsColumnIndex),
    });
  }

  result.summary.totalRowsScanned = Math.max(rows.length - startRowIndex, 0);
  result.summary.validRowCount = result.records.length;
  result.summary.invalidRowCount = result.invalidRows.length;
  result.summary.nonEmptyRequiredCounts = nonEmptyRequiredCounts;

  const uniqueRequiredCounts = Array.from(new Set(Object.values(nonEmptyRequiredCounts)));
  if (uniqueRequiredCounts.length > 1) {
    result.fatalErrors.push("Required mapped fields do not have matching non-empty row counts.");
  }

  if (result.records.length < 2) {
    result.fatalErrors.push("At least two valid data rows are required to render a trajectory.");
  }

  if (result.invalidRows.length > 0) {
    result.warnings.push(`${result.invalidRows.length} row(s) were skipped due to validation errors.`);
  }

  if (result.fatalErrors.length > 0) {
    return result;
  }

  const origin = {
    northing: result.records[0].northing,
    easting: result.records[0].easting,
  };

  result.points = result.records.map((record, index) => ({
    x: record.easting - origin.easting,
    y: record.northing - origin.northing,
    z: record.tvd,
    md: record.md,
    tvd: record.tvd,
    northing: record.northing,
    easting: record.easting,
    dls: record.dls,
    annotations: record.annotations,
    rowNumber: record.rowNumber,
    pointIndex: index,
  }));

  result.canApply = true;
  return result;
}
