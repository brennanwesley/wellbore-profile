"use client";

import { useCallback, useMemo, useState } from "react";
import AppRouteNav from "@/components/AppRouteNav";
import WellTrajectoryViewer from "@/components/WellTrajectoryViewer";
import SurveyImportMapper from "@/components/import/SurveyImportMapper";
import {
  DEFAULT_DLS_THRESHOLD_INPUTS,
  DLS_CATEGORY,
  classifyDls,
  getImportedDls,
  parseDlsThresholds,
  summarizeDls,
} from "@/lib/dlsThresholds";
import {
  buildSharedFrame,
  filterStationsByMdWindow,
  getMdRange,
  mergeMdRanges,
  resolveMdWindow,
  sortStationsByMd,
} from "@/lib/surveyComparison";

const SURVEY_SLOTS = [
  {
    key: "drilling",
    title: "Drilling Survey",
    shortTitle: "drilling survey",
    description: "Original MWD/drilling survey, typically ~100 ft stations.",
  },
  {
    key: "gyro",
    title: "Gyro Survey",
    shortTitle: "gyro survey",
    description: "Newer gyro survey, typically ~5-15 ft stations.",
  },
];

const EMPTY_SURVEY = { points: [], sourceLabel: "", validRowCount: 0, warnings: [] };
const COMPARISON_ENDPOINT_COLORS = { start: "#0d5e14", end: "#33424d" };
const DLS_UNITS = "deg/100ft";

const DLS_STYLES = {
  [DLS_CATEGORY.HIGH]: { color: "#d1242f", opacity: 1, scale: 1.7, legend: "High DLS" },
  [DLS_CATEGORY.WARNING]: { color: "#f2b705", opacity: 1, scale: 1.45, legend: "Warning DLS" },
  [DLS_CATEGORY.NORMAL]: { color: "#3f7d9e", opacity: 0.45, scale: 1, legend: "Normal" },
  [DLS_CATEGORY.NO_DATA]: { color: "#9aa6ae", opacity: 0.5, scale: 1, legend: "No imported DLS" },
};

function formatNumber(value, digits = 0) {
  const numericValue = Number(value);

  if (value === null || value === undefined || !Number.isFinite(numericValue)) {
    return "—";
  }

  return numericValue.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatMdRange(range) {
  return range ? `${formatNumber(range.minMd)} – ${formatNumber(range.maxMd)} ft` : "—";
}

function getDepthGuideStep(frame) {
  const tvdRange = frame ? frame.maxTvd - frame.minTvd : 0;
  const steps = [10, 20, 50, 100, 200, 500, 1000];
  return steps.find((step) => tvdRange / step <= 12) ?? 1000;
}

function describeCategory(category, thresholds) {
  if (category === DLS_CATEGORY.NO_DATA) {
    return "No imported DLS value";
  }

  if (!thresholds.isValid) {
    return "Not flagged (thresholds invalid)";
  }

  if (category === DLS_CATEGORY.HIGH) {
    return `High: > ${formatNumber(thresholds.red, 2)} ${DLS_UNITS}`;
  }

  if (category === DLS_CATEGORY.WARNING) {
    return `Warning: > ${formatNumber(thresholds.yellow, 2)} to ≤ ${formatNumber(thresholds.red, 2)} ${DLS_UNITS}`;
  }

  return `Normal: ≤ ${formatNumber(thresholds.yellow, 2)} ${DLS_UNITS}`;
}

export default function SurveyComparisonWorkspace() {
  const [surveys, setSurveys] = useState({ drilling: EMPTY_SURVEY, gyro: EMPTY_SURVEY });
  const [mapperKeys, setMapperKeys] = useState({ drilling: 0, gyro: 0 });
  const [openPanels, setOpenPanels] = useState({ drilling: true, gyro: true });
  const [selectedPoints, setSelectedPoints] = useState({ drilling: null, gyro: null });
  const [mdInputs, setMdInputs] = useState({ start: null, end: null });
  const [appliedMdWindow, setAppliedMdWindow] = useState(null);
  const [mdError, setMdError] = useState("");
  const [thresholdInputs, setThresholdInputs] = useState(DEFAULT_DLS_THRESHOLD_INPUTS);

  const stations = useMemo(
    () => ({
      drilling: sortStationsByMd(surveys.drilling.points),
      gyro: sortStationsByMd(surveys.gyro.points),
    }),
    [surveys],
  );

  const mdRanges = useMemo(
    () => ({ drilling: getMdRange(stations.drilling), gyro: getMdRange(stations.gyro) }),
    [stations],
  );

  const combinedMdRange = useMemo(() => mergeMdRanges(mdRanges.drilling, mdRanges.gyro), [mdRanges]);

  const activeMdWindow = useMemo(() => {
    if (!combinedMdRange) {
      return null;
    }

    return appliedMdWindow ?? { start: combinedMdRange.minMd, end: combinedMdRange.maxMd };
  }, [appliedMdWindow, combinedMdRange]);

  const visibleStations = useMemo(
    () => ({
      drilling: filterStationsByMdWindow(stations.drilling, activeMdWindow),
      gyro: filterStationsByMdWindow(stations.gyro, activeMdWindow),
    }),
    [activeMdWindow, stations],
  );

  const sharedFrame = useMemo(
    () => buildSharedFrame([visibleStations.drilling, visibleStations.gyro]),
    [visibleStations],
  );

  const thresholds = useMemo(
    () => parseDlsThresholds(thresholdInputs.red, thresholdInputs.yellow),
    [thresholdInputs.red, thresholdInputs.yellow],
  );

  const getPointAppearance = useCallback(
    (point) => {
      const category = classifyDls(getImportedDls(point), thresholds);
      return { ...DLS_STYLES[category], category, label: describeCategory(category, thresholds) };
    },
    [thresholds],
  );

  const dlsSummaries = useMemo(
    () => ({
      drilling: summarizeDls(visibleStations.drilling, thresholds),
      gyro: summarizeDls(visibleStations.gyro, thresholds),
    }),
    [thresholds, visibleStations],
  );

  const firstStationMds = {
    drilling: stations.drilling[0]?.md ?? null,
    gyro: stations.gyro[0]?.md ?? null,
  };
  const hasDifferentStartMds =
    firstStationMds.drilling !== null &&
    firstStationMds.gyro !== null &&
    Math.abs(firstStationMds.drilling - firstStationMds.gyro) > 0.5;

  const handleApplySurvey = useCallback(
    (slotKey) => ({ points, summary, sourceLabel, warnings }) => {
      setSurveys((previous) => ({
        ...previous,
        [slotKey]: {
          points: Array.isArray(points) ? points : [],
          sourceLabel: String(sourceLabel ?? "").replace(/^File:\s*/, ""),
          validRowCount: summary?.validRowCount ?? points?.length ?? 0,
          warnings: Array.isArray(warnings) ? warnings : [],
        },
      }));
      setSelectedPoints((previous) => ({ ...previous, [slotKey]: null }));
      setOpenPanels((previous) => ({ ...previous, [slotKey]: false }));
    },
    [],
  );

  const handleClearSurvey = useCallback((slotKey) => {
    setSurveys((previous) => ({ ...previous, [slotKey]: EMPTY_SURVEY }));
    setSelectedPoints((previous) => ({ ...previous, [slotKey]: null }));
    setMapperKeys((previous) => ({ ...previous, [slotKey]: previous[slotKey] + 1 }));
    setOpenPanels((previous) => ({ ...previous, [slotKey]: true }));
  }, []);

  const applyMdWindow = useCallback(
    (startInput, endInput) => {
      const resolved = resolveMdWindow({ startInput, endInput, bounds: combinedMdRange });

      if (!resolved.isValid) {
        setMdError(resolved.message);
        return;
      }

      setAppliedMdWindow({ start: resolved.start, end: resolved.end });
      setMdInputs({ start: String(resolved.start), end: String(resolved.end) });
      setMdError("");
    },
    [combinedMdRange],
  );

  const handleSubmitMdWindow = useCallback(
    (event) => {
      event.preventDefault();
      applyMdWindow(mdInputs.start ?? String(activeMdWindow?.start ?? ""), mdInputs.end ?? String(activeMdWindow?.end ?? ""));
    },
    [activeMdWindow, applyMdWindow, mdInputs],
  );

  const handleResetMdWindow = useCallback(() => {
    setAppliedMdWindow(null);
    setMdInputs({ start: null, end: null });
    setMdError("");
  }, []);

  const startInputValue = mdInputs.start ?? (activeMdWindow ? String(activeMdWindow.start) : "");
  const endInputValue = mdInputs.end ?? (activeMdWindow ? String(activeMdWindow.end) : "");
  const depthGuideStep = getDepthGuideStep(sharedFrame);

  return (
    <>
      <AppRouteNav currentPath="/survey-compare" variant="floating" />
      <main className="page-shell compare-page-shell">
        <section className="panel control-panel">
          <section className="metadata-block header-info-block" aria-label="Survey comparison overview">
            <div className="header-info-title">
              <p className="well-name">Survey QA</p>
              <h1>Gyro vs. Drilling Survey</h1>
            </div>
            <p className="helper-note">
              Compare the original drilling survey against a newer gyro survey and spot localized high-DLS intervals.
              Files are processed in your browser and are never uploaded or stored.
            </p>
          </section>

          {SURVEY_SLOTS.map((slot) => {
            const survey = surveys[slot.key];
            const isLoaded = survey.points.length > 0;

            return (
              <details
                key={slot.key}
                className="lateral-profile-data-panel compare-survey-panel"
                open={openPanels[slot.key]}
                onToggle={(event) => {
                  const isOpen = event.currentTarget.open;
                  setOpenPanels((previous) => (previous[slot.key] === isOpen ? previous : { ...previous, [slot.key]: isOpen }));
                }}
              >
                <summary className="lateral-profile-data-summary compare-survey-summary">
                  <span className={`compare-survey-badge compare-survey-badge-${slot.key}`}>{slot.title}</span>
                  <span className="compare-survey-status">
                    {isLoaded ? `${survey.validRowCount} stations · MD ${formatMdRange(mdRanges[slot.key])}` : "Not loaded"}
                  </span>
                </summary>

                <div className="compare-survey-body">
                  <p className="helper-note">
                    {isLoaded ? `Loaded: ${survey.sourceLabel}. Upload a new file below to replace it.` : slot.description}
                  </p>
                  <SurveyImportMapper
                    key={mapperKeys[slot.key]}
                    onApplyTrajectory={handleApplySurvey(slot.key)}
                    applyButtonLabel={`Load ${slot.title}`}
                  />
                  {survey.warnings.map((warning) => (
                    <p key={warning} className="warning">
                      {warning}
                    </p>
                  ))}
                  {isLoaded ? (
                    <button type="button" className="secondary-btn clear-workspace-btn" onClick={() => handleClearSurvey(slot.key)}>
                      Clear {slot.title}
                    </button>
                  ) : null}
                </div>
              </details>
            );
          })}

          <section className="metadata-block compare-settings-block" aria-label="Synchronized MD window">
            <p className="metadata-title">Synchronized MD Window</p>
            <form className="compare-md-form" onSubmit={handleSubmitMdWindow}>
              <div className="metadata-grid metadata-grid-two-up">
                <label className="mapper-field" htmlFor="compare-start-md">
                  <span>Start MD (ft)</span>
                  <input
                    id="compare-start-md"
                    type="number"
                    className="mapper-input"
                    value={startInputValue}
                    disabled={!combinedMdRange}
                    onChange={(event) => setMdInputs((previous) => ({ ...previous, start: event.target.value }))}
                  />
                </label>
                <label className="mapper-field" htmlFor="compare-end-md">
                  <span>End MD (ft)</span>
                  <input
                    id="compare-end-md"
                    type="number"
                    className="mapper-input"
                    value={endInputValue}
                    disabled={!combinedMdRange}
                    onChange={(event) => setMdInputs((previous) => ({ ...previous, end: event.target.value }))}
                  />
                </label>
              </div>
              <div className="compare-button-row">
                <button type="submit" className="primary-btn" disabled={!combinedMdRange}>
                  Apply to Both Views
                </button>
                <button type="button" className="secondary-btn" onClick={handleResetMdWindow} disabled={!combinedMdRange}>
                  Full Range
                </button>
              </div>
              <div className="compare-button-row">
                {SURVEY_SLOTS.map((slot) => (
                  <button
                    key={`fit-${slot.key}`}
                    type="button"
                    className="viewer-tool-btn"
                    disabled={!mdRanges[slot.key]}
                    onClick={() => applyMdWindow(mdRanges[slot.key].minMd, mdRanges[slot.key].maxMd)}
                  >
                    Fit {slot.title.replace(" Survey", "")} Coverage
                  </button>
                ))}
              </div>
            </form>
            {mdError ? <p className="warning">{mdError}</p> : null}
            <p className="helper-note">
              Both views show the same MD window: {activeMdWindow ? `${formatNumber(activeMdWindow.start)} – ${formatNumber(activeMdWindow.end)} ft` : "—"}.
              The window may extend past either survey&apos;s coverage; only imported stations are drawn.
            </p>
          </section>

          <section className="metadata-block compare-settings-block" aria-label="DLS thresholds">
            <p className="metadata-title">DLS Thresholds ({DLS_UNITS})</p>
            <div className="metadata-grid metadata-grid-two-up">
              <label className="mapper-field" htmlFor="compare-red-threshold">
                <span>Red: DLS &gt; X</span>
                <input
                  id="compare-red-threshold"
                  type="number"
                  min="0"
                  step="0.1"
                  className={`mapper-input ${thresholds.isValid ? "" : "is-invalid"}`}
                  value={thresholdInputs.red}
                  onChange={(event) => setThresholdInputs((previous) => ({ ...previous, red: event.target.value }))}
                />
              </label>
              <label className="mapper-field" htmlFor="compare-yellow-threshold">
                <span>Yellow: DLS &gt; Y</span>
                <input
                  id="compare-yellow-threshold"
                  type="number"
                  min="0"
                  step="0.1"
                  className={`mapper-input ${thresholds.isValid ? "" : "is-invalid"}`}
                  value={thresholdInputs.yellow}
                  onChange={(event) => setThresholdInputs((previous) => ({ ...previous, yellow: event.target.value }))}
                />
              </label>
            </div>
            {thresholds.isValid ? null : <p className="warning">{thresholds.message} Highlighting is paused.</p>}

            <ul className="compare-legend" aria-label="DLS color legend">
              {[DLS_CATEGORY.HIGH, DLS_CATEGORY.WARNING, DLS_CATEGORY.NORMAL, DLS_CATEGORY.NO_DATA].map((category) => (
                <li key={category}>
                  <span
                    className={`compare-legend-swatch compare-legend-swatch-${category}`}
                    style={{ backgroundColor: DLS_STYLES[category].color }}
                    aria-hidden="true"
                  />
                  <span>{describeCategory(category, thresholds)}</span>
                </li>
              ))}
            </ul>
            <p className="helper-note">
              Colors use each station&apos;s imported DLS only; nothing is calculated or interpolated. Trajectory lines simply
              connect stations and do not indicate DLS between them.
            </p>
          </section>

          <section className="metadata-block compare-settings-block" aria-label="Comparison reference notes">
            <p className="metadata-title">Reference</p>
            <p className="helper-note">
              Both viewers share one scale, orientation, and TVD axis. Each trajectory is drawn from its own first imported
              station; neither survey is shifted to match the other. Green sphere: first station in window. Dark sphere: last
              station in window.
            </p>
            <p className="helper-note">
              Viewer controls: left-drag rotate, scroll zoom, right-drag pan. Hover a station to inspect it, or click to pin it in
              the inspector.
            </p>
            {hasDifferentStartMds ? (
              <p className="warning">
                The surveys start at different MDs (drilling {formatNumber(firstStationMds.drilling, 1)} ft, gyro{" "}
                {formatNumber(firstStationMds.gyro, 1)} ft). Horizontal positions are relative to each survey&apos;s own first
                station, so lateral offsets between the views may not be directly comparable.
              </p>
            ) : null}
          </section>
        </section>

        <section className="panel viewer-panel compare-viewer-panel">
          <div className="compare-viewer-grid">
            {SURVEY_SLOTS.map((slot) => {
              const survey = surveys[slot.key];
              const visible = visibleStations[slot.key];
              const summary = dlsSummaries[slot.key];
              const isLoaded = survey.points.length > 0;
              const emptyStateMessage = !isLoaded
                ? `Upload a ${slot.shortTitle} in the sidebar to view it here.`
                : `No ${slot.shortTitle} stations in MD ${formatNumber(activeMdWindow?.start)} – ${formatNumber(activeMdWindow?.end)} ft. This survey covers MD ${formatMdRange(mdRanges[slot.key])}.`;

              return (
                <article key={slot.key} className="compare-viewer-column" aria-label={`${slot.title} 3D viewer`}>
                  <header className="compare-viewer-header">
                    <div className="compare-viewer-title-row">
                      <span className={`compare-survey-badge compare-survey-badge-${slot.key}`}>{slot.title}</span>
                      <span className="compare-viewer-source">{isLoaded ? survey.sourceLabel : "Not loaded"}</span>
                    </div>
                    {isLoaded ? (
                      <p className="compare-viewer-stats">
                        <span>
                          {visible.length} of {stations[slot.key].length} stations in window
                        </span>
                        <span>Coverage MD {formatMdRange(mdRanges[slot.key])}</span>
                        <span className="compare-stat-high">{summary[DLS_CATEGORY.HIGH]} red</span>
                        <span className="compare-stat-warning">{summary[DLS_CATEGORY.WARNING]} yellow</span>
                        <span>
                          Max DLS{" "}
                          {summary.maxDls
                            ? `${formatNumber(summary.maxDls.value, 2)} @ ${formatNumber(summary.maxDls.md, 0)} ft MD`
                            : "— (no DLS imported)"}
                        </span>
                      </p>
                    ) : null}
                  </header>
                  <div className="compare-viewer-body">
                    <WellTrajectoryViewer
                      points={visible}
                      selectedPointIndex={selectedPoints[slot.key]}
                      onSelectPoint={(pointIndex) => setSelectedPoints((previous) => ({ ...previous, [slot.key]: pointIndex }))}
                      frameBounds={sharedFrame}
                      getPointAppearance={getPointAppearance}
                      depthGuideStep={depthGuideStep}
                      endpointColors={COMPARISON_ENDPOINT_COLORS}
                      emptyStateMessage={emptyStateMessage}
                      compact
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
