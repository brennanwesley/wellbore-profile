"use client";

import { useCallback, useState } from "react";
import WellTrajectoryViewer from "@/components/WellTrajectoryViewer";
import SurveyImportMapper from "@/components/import/SurveyImportMapper";

const DEFAULT_FORMATION_COLORS = ["#2f7d63", "#2c6e9f", "#a86d1e", "#8f3f3f", "#596f2a"];

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

const INITIAL_FILE_STATUS = "Upload a survey file, map the required fields, then apply trajectory.";

function createFormationRow(index = 0) {
  return {
    id: `formation-${Date.now()}-${Math.round(Math.random() * 100000)}`,
    name: "",
    top: "",
    bottom: "",
    color: DEFAULT_FORMATION_COLORS[index % DEFAULT_FORMATION_COLORS.length],
    opacity: 0.22,
    visible: true,
  };
}

export default function HomePage() {
  const [points, setPoints] = useState([]);
  const [wellMetadata, setWellMetadata] = useState(INITIAL_METADATA);
  const [formations, setFormations] = useState([]);
  const [importMapperKey, setImportMapperKey] = useState(0);
  const [detectedMetadata, setDetectedMetadata] = useState(null);
  const [fileStatus, setFileStatus] = useState(INITIAL_FILE_STATUS);
  const [importWarnings, setImportWarnings] = useState([]);

  const addFormationRow = useCallback(() => {
    setFormations((previous) => [...previous, createFormationRow(previous.length)]);
  }, []);

  const updateFormationField = useCallback((formationId, fieldName, value) => {
    setFormations((previous) =>
      previous.map((formation) =>
        formation.id === formationId ? { ...formation, [fieldName]: value } : formation,
      ),
    );
  }, []);

  const removeFormationRow = useCallback((formationId) => {
    setFormations((previous) => previous.filter((formation) => formation.id !== formationId));
  }, []);

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

  const clearWorkspace = useCallback(() => {
    setPoints([]);
    setWellMetadata(INITIAL_METADATA);
    setFormations([]);
    setDetectedMetadata(null);
    setFileStatus(INITIAL_FILE_STATUS);
    setImportWarnings([]);
    setImportMapperKey((previous) => previous + 1);
  }, []);

  const hasEnoughPoints = points.length >= 2;
  const titleWellName = wellMetadata.wellName || "Manual Well Metadata";

  return (
    <main className="page-shell">
      <section className="panel control-panel">
        <div className="title-row">
          <div>
            <p className="well-name">{titleWellName}</p>
            <h1>Wellbore Profile</h1>
            <p className="subtitle">Phase 1: Format-agnostic survey mapper + isometric trajectory viewer</p>
          </div>

          <button type="button" className="secondary-btn clear-workspace-btn" onClick={clearWorkspace}>
            Clear Current Well
          </button>
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

        <section className="formation-block" aria-label="Formation intervals">
          <div className="formation-header">
            <p className="metadata-title">Formation intervals (TVD ft)</p>
            <button type="button" className="secondary-btn formation-add-btn" onClick={addFormationRow}>
              Add formation
            </button>
          </div>

          {formations.length === 0 ? (
            <p className="helper-note">No formation intervals yet. Add rows to overlay intervals on trajectory.</p>
          ) : (
            <div className="formation-list">
              {formations.map((formation, index) => (
                <article key={formation.id} className="formation-row">
                  <p className="formation-index">Formation {index + 1}</p>
                  <div className="formation-grid">
                    <label className="mapper-field" htmlFor={`formation-name-${formation.id}`}>
                      <span>Name</span>
                      <input
                        id={`formation-name-${formation.id}`}
                        type="text"
                        className="mapper-input"
                        value={formation.name}
                        onChange={(event) => {
                          updateFormationField(formation.id, "name", event.target.value);
                        }}
                        placeholder="e.g. Wolfcamp A"
                      />
                    </label>

                    <label className="mapper-field" htmlFor={`formation-top-${formation.id}`}>
                      <span>Top TVD (ft)</span>
                      <input
                        id={`formation-top-${formation.id}`}
                        type="number"
                        className="mapper-input"
                        value={formation.top}
                        onChange={(event) => {
                          updateFormationField(formation.id, "top", event.target.value);
                        }}
                        placeholder="e.g. 8400"
                      />
                    </label>

                    <label className="mapper-field" htmlFor={`formation-bottom-${formation.id}`}>
                      <span>Bottom TVD (ft)</span>
                      <input
                        id={`formation-bottom-${formation.id}`}
                        type="number"
                        className="mapper-input"
                        value={formation.bottom}
                        onChange={(event) => {
                          updateFormationField(formation.id, "bottom", event.target.value);
                        }}
                        placeholder="e.g. 9250"
                      />
                    </label>
                  </div>

                  <div className="formation-row-actions">
                    <label className="formation-visible-toggle" htmlFor={`formation-visible-${formation.id}`}>
                      <input
                        id={`formation-visible-${formation.id}`}
                        type="checkbox"
                        checked={Boolean(formation.visible)}
                        onChange={(event) => {
                          updateFormationField(formation.id, "visible", event.target.checked);
                        }}
                      />
                      <span>Visible</span>
                    </label>

                    <label className="formation-color-field" htmlFor={`formation-color-${formation.id}`}>
                      <span>Color</span>
                      <input
                        id={`formation-color-${formation.id}`}
                        type="color"
                        value={formation.color}
                        onChange={(event) => {
                          updateFormationField(formation.id, "color", event.target.value);
                        }}
                      />
                    </label>

                    <label className="formation-opacity-field" htmlFor={`formation-opacity-${formation.id}`}>
                      <span>Opacity ({Math.round((Number(formation.opacity ?? 0.22) || 0.22) * 100)}%)</span>
                      <input
                        id={`formation-opacity-${formation.id}`}
                        type="range"
                        min="0.05"
                        max="0.9"
                        step="0.05"
                        value={Number(formation.opacity ?? 0.22)}
                        onChange={(event) => {
                          updateFormationField(formation.id, "opacity", Number(event.target.value));
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      className="secondary-btn formation-remove-btn"
                      onClick={() => removeFormationRow(formation.id)}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <SurveyImportMapper key={importMapperKey} onApplyTrajectory={handleApplyTrajectory} />

        <div className="helper-text">
          <p className="file-status">{fileStatus}</p>
          <p>Detected points: {points.length}</p>
          <p>Formation rows: {formations.length}</p>
          {!hasEnoughPoints ? <p className="warning">Add at least 2 valid points to render.</p> : null}
          {importWarnings.map((warningText) => (
            <p key={warningText} className="warning">
              {warningText}
            </p>
          ))}
        </div>
      </section>

      <section className="panel viewer-panel">
        <WellTrajectoryViewer points={points} formations={formations} />
      </section>
    </main>
  );
}
