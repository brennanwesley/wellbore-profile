"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import LateralProfileViewer from "@/components/LateralProfileViewer";
import WellTrajectoryViewer from "@/components/WellTrajectoryViewer";
import SurveyImportMapper from "@/components/import/SurveyImportMapper";

const DEFAULT_FORMATION_COLORS = ["#2f7d63", "#2c6e9f", "#a86d1e", "#8f3f3f", "#596f2a"];
const DEFAULT_VIEWER_TOP_SPLIT = 58;
const MIN_VIEWER_TOP_SPLIT = 40;
const MAX_VIEWER_TOP_SPLIT = 82;

function hasMetadataValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function clamp(value, minValue, maxValue) {
  return Math.min(Math.max(value, minValue), maxValue);
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

const INITIAL_FILE_STATUS = "Use Step 1 to upload a survey, Step 2 to validate mapping, and Step 3 to view the wellbore profile.";

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
  const [selectedPointIndex, setSelectedPointIndex] = useState(null);
  const [viewerTopSplit, setViewerTopSplit] = useState(DEFAULT_VIEWER_TOP_SPLIT);
  const [isViewerSplitDragging, setIsViewerSplitDragging] = useState(false);
  const [wellMetadata, setWellMetadata] = useState(INITIAL_METADATA);
  const [formations, setFormations] = useState([]);
  const [importMapperKey, setImportMapperKey] = useState(0);
  const [fileStatus, setFileStatus] = useState(INITIAL_FILE_STATUS);
  const [importWarnings, setImportWarnings] = useState([]);
  const viewerWorkspaceRef = useRef(null);
  const viewerSplitDragStateRef = useRef(null);

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
      setSelectedPointIndex(null);
      setImportWarnings(Array.isArray(warnings) ? warnings : []);

      const normalizedSuggestions = normalizeMetadataSuggestions(metadataSuggestions);

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

  const clearWorkspace = useCallback(() => {
    setPoints([]);
    setSelectedPointIndex(null);
    setViewerTopSplit(DEFAULT_VIEWER_TOP_SPLIT);
    setWellMetadata(INITIAL_METADATA);
    setFormations([]);
    setFileStatus(INITIAL_FILE_STATUS);
    setImportWarnings([]);
    setImportMapperKey((previous) => previous + 1);
  }, []);

  const nudgeViewerSplit = useCallback((delta) => {
    setViewerTopSplit((previous) => clamp(previous + delta, MIN_VIEWER_TOP_SPLIT, MAX_VIEWER_TOP_SPLIT));
  }, []);

  const handleViewerSplitPointerDown = useCallback((event) => {
    if (typeof window !== "undefined" && window.innerWidth <= 980) {
      return;
    }

    const workspace = viewerWorkspaceRef.current;
    if (!workspace) {
      return;
    }

    event.preventDefault();

    const bounds = workspace.getBoundingClientRect();
    viewerSplitDragStateRef.current = {
      top: bounds.top,
      height: bounds.height,
    };
    setIsViewerSplitDragging(true);
  }, []);

  useEffect(() => {
    if (!isViewerSplitDragging) {
      return undefined;
    }

    const handlePointerMove = (event) => {
      const dragState = viewerSplitDragStateRef.current;

      if (!dragState || dragState.height <= 0) {
        return;
      }

      const nextTopShare = ((event.clientY - dragState.top) / dragState.height) * 100;
      setViewerTopSplit(clamp(nextTopShare, MIN_VIEWER_TOP_SPLIT, MAX_VIEWER_TOP_SPLIT));
    };

    const handlePointerUp = () => {
      viewerSplitDragStateRef.current = null;
      setIsViewerSplitDragging(false);
    };

    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isViewerSplitDragging]);

  const hasEnoughPoints = points.length >= 2;
  const titleWellName = wellMetadata.wellName || "Upload Directional Survey";

  return (
    <main className="page-shell">
      <section className="panel control-panel">
        <section className="metadata-block header-info-block" aria-label="Header information">
          <div className="header-info-title">
            <p className="well-name">{titleWellName}</p>
            <h1>Wellbore Profile</h1>
          </div>

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
                placeholder="Upload Directional Survey"
              />
            </label>
          </div>

          <div className="metadata-grid metadata-grid-two-up">
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

          <p className="helper-note">Imported metadata fills empty fields automatically. You can still edit any value manually.</p>
        </section>

        <SurveyImportMapper key={importMapperKey} onApplyTrajectory={handleApplyTrajectory} />

        <section className="formation-block" aria-label="Formation intervals">
          <div className="formation-header">
            <p className="metadata-title">Formation Intervals TVD (ft)</p>
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

        <button type="button" className="secondary-btn clear-workspace-btn" onClick={clearWorkspace}>
          Clear Current Well
        </button>

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
        <div
          ref={viewerWorkspaceRef}
          className={`viewer-workspace ${isViewerSplitDragging ? "is-resizing" : ""}`}
          style={{ "--viewer-top-split": `${viewerTopSplit}%` }}
        >
          <div className="viewer-pane viewer-pane-3d">
            <WellTrajectoryViewer
              points={points}
              formations={formations}
              selectedPointIndex={selectedPointIndex}
              onSelectPoint={setSelectedPointIndex}
            />
          </div>

          <button
            type="button"
            className="viewer-splitter"
            onPointerDown={handleViewerSplitPointerDown}
            onDoubleClick={() => setViewerTopSplit(DEFAULT_VIEWER_TOP_SPLIT)}
            onKeyDown={(event) => {
              if (event.key === "ArrowUp") {
                event.preventDefault();
                nudgeViewerSplit(-2);
              }

              if (event.key === "ArrowDown") {
                event.preventDefault();
                nudgeViewerSplit(2);
              }

              if (event.key === "Home") {
                event.preventDefault();
                setViewerTopSplit(MIN_VIEWER_TOP_SPLIT);
              }

              if (event.key === "End") {
                event.preventDefault();
                setViewerTopSplit(MAX_VIEWER_TOP_SPLIT);
              }
            }}
            aria-label="Resize the 3D viewer and lateral detail panes"
            title="Drag to resize panes. Double-click to reset the default split."
          >
            <span className="viewer-splitter-handle" aria-hidden="true" />
          </button>

          <div className="viewer-pane viewer-pane-2d">
            <LateralProfileViewer
              points={points}
              selectedPointIndex={selectedPointIndex}
              onSelectPoint={setSelectedPointIndex}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
