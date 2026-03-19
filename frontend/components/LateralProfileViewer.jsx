"use client";

import { useEffect, useMemo, useState } from "react";

const PROFILE_WIDTH = 1200;
const PROFILE_HEIGHT = 360;
const PROFILE_PADDING = {
  top: 24,
  right: 88,
  bottom: 48,
  left: 108,
};

const GRID_STEPS = [1, 5, 10];

function toFiniteNumber(value) {
  const cleaned = String(value ?? "").replace(/,/g, "").trim();
  if (!cleaned) {
    return null;
  }

  const numericValue = Number(cleaned);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function formatNumber(value, digits = 1) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "—";
  }

  return numericValue.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function getNiceTickStep(minValue, maxValue, targetTickCount = 6) {
  const range = Math.max(maxValue - minValue, 1);
  const rawStep = range / Math.max(targetTickCount, 1);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;

  if (normalized <= 1) {
    return 1 * magnitude;
  }

  if (normalized <= 2) {
    return 2 * magnitude;
  }

  if (normalized <= 5) {
    return 5 * magnitude;
  }

  return 10 * magnitude;
}

function clamp(value, minValue, maxValue) {
  return Math.min(Math.max(value, minValue), maxValue);
}

function buildPath(points, getX, getY) {
  if (!Array.isArray(points) || points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${getX(point).toFixed(2)} ${getY(point).toFixed(2)}`)
    .join(" ");
}

export default function LateralProfileViewer({ points, selectedPointIndex = null, onSelectPoint }) {
  const [draftStartMd, setDraftStartMd] = useState("");
  const [appliedStartMd, setAppliedStartMd] = useState(null);
  const [verticalGridStep, setVerticalGridStep] = useState(1);
  const [inputError, setInputError] = useState("");

  const validPoints = useMemo(() => {
    if (!Array.isArray(points)) {
      return [];
    }

    return points
      .map((point, index) => ({
        ...point,
        pointIndex: Number.isInteger(point?.pointIndex) ? point.pointIndex : index,
        md: toFiniteNumber(point?.md),
        tvd: toFiniteNumber(point?.tvd ?? point?.z),
      }))
      .filter((point) => point.md !== null && point.tvd !== null)
      .sort((left, right) => left.md - right.md);
  }, [points]);

  const mdBounds = useMemo(() => {
    if (validPoints.length === 0) {
      return { minMd: null, maxMd: null };
    }

    return {
      minMd: validPoints[0].md,
      maxMd: validPoints[validPoints.length - 1].md,
    };
  }, [validPoints]);

  useEffect(() => {
    if (validPoints.length === 0) {
      setDraftStartMd("");
      setAppliedStartMd(null);
      setInputError("");
      return;
    }

    const defaultStartMd = validPoints[0].md;
    setDraftStartMd(String(defaultStartMd));
    setAppliedStartMd(defaultStartMd);
    setInputError("");
  }, [validPoints]);

  const profilePoints = useMemo(() => {
    if (appliedStartMd === null) {
      return validPoints;
    }

    return validPoints.filter((point) => point.md >= appliedStartMd);
  }, [appliedStartMd, validPoints]);

  const selectedProfilePoint = useMemo(
    () => profilePoints.find((point) => point.pointIndex === selectedPointIndex) ?? null,
    [profilePoints, selectedPointIndex],
  );

  const shallowestPoint = useMemo(() => {
    if (profilePoints.length === 0) {
      return null;
    }

    return profilePoints.reduce((shallowest, point) => (point.tvd < shallowest.tvd ? point : shallowest), profilePoints[0]);
  }, [profilePoints]);

  const deepestPoint = useMemo(() => {
    if (profilePoints.length === 0) {
      return null;
    }

    return profilePoints.reduce((deepest, point) => (point.tvd > deepest.tvd ? point : deepest), profilePoints[0]);
  }, [profilePoints]);

  const chartMetrics = useMemo(() => {
    if (profilePoints.length < 2) {
      return null;
    }

    const minMd = profilePoints[0].md;
    const maxMd = profilePoints[profilePoints.length - 1].md;
    const minTvd = Math.min(...profilePoints.map((point) => point.tvd));
    const maxTvd = Math.max(...profilePoints.map((point) => point.tvd));
    const snappedMinTvd = Math.floor(minTvd / verticalGridStep) * verticalGridStep;
    const snappedMaxTvd = Math.ceil(maxTvd / verticalGridStep) * verticalGridStep;
    const safeMaxTvd = snappedMaxTvd === snappedMinTvd ? snappedMinTvd + verticalGridStep : snappedMaxTvd;
    const plotWidth = PROFILE_WIDTH - PROFILE_PADDING.left - PROFILE_PADDING.right;
    const plotHeight = PROFILE_HEIGHT - PROFILE_PADDING.top - PROFILE_PADDING.bottom;
    const mdRange = Math.max(maxMd - minMd, 1);
    const tvdRange = Math.max(safeMaxTvd - snappedMinTvd, verticalGridStep);
    const mdTickStep = getNiceTickStep(minMd, maxMd, 6);
    const mdTicks = [];
    const tvdTicks = [];

    for (
      let tick = Math.floor(minMd / mdTickStep) * mdTickStep;
      tick <= maxMd + mdTickStep * 0.5;
      tick += mdTickStep
    ) {
      if (tick >= minMd - mdTickStep * 0.25) {
        mdTicks.push(Number(tick.toFixed(6)));
      }
    }

    for (let tick = snappedMinTvd; tick <= safeMaxTvd + verticalGridStep * 0.5; tick += verticalGridStep) {
      tvdTicks.push(Number(tick.toFixed(6)));
    }

    const getX = (point) => PROFILE_PADDING.left + ((point.md - minMd) / mdRange) * plotWidth;
    const getY = (point) => PROFILE_PADDING.top + ((point.tvd - snappedMinTvd) / tvdRange) * plotHeight;

    return {
      minMd,
      maxMd,
      minTvd,
      maxTvd,
      snappedMinTvd,
      snappedMaxTvd: safeMaxTvd,
      mdTicks,
      tvdTicks,
      getX,
      getY,
      path: buildPath(profilePoints, getX, getY),
      tvdDelta: maxTvd - minTvd,
    };
  }, [profilePoints, verticalGridStep]);

  const selectedOutsideRange = selectedPointIndex !== null && selectedProfilePoint === null;

  const handleApplyStartMd = () => {
    if (mdBounds.minMd === null || mdBounds.maxMd === null) {
      return;
    }

    const parsedStartMd = toFiniteNumber(draftStartMd);

    if (parsedStartMd === null) {
      setInputError("Enter a numeric MD to begin the 2D lateral view.");
      return;
    }

    const clampedStartMd = clamp(parsedStartMd, mdBounds.minMd, mdBounds.maxMd);
    setAppliedStartMd(clampedStartMd);
    setDraftStartMd(String(clampedStartMd));
    setInputError("");
  };

  if (validPoints.length < 2) {
    return <div className="lateral-profile-empty">Upload a valid trajectory to inspect the lateral profile.</div>;
  }

  return (
    <section className="lateral-profile-panel" aria-label="2D lateral profile viewer">
      <div className="lateral-profile-header">
        <div>
          <p className="lateral-profile-eyebrow">Lateral Detail View</p>
          <h2 className="lateral-profile-title">2D Lateral Profile</h2>
          <p className="lateral-profile-subtitle">Use whole-well MD on the x-axis and a fine TVD grid to inspect lateral shape.</p>
        </div>

        <div className="lateral-profile-scale-group" aria-label="Vertical TVD grid scale">
          {GRID_STEPS.map((step) => (
            <button
              key={`profile-grid-${step}`}
              type="button"
              className={`viewer-tool-btn ${verticalGridStep === step ? "is-active" : ""}`}
              onClick={() => setVerticalGridStep(step)}
            >
              {step} ft Grid
            </button>
          ))}
        </div>
      </div>

      <div className="lateral-profile-toolbar">
        <label className="mapper-field lateral-profile-start-field" htmlFor="lateral-start-md-input">
          <span>Beginning of lateral MD (ft)</span>
          <input
            id="lateral-start-md-input"
            type="number"
            className="mapper-input"
            value={draftStartMd}
            onChange={(event) => setDraftStartMd(event.target.value)}
            placeholder="Enter MD to begin 2D view"
          />
        </label>

        <div className="lateral-profile-toolbar-actions">
          <button type="button" className="secondary-btn" onClick={handleApplyStartMd}>
            Update View
          </button>
          {selectedPointIndex !== null ? (
            <button type="button" className="secondary-btn" onClick={() => onSelectPoint?.(null)}>
              Clear Selected Point
            </button>
          ) : null}
        </div>
      </div>

      {inputError ? <p className="warning lateral-profile-message">{inputError}</p> : null}

      <div className="lateral-profile-body">
        <aside className="lateral-profile-info-rail" aria-label="2D lateral profile summary">
          <article className="lateral-profile-card">
            <p className="lateral-profile-card-title">Visible MD Window</p>
            <p className="lateral-profile-card-value">
              {formatNumber(appliedStartMd, 0)} - {formatNumber(chartMetrics?.maxMd, 0)} ft
            </p>
          </article>

          <article className="lateral-profile-card">
            <p className="lateral-profile-card-title">Visible TVD Delta</p>
            <p className="lateral-profile-card-value">{formatNumber(chartMetrics?.tvdDelta, 2)} ft</p>
          </article>

          <article className="lateral-profile-card">
            <p className="lateral-profile-card-title">Selected MD</p>
            <p className="lateral-profile-card-value">
              {selectedProfilePoint ? `${formatNumber(selectedProfilePoint.md, 1)} ft` : "—"}
            </p>
          </article>

          <article className="lateral-profile-card">
            <p className="lateral-profile-card-title">Shallowest Visible Point</p>
            <p className="lateral-profile-card-detail">
              MD {formatNumber(shallowestPoint?.md, 1)} ft | TVD {formatNumber(shallowestPoint?.tvd, 2)} ft
            </p>
          </article>

          <article className="lateral-profile-card">
            <p className="lateral-profile-card-title">Deepest Visible Point</p>
            <p className="lateral-profile-card-detail">
              MD {formatNumber(deepestPoint?.md, 1)} ft | TVD {formatNumber(deepestPoint?.tvd, 2)} ft
            </p>
          </article>

          <article className="lateral-profile-card">
            <p className="lateral-profile-card-title">Selected Survey Point</p>
            <p className="lateral-profile-card-detail">
              {selectedProfilePoint
                ? `MD ${formatNumber(selectedProfilePoint.md, 1)} ft | TVD ${formatNumber(selectedProfilePoint.tvd, 2)} ft`
                : selectedOutsideRange
                  ? "Selected point is outside the current lateral MD window."
                  : "Click a point in 2D or 3D to inspect it here."}
            </p>
          </article>
        </aside>

        <div className="lateral-profile-plot-panel">
          {chartMetrics && profilePoints.length >= 2 ? (
            <div className="lateral-profile-chart-shell">
              <svg
                className="lateral-profile-chart"
                viewBox={`0 0 ${PROFILE_WIDTH} ${PROFILE_HEIGHT}`}
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-label="Lateral profile plot of TVD versus MD"
              >
                <rect
                  x={PROFILE_PADDING.left}
                  y={PROFILE_PADDING.top}
                  width={PROFILE_WIDTH - PROFILE_PADDING.left - PROFILE_PADDING.right}
                  height={PROFILE_HEIGHT - PROFILE_PADDING.top - PROFILE_PADDING.bottom}
                  className="lateral-profile-plot-bg"
                />

                {chartMetrics.tvdTicks.map((tick) => {
                  const y = chartMetrics.getY({ md: chartMetrics.minMd, tvd: tick });
                  return (
                    <g key={`tvd-tick-${tick}`}>
                      <line
                        x1={PROFILE_PADDING.left}
                        x2={PROFILE_WIDTH - PROFILE_PADDING.right}
                        y1={y}
                        y2={y}
                        className="lateral-profile-gridline lateral-profile-gridline-horizontal"
                      />
                      <text x={PROFILE_PADDING.left - 14} y={y + 5} textAnchor="end" className="lateral-profile-axis-text">
                        {formatNumber(tick, 0)}
                      </text>
                    </g>
                  );
                })}

                {chartMetrics.mdTicks.map((tick) => {
                  const x = chartMetrics.getX({ md: tick, tvd: chartMetrics.snappedMinTvd });
                  return (
                    <g key={`md-tick-${tick}`}>
                      <line
                        x1={x}
                        x2={x}
                        y1={PROFILE_PADDING.top}
                        y2={PROFILE_HEIGHT - PROFILE_PADDING.bottom}
                        className="lateral-profile-gridline lateral-profile-gridline-vertical"
                      />
                      <text
                        x={x}
                        y={PROFILE_HEIGHT - PROFILE_PADDING.bottom + 20}
                        textAnchor="middle"
                        className="lateral-profile-axis-text"
                      >
                        {formatNumber(tick, 0)}
                      </text>
                    </g>
                  );
                })}

                <line
                  x1={PROFILE_PADDING.left}
                  x2={PROFILE_WIDTH - PROFILE_PADDING.right}
                  y1={PROFILE_HEIGHT - PROFILE_PADDING.bottom}
                  y2={PROFILE_HEIGHT - PROFILE_PADDING.bottom}
                  className="lateral-profile-axis-line"
                />
                <line
                  x1={PROFILE_PADDING.left}
                  x2={PROFILE_PADDING.left}
                  y1={PROFILE_PADDING.top}
                  y2={PROFILE_HEIGHT - PROFILE_PADDING.bottom}
                  className="lateral-profile-axis-line"
                />

                <text
                  x={(PROFILE_WIDTH - PROFILE_PADDING.right + PROFILE_PADDING.left) / 2}
                  y={PROFILE_HEIGHT - 10}
                  textAnchor="middle"
                  className="lateral-profile-axis-label"
                >
                  Measured Depth (MD, ft)
                </text>
                <text
                  x={30}
                  y={PROFILE_PADDING.top - 4}
                  textAnchor="start"
                  className="lateral-profile-axis-label lateral-profile-axis-label-y"
                >
                  TVD (ft)
                </text>

                <path d={chartMetrics.path} className="lateral-profile-line" />

                {profilePoints.map((point) => {
                  const isSelected = point.pointIndex === selectedPointIndex;
                  const isShallowest = shallowestPoint?.pointIndex === point.pointIndex;
                  const isDeepest = deepestPoint?.pointIndex === point.pointIndex;
                  const circleClassName = [
                    "lateral-profile-point",
                    isSelected ? "is-selected" : "",
                    isShallowest ? "is-shallowest" : "",
                    isDeepest ? "is-deepest" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <circle
                      key={`profile-point-${point.pointIndex}`}
                      cx={chartMetrics.getX(point)}
                      cy={chartMetrics.getY(point)}
                      r={isSelected ? 5.4 : isShallowest || isDeepest ? 4.6 : 2.4}
                      className={circleClassName}
                      onClick={() => onSelectPoint?.(point.pointIndex)}
                    />
                  );
                })}
              </svg>
            </div>
          ) : (
            <div className="lateral-profile-empty">The selected MD window does not contain enough survey points to draw a lateral profile.</div>
          )}
        </div>
      </div>
    </section>
  );
}
