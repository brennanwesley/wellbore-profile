"use client";

import { useCallback, useMemo, useState } from "react";
import AppRouteNav from "@/components/AppRouteNav";
import DsuWellSetupCard from "@/components/DsuWellSetupCard";
import MultiWellTrajectoryViewer from "@/components/MultiWellTrajectoryViewer";
import { buildDsuSurfaceLayout, DSU_PROXIMITY_WARNING_FT } from "@/lib/dsuSpatial";

const WELL_COLORS = ["#0f7b8a", "#2f85b0", "#f29b3f", "#8f3f3f", "#2f7d63", "#6d5fd4"];
const INITIAL_WELL_STATUS = "Upload a survey, validate the field mapping, and add this well to the DSU view.";
const INITIAL_WELL_COUNT = 2;

function createWell(index = 0) {
  return {
    id: `dsu-well-${Date.now()}-${Math.round(Math.random() * 100000)}-${index}`,
    name: "",
    latitude: "",
    longitude: "",
    color: WELL_COLORS[index % WELL_COLORS.length],
    points: [],
    importWarnings: [],
    fileStatus: INITIAL_WELL_STATUS,
    importMapperKey: 0,
  };
}

function createInitialWells() {
  return Array.from({ length: INITIAL_WELL_COUNT }, (_, index) => createWell(index));
}

function formatFeet(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return "—";
  }

  return numericValue.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
}

export default function MultiWellDsuWorkspace() {
  const [wells, setWells] = useState(() => createInitialWells());

  const surfaceLayout = useMemo(() => buildDsuSurfaceLayout(wells), [wells]);
  const surveysLoadedCount = wells.filter((well) => well.points.length >= 2).length;
  const readyWellCount = surfaceLayout.readyWells.length;
  const missingSurfaceCount = wells.filter(
    (well) => well.points.length >= 2 && (!String(well.latitude).trim() || !String(well.longitude).trim()),
  ).length;

  const handleFieldChange = useCallback((wellId, fieldName, value) => {
    setWells((previous) => previous.map((well) => (well.id === wellId ? { ...well, [fieldName]: value } : well)));
  }, []);

  const handleAddWell = useCallback(() => {
    setWells((previous) => [...previous, createWell(previous.length)]);
  }, []);

  const handleResetWell = useCallback((wellId) => {
    setWells((previous) =>
      previous.map((well, index) =>
        well.id === wellId
          ? {
              ...createWell(index),
              id: well.id,
              color: well.color,
              importMapperKey: well.importMapperKey + 1,
            }
          : well,
      ),
    );
  }, []);

  const handleRemoveWell = useCallback((wellId) => {
    setWells((previous) => previous.filter((well) => well.id !== wellId));
  }, []);

  const handleResetWorkspace = useCallback(() => {
    setWells(createInitialWells());
  }, []);

  const handleApplyTrajectory = useCallback(
    (wellId) => ({ points, summary, sourceLabel, warnings, metadataSuggestions }) => {
      setWells((previous) =>
        previous.map((well) => {
          if (well.id !== wellId) {
            return well;
          }

          const suggestedWellName = String(metadataSuggestions?.wellName ?? "").trim();
          const nextWellName = well.name || suggestedWellName;
          const summaryText = summary
            ? `${sourceLabel} applied: ${summary.validRowCount} valid rows, ${summary.invalidRowCount} invalid rows.`
            : `${sourceLabel} applied.`;

          return {
            ...well,
            name: nextWellName,
            points,
            importWarnings: Array.isArray(warnings) ? warnings : [],
            fileStatus: summaryText,
          };
        }),
      );
    },
    [],
  );

  return (
    <>
      <AppRouteNav currentPath="/dsu-view" variant="floating" />
      <main className="page-shell">
        <section className="panel control-panel">
          <section className="metadata-block header-info-block">
            <div className="title-row">
              <div className="header-info-title">
                <p className="well-name">Multi-Well DSU Viewer</p>
                <h1>Build a Combined 3D Well Set</h1>
                <p className="subtitle">
                  Add wells one at a time, set each surface location, and overlay the trajectories in a single 3D DSU
                  scene.
                </p>
              </div>
              <button type="button" className="primary-btn" onClick={handleAddWell}>
                Add Well
              </button>
            </div>

            <div className="dsu-summary-grid">
              <article className="dsu-summary-card">
                <p className="dsu-summary-label">Total Wells</p>
                <p className="dsu-summary-value">{wells.length}</p>
              </article>
              <article className="dsu-summary-card">
                <p className="dsu-summary-label">Survey Loaded</p>
                <p className="dsu-summary-value">{surveysLoadedCount}</p>
              </article>
              <article className="dsu-summary-card">
                <p className="dsu-summary-label">Ready in 3D</p>
                <p className="dsu-summary-value">{readyWellCount}</p>
              </article>
            </div>

            {surfaceLayout.shouldWarnWideSpacing && surfaceLayout.farthestPair ? (
              <p className="warning">
                Surface spacing warning: {surfaceLayout.farthestPair.firstWellName} and {surfaceLayout.farthestPair.secondWellName}
                are about {formatFeet(surfaceLayout.farthestPair.distanceFt)} ft apart, which is above the current
                {` ${formatFeet(DSU_PROXIMITY_WARNING_FT)} ft`} review threshold.
              </p>
            ) : null}

            {missingSurfaceCount > 0 ? (
              <p className="helper-note">
                {missingSurfaceCount} survey-loaded well(s) still need latitude and longitude before they can be placed in the DSU view.
              </p>
            ) : null}

            {readyWellCount < 2 ? (
              <p className="helper-note">
                Upload at least two ready wells for a true DSU comparison. A single ready well will still render so you can verify import and placement.
              </p>
            ) : null}
          </section>

          <div className="dsu-toolbar-row">
            <button type="button" className="secondary-btn clear-workspace-btn" onClick={handleResetWorkspace}>
              Reset All Wells
            </button>
          </div>

          <section className="dsu-well-list" aria-label="DSU well setup list">
            {wells.map((well, index) => (
              <DsuWellSetupCard
                key={well.id}
                well={well}
                index={index}
                canRemove={wells.length > 1}
                onFieldChange={handleFieldChange}
                onReset={handleResetWell}
                onRemove={handleRemoveWell}
                onApplyTrajectory={handleApplyTrajectory(well.id)}
              />
            ))}
          </section>
        </section>

        <section className="panel viewer-panel dsu-viewer-panel">
          <MultiWellTrajectoryViewer wells={surfaceLayout.readyWells} />
        </section>
      </main>
    </>
  );
}
