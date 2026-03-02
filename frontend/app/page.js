"use client";

import { useCallback, useState } from "react";
import WellTrajectoryViewer from "@/components/WellTrajectoryViewer";
import SurveyImportMapper from "@/components/import/SurveyImportMapper";

function hasMetadataValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function normalizeMetadataSuggestions(metadataSuggestions) {
  if (!metadataSuggestions) {
    return null;
  }

  const normalized = {
    wellName: hasMetadataValue(metadataSuggestions.wellName) ? String(metadataSuggestions.wellName).trim() : "",
    kellyBushing:
      hasMetadataValue(metadataSuggestions.kellyBushing) && Number.isFinite(Number(metadataSuggestions.kellyBushing))
        ? String(metadataSuggestions.kellyBushing)
        : "",
    groundElevation:
      hasMetadataValue(metadataSuggestions.groundElevation) && Number.isFinite(Number(metadataSuggestions.groundElevation))
        ? String(metadataSuggestions.groundElevation)
        : "",
  };

  if (!normalized.wellName && !normalized.kellyBushing && !normalized.groundElevation) {
    return null;
  }

  return normalized;
}

const INITIAL_METADATA = {
  wellName: "",
  kellyBushing: "",
  groundElevation: "",
};

export default function HomePage() {
  const [points, setPoints] = useState([]);
  const [wellMetadata, setWellMetadata] = useState(INITIAL_METADATA);
  const [detectedMetadata, setDetectedMetadata] = useState(null);
  const [fileStatus, setFileStatus] = useState(
    "Upload a survey file, map the required fields, then apply trajectory.",
  );
  const [importWarnings, setImportWarnings] = useState([]);

  const handleApplyTrajectory = useCallback(
    ({ points: mappedPoints, summary, sourceLabel, warnings, metadataSuggestions }) => {
      setPoints(mappedPoints);
      setImportWarnings(Array.isArray(warnings) ? warnings : []);

      const normalizedSuggestions = normalizeMetadataSuggestions(metadataSuggestions);
      setDetectedMetadata(normalizedSuggestions);

      if (normalizedSuggestions) {
        setWellMetadata((previous) => ({
          wellName: previous.wellName || normalizedSuggestions.wellName,
          kellyBushing: previous.kellyBushing || normalizedSuggestions.kellyBushing,
          groundElevation: previous.groundElevation || normalizedSuggestions.groundElevation,
        }));
      }

      if (!summary) {
        setFileStatus(`${sourceLabel} applied.`);
        return;
      }

      setFileStatus(
        `${sourceLabel} applied: ${summary.validRowCount} valid rows, ${summary.invalidRowCount} invalid rows.`,
      );
    },
    [],
  );

  const applyDetectedMetadata = useCallback(() => {
    if (!detectedMetadata) {
      return;
    }

    setWellMetadata({
      wellName: detectedMetadata.wellName,
      kellyBushing: detectedMetadata.kellyBushing,
      groundElevation: detectedMetadata.groundElevation,
    });
  }, [detectedMetadata]);

  const hasEnoughPoints = points.length >= 2;
  const titleWellName = wellMetadata.wellName || "Manual Well Metadata";

  return (
    <main className="page-shell">
      <section className="panel control-panel">
        <div>
          <p className="well-name">{titleWellName}</p>
          <h1>Wellbore Profile</h1>
          <p className="subtitle">Phase 1: Format-agnostic survey mapper + isometric trajectory viewer</p>
        </div>

        <section className="metadata-block" aria-label="Well metadata">
          <p className="metadata-title">Well metadata (manual override)</p>

          <div className="metadata-grid">
            <label className="mapper-field" htmlFor="well-name-input">
              <span>Well Name</span>
              <input
                id="well-name-input"
                type="text"
                className="mapper-input"
                value={wellMetadata.wellName}
                onChange={(event) => {
                  const value = event.target.value;
                  setWellMetadata((previous) => ({ ...previous, wellName: value }));
                }}
                placeholder="Enter well name"
              />
            </label>

            <label className="mapper-field" htmlFor="kelly-bushing-input">
              <span>Kelly Bushing (ft)</span>
              <input
                id="kelly-bushing-input"
                type="number"
                className="mapper-input"
                value={wellMetadata.kellyBushing}
                onChange={(event) => {
                  const value = event.target.value;
                  setWellMetadata((previous) => ({ ...previous, kellyBushing: value }));
                }}
                placeholder="e.g. 2424"
              />
            </label>

            <label className="mapper-field" htmlFor="ground-elev-input">
              <span>Ground Elevation (ft)</span>
              <input
                id="ground-elev-input"
                type="number"
                className="mapper-input"
                value={wellMetadata.groundElevation}
                onChange={(event) => {
                  const value = event.target.value;
                  setWellMetadata((previous) => ({ ...previous, groundElevation: value }));
                }}
                placeholder="e.g. 2399"
              />
            </label>
          </div>

          {detectedMetadata ? (
            <div className="actions">
              <button type="button" onClick={applyDetectedMetadata} className="secondary-btn">
                Use imported metadata values
              </button>
            </div>
          ) : null}

          <p className="helper-note">Manual edits always override imported metadata suggestions.</p>
        </section>

        <SurveyImportMapper onApplyTrajectory={handleApplyTrajectory} />

        <div className="helper-text">
          <p className="file-status">{fileStatus}</p>
          <p>Detected points: {points.length}</p>
          {!hasEnoughPoints ? <p className="warning">Add at least 2 valid points to render.</p> : null}
          {importWarnings.map((warningText) => (
            <p key={warningText} className="warning">
              {warningText}
            </p>
          ))}
        </div>
      </section>

      <section className="panel viewer-panel">
        <WellTrajectoryViewer points={points} />
      </section>
    </main>
  );
}
