"use client";

import { useCallback, useMemo, useState } from "react";
import {
  MAPPING_FIELDS,
  buildColumnOptions,
  detectHeaderRowIndex,
  extractMetadataSuggestions,
  extractMappedSurvey,
  hasMetadataSuggestions,
  parseTableText,
  suggestMappings,
} from "@/lib/surveyImport";

const PREVIEW_ROW_COUNT = 6;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function isLikelyUnitsRow(row = []) {
  const nonEmpty = row.filter((value) => String(value ?? "").trim() !== "");

  if (nonEmpty.length === 0) {
    return false;
  }

  const unitsLikeCount = nonEmpty.filter((value) => {
    const normalized = String(value).trim().toLowerCase();

    if (!normalized) {
      return false;
    }

    if (Number.isFinite(Number(normalized))) {
      return false;
    }

    return (
      normalized.includes("(") ||
      normalized.includes("ft") ||
      normalized.includes("deg") ||
      normalized.includes("unit") ||
      normalized.endsWith(".")
    );
  }).length;

  return unitsLikeCount / nonEmpty.length >= 0.6;
}

export default function SurveyImportMapper({ onApplyTrajectory }) {
  const [rawTableText, setRawTableText] = useState("");
  const [sourceLabel, setSourceLabel] = useState("No file loaded yet.");
  const [rows, setRows] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [headerMode, setHeaderMode] = useState("auto");
  const [manualHeaderRow, setManualHeaderRow] = useState(1);
  const [dataStartRow, setDataStartRow] = useState(1);
  const [mappings, setMappings] = useState({});
  const [metadataSuggestions, setMetadataSuggestions] = useState({
    wellName: "",
    kellyBushing: null,
    groundElevation: null,
    sourceRows: {},
  });
  const [validationResult, setValidationResult] = useState(null);
  const [isReviewExpanded, setIsReviewExpanded] = useState(false);

  const rowCount = rows.length;
  const detectedHeaderRowIndex = useMemo(() => detectHeaderRowIndex(rows), [rows]);

  const effectiveHeaderRowIndex = useMemo(() => {
    if (rowCount === 0 || headerMode === "none") {
      return null;
    }

    if (headerMode === "manual") {
      const manualIndex = clamp((Number(manualHeaderRow) || 1) - 1, 0, rowCount - 1);
      return manualIndex;
    }

    return detectedHeaderRowIndex;
  }, [detectedHeaderRowIndex, headerMode, manualHeaderRow, rowCount]);

  const dataStartRowIndex = useMemo(() => {
    if (rowCount === 0) {
      return 0;
    }

    return clamp((Number(dataStartRow) || 1) - 1, 0, rowCount - 1);
  }, [dataStartRow, rowCount]);

  const columnOptions = useMemo(
    () => buildColumnOptions(rows, effectiveHeaderRowIndex),
    [effectiveHeaderRowIndex, rows],
  );

  const previewRows = useMemo(
    () => rows.slice(dataStartRowIndex, dataStartRowIndex + PREVIEW_ROW_COUNT),
    [dataStartRowIndex, rows],
  );

  const parseAndInitialize = useCallback((inputText, label) => {
    const parsed = parseTableText(inputText);

    setRawTableText(inputText);
    setSourceLabel(label);
    setRows(parsed.rows);
    setParseErrors(parsed.parseErrors);
    setValidationResult(null);
    setMetadataSuggestions(extractMetadataSuggestions(parsed.rows));

    if (parsed.rows.length === 0) {
      setHeaderMode("auto");
      setManualHeaderRow(1);
      setDataStartRow(1);
      setMappings({});
      setMetadataSuggestions({
        wellName: "",
        kellyBushing: null,
        groundElevation: null,
        sourceRows: {},
      });
      return;
    }

    const detectedHeaderIndex = detectHeaderRowIndex(parsed.rows);
    const firstDataIndex = Math.min(detectedHeaderIndex + 1, parsed.rows.length - 1);
    const secondDataIndex = Math.min(firstDataIndex + 1, parsed.rows.length - 1);

    let startIndex = firstDataIndex;
    if (isLikelyUnitsRow(parsed.rows[firstDataIndex])) {
      startIndex = secondDataIndex;
    }

    setHeaderMode("auto");
    setManualHeaderRow(detectedHeaderIndex + 1);
    setDataStartRow(startIndex + 1);

    const options = buildColumnOptions(parsed.rows, detectedHeaderIndex);
    setMappings(suggestMappings(options));
  }, []);

  const handleParsePasted = useCallback(() => {
    parseAndInitialize(rawTableText, "Pasted table");
  }, [parseAndInitialize, rawTableText]);

  const handleFileUpload = useCallback(
    async (event) => {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      const text = await file.text();
      parseAndInitialize(text, `File: ${file.name}`);
      event.target.value = "";
    },
    [parseAndInitialize],
  );

  const handleAutoMap = useCallback(() => {
    setMappings(suggestMappings(columnOptions));
    setValidationResult(null);
  }, [columnOptions]);

  const handleMappingChange = useCallback((fieldKey, columnIndex) => {
    setMappings((previous) => ({
      ...previous,
      [fieldKey]: columnIndex === "" ? "" : Number(columnIndex),
    }));
    setValidationResult(null);
  }, []);

  const handleValidate = useCallback(() => {
    const result = extractMappedSurvey({
      rows,
      mappings,
      dataStartRowIndex,
    });

    setValidationResult(result);
  }, [dataStartRowIndex, mappings, rows]);

  const handleApply = useCallback(() => {
    if (!validationResult?.canApply) {
      return;
    }

    onApplyTrajectory?.({
      points: validationResult.points,
      summary: validationResult.summary,
      sourceLabel,
      warnings: validationResult.warnings,
      metadataSuggestions,
    });
  }, [metadataSuggestions, onApplyTrajectory, sourceLabel, validationResult]);

  return (
    <section className="import-block" aria-label="Directional survey import">
      <section className="metadata-block import-upload-block" aria-label="Upload directional survey">
        <p className="metadata-title">Upload Directional Survey</p>
        <div className="import-toolbar import-upload-toolbar">
          <label className="secondary-btn file-input-btn" htmlFor="survey-file-input">
            Upload Survey
          </label>
          <input
            id="survey-file-input"
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            onChange={handleFileUpload}
            className="file-input"
          />
          <button
            type="button"
            onClick={handleApply}
            className="secondary-btn"
            disabled={!validationResult?.canApply}
          >
            View Wellbore Profile
          </button>
        </div>
        <p className="import-source">{sourceLabel}</p>
        {rowCount > 0 && !validationResult?.canApply ? (
          <p className="helper-note">Open Survey Validation to review the file and validate it before viewing.</p>
        ) : null}
      </section>

      <section className="metadata-block import-review-block" aria-label="Survey validation">
        <button
          type="button"
          className="section-toggle"
          aria-expanded={isReviewExpanded}
          onClick={() => setIsReviewExpanded((previous) => !previous)}
        >
          <span className="section-toggle-title">Survey Validation</span>
          <span className={`section-toggle-icon ${isReviewExpanded ? "is-open" : ""}`} aria-hidden="true">
            ▾
          </span>
        </button>

        {isReviewExpanded ? (
          <div className="survey-review-shell">
            <label className="label" htmlFor="table-paste-input">
              Paste full survey table text (optional)
            </label>
            <textarea
              id="table-paste-input"
              className="coordinate-input"
              value={rawTableText}
              onChange={(event) => setRawTableText(event.target.value)}
              spellCheck={false}
              placeholder="Paste CSV table here"
            />

            <div className="actions">
              <button type="button" onClick={handleParsePasted} className="primary-btn">
                Parse Table
              </button>
              <button type="button" onClick={handleAutoMap} className="secondary-btn" disabled={!rowCount}>
                Auto-Map Fields
              </button>
            </div>

            <div className="helper-text">
              <p className="file-status">Rows detected: {rowCount}</p>
              {hasMetadataSuggestions(metadataSuggestions) ? (
                <p className="helper-note">
                  Metadata detected: {metadataSuggestions.wellName ? `Well Name` : null}
                  {metadataSuggestions.wellName && metadataSuggestions.kellyBushing !== null ? ", " : null}
                  {metadataSuggestions.kellyBushing !== null ? "Kelly Bushing" : null}
                  {(metadataSuggestions.wellName || metadataSuggestions.kellyBushing !== null) &&
                  metadataSuggestions.groundElevation !== null
                    ? ", "
                    : null}
                  {metadataSuggestions.groundElevation !== null ? "Ground Elevation" : null}
                </p>
              ) : null}
              {parseErrors.length > 0 ? (
                <ul className="warning-list">
                  {parseErrors.slice(0, 4).map((errorMessage) => (
                    <li key={errorMessage} className="warning">
                      {errorMessage}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {rowCount > 0 ? (
              <>
                <div className="mapper-controls">
                  <label className="mapper-field">
                    <span>Header mode</span>
                    <select
                      value={headerMode}
                      onChange={(event) => {
                        setHeaderMode(event.target.value);
                        setValidationResult(null);
                      }}
                      className="mapper-select"
                    >
                      <option value="auto">Auto detect</option>
                      <option value="manual">Manual row</option>
                      <option value="none">No header row</option>
                    </select>
                  </label>

                  {headerMode === "manual" ? (
                    <label className="mapper-field">
                      <span>Header row (1-based)</span>
                      <input
                        type="number"
                        min={1}
                        max={rowCount}
                        value={manualHeaderRow}
                        onChange={(event) => {
                          setManualHeaderRow(event.target.value);
                          setValidationResult(null);
                        }}
                        className="mapper-input"
                      />
                    </label>
                  ) : null}

                  <label className="mapper-field">
                    <span>Data starts at row (1-based)</span>
                    <input
                      type="number"
                      min={1}
                      max={rowCount}
                      value={dataStartRow}
                      onChange={(event) => {
                        setDataStartRow(event.target.value);
                        setValidationResult(null);
                      }}
                      className="mapper-input"
                    />
                  </label>
                </div>

                <p className="helper-note">
                  Effective header row: {effectiveHeaderRowIndex === null ? "None" : effectiveHeaderRowIndex + 1}
                </p>

                <div className="mapping-grid" role="group" aria-label="Field mappings">
                  {MAPPING_FIELDS.map((field) => (
                    <label key={field.key} className="mapping-row">
                      <span>
                        {field.label}
                        {field.required ? " *" : ""}
                      </span>
                      <select
                        value={mappings[field.key] ?? ""}
                        onChange={(event) => handleMappingChange(field.key, event.target.value)}
                        className="mapper-select"
                      >
                        <option value="">Not mapped</option>
                        {columnOptions.map((columnOption) => (
                          <option key={`${field.key}-${columnOption.index}`} value={columnOption.index}>
                            {columnOption.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>

                <div className="actions">
                  <button type="button" onClick={handleValidate} className="primary-btn">
                    Validate Mapping
                  </button>
                </div>

                {validationResult ? (
                  <div className="helper-text">
                    <p className="file-status">
                      Valid rows: {validationResult.summary.validRowCount} / Scanned rows: {validationResult.summary.totalRowsScanned}
                    </p>
                    {validationResult.fatalErrors.length > 0 ? (
                      <ul className="warning-list">
                        {validationResult.fatalErrors.map((error) => (
                          <li key={error} className="warning">
                            {error}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {validationResult.warnings.length > 0 ? (
                      <ul className="warning-list">
                        {validationResult.warnings.map((warningMessage) => (
                          <li key={warningMessage} className="warning">
                            {warningMessage}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {validationResult.invalidRows.length > 0 ? (
                      <p>
                        First invalid row: #{validationResult.invalidRows[0].rowNumber} - {validationResult.invalidRows[0].reason}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="preview-shell">
                  <p className="preview-title">Preview (first {PREVIEW_ROW_COUNT} rows from data start)</p>
                  <div className="preview-table-wrap">
                    <table className="preview-table">
                      <thead>
                        <tr>
                          <th>Row</th>
                          {columnOptions.map((columnOption) => (
                            <th key={`preview-head-${columnOption.index}`}>{columnOption.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, previewIndex) => (
                          <tr key={`preview-row-${dataStartRowIndex + previewIndex}`}>
                            <td>{dataStartRowIndex + previewIndex + 1}</td>
                            {columnOptions.map((columnOption) => (
                              <td key={`preview-cell-${previewIndex}-${columnOption.index}`}>
                                {row[columnOption.index] || ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </section>
    </section>
  );
}
