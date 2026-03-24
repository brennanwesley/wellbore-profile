import { describe, expect, it } from "vitest";
import { buildColumnOptions, extractMappedSurvey, suggestMappings } from "./surveyImport";

describe("survey import mapping", () => {
  it("suggests required mappings from common header aliases", () => {
    const rows = [
      ["Customer", "Acme"],
      ["MD", "TVD", "Global N Coord", "Global E Coord", "Dogleg", "Annotations"],
    ];

    const options = buildColumnOptions(rows, 1);
    const mappings = suggestMappings(options);

    expect(mappings.md).toBe(0);
    expect(mappings.tvd).toBe(1);
    expect(mappings.northing).toBe(2);
    expect(mappings.easting).toBe(3);
    expect(mappings.dls).toBe(4);
    expect(mappings.annotations).toBe(5);
  });
});

describe("survey import validation", () => {
  it("extracts valid rows, skips invalid rows, and normalizes coordinates", () => {
    const rows = [
      ["MD", "TVD", "Northing", "Easting", "Inclination", "Dogleg", "Annotations"],
      ["1000", "8500", "100", "200", "89.1", "1.0", "start"],
      ["1010", "8510", "110", "210", "89.4", "1.2", ""],
      ["1020", "bad", "120", "220", "89.6", "1.3", "bad tvd"],
      ["1030", "8530", "130", "230", "90.0", "1.5", "end"],
    ];

    const result = extractMappedSurvey({
      rows,
      dataStartRowIndex: 1,
      mappings: {
        md: 0,
        tvd: 1,
        northing: 2,
        easting: 3,
        inclination: 4,
        dls: 5,
        annotations: 6,
      },
    });

    expect(result.canApply).toBe(true);
    expect(result.summary.validRowCount).toBe(3);
    expect(result.summary.invalidRowCount).toBe(1);
    expect(result.warnings[0]).toContain("1 row(s) were skipped");

    expect(result.points).toHaveLength(3);
    expect(result.points[0]).toMatchObject({ x: 0, y: 0, z: 8500, md: 1000, inclination: 89.1, dls: 1 });
    expect(result.points[1]).toMatchObject({ x: 10, y: 10, z: 8510, md: 1010, inclination: 89.4, dls: 1.2 });
    expect(result.points[2]).toMatchObject({ x: 30, y: 30, z: 8530, md: 1030, inclination: 90, dls: 1.5 });
  });

  it("returns fatal error when required fields share the same source column", () => {
    const rows = [
      ["MD", "TVD", "Northing", "Easting"],
      ["1000", "8500", "100", "200"],
      ["1010", "8510", "110", "210"],
    ];

    const result = extractMappedSurvey({
      rows,
      dataStartRowIndex: 1,
      mappings: {
        md: 0,
        tvd: 0,
        northing: 2,
        easting: 3,
      },
    });

    expect(result.canApply).toBe(false);
    expect(result.fatalErrors).toContain("Required fields must map to different source columns.");
  });

  it("returns fatal error when required mapped fields do not have matching row counts", () => {
    const rows = [
      ["MD", "TVD", "Northing", "Easting"],
      ["1000", "8500", "100", "200"],
      ["", "8510", "110", "210"],
      ["1020", "8520", "120", "220"],
    ];

    const result = extractMappedSurvey({
      rows,
      dataStartRowIndex: 1,
      mappings: {
        md: 0,
        tvd: 1,
        northing: 2,
        easting: 3,
      },
    });

    expect(result.canApply).toBe(false);
    expect(result.fatalErrors).toContain("Required mapped fields do not have matching non-empty row counts.");
  });
});
