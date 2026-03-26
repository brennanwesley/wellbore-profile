"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_PROFILE_WIDTH = 980;
const DEFAULT_PROFILE_HEIGHT = 360;
const MIN_PROFILE_WIDTH = 420;
const MIN_PROFILE_HEIGHT = 240;

const GRID_STEPS = [5, 10, 20];

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

export default function LateralProfileViewer({ points, appliedStartMd = null, selectedPointIndex = null, onSelectPoint }) {
  const [verticalGridStep, setVerticalGridStep] = useState(5);
  const [chartSize, setChartSize] = useState({
    width: DEFAULT_PROFILE_WIDTH,
    height: DEFAULT_PROFILE_HEIGHT,
  });
  const chartShellRef = useRef(null);

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

  const chartPadding = useMemo(() => {
    const left = clamp(Math.round(chartSize.width * 0.1), 88, 118);
    const right = clamp(Math.round(chartSize.width * 0.05), 62, 92);
    const top = clamp(Math.round(chartSize.height * 0.09), 24, 34);
    const bottom = clamp(Math.round(chartSize.height * 0.23), 72, 92);

    return {
      top,
      right,
      bottom,
      left,
    };
  }, [chartSize.height, chartSize.width]);

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
    const plotWidth = Math.max(chartSize.width - chartPadding.left - chartPadding.right, 160);
    const plotHeight = Math.max(chartSize.height - chartPadding.top - chartPadding.bottom, 120);
    const mdRange = Math.max(maxMd - minMd, 1);
    const tvdRange = Math.max(safeMaxTvd - snappedMinTvd, verticalGridStep);
    const targetMdTickCount = clamp(Math.round(plotWidth / 150), 4, 9);
    const mdTickStep = getNiceTickStep(minMd, maxMd, targetMdTickCount);
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

    const getX = (point) => chartPadding.left + ((point.md - minMd) / mdRange) * plotWidth;
    const getY = (point) => chartPadding.top + ((point.tvd - snappedMinTvd) / tvdRange) * plotHeight;

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
  }, [chartPadding.left, chartPadding.right, chartPadding.top, chartPadding.bottom, chartSize.height, chartSize.width, profilePoints, verticalGridStep]);

  const canRenderChart = chartMetrics !== null && profilePoints.length >= 2;

  useEffect(() => {
    if (!canRenderChart || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const chartShellElement = chartShellRef.current;

    if (!chartShellElement) {
      return undefined;
    }

    const updateChartSize = (width, height) => {
      setChartSize({
        width: Math.max(Math.round(width), MIN_PROFILE_WIDTH),
        height: Math.max(Math.round(height), MIN_PROFILE_HEIGHT),
      });
    };

    const initialBounds = chartShellElement.getBoundingClientRect();
    updateChartSize(initialBounds.width, initialBounds.height);

    const resizeObserver = new ResizeObserver((entries) => {
      const nextEntry = entries[0];

      if (!nextEntry) {
        return;
      }

      updateChartSize(nextEntry.contentRect.width, nextEntry.contentRect.height);
    });

    resizeObserver.observe(chartShellElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [canRenderChart]);

  if (validPoints.length < 2) {
    return <div className="lateral-profile-empty">Upload a valid trajectory to inspect the lateral profile.</div>;
  }

  return (
    <section className="lateral-profile-panel" aria-label="2D lateral profile viewer">
      <div className="lateral-profile-header">
        <h2 className="lateral-profile-title">Lateral Profile</h2>

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

      <div className="lateral-profile-plot-panel lateral-profile-plot-panel-full">
          {canRenderChart ? (
            <div ref={chartShellRef} className="lateral-profile-chart-shell">
              <svg
                className="lateral-profile-chart"
                viewBox={`0 0 ${chartSize.width} ${chartSize.height}`}
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-label="Lateral profile plot of TVD versus MD"
              >
                <rect
                  x={chartPadding.left}
                  y={chartPadding.top}
                  width={Math.max(chartSize.width - chartPadding.left - chartPadding.right, 160)}
                  height={Math.max(chartSize.height - chartPadding.top - chartPadding.bottom, 120)}
                  className="lateral-profile-plot-bg"
                />

                {chartMetrics.tvdTicks.map((tick) => {
                  const y = chartMetrics.getY({ md: chartMetrics.minMd, tvd: tick });
                  return (
                    <g key={`tvd-tick-${tick}`}>
                      <line
                        x1={chartPadding.left}
                        x2={chartSize.width - chartPadding.right}
                        y1={y}
                        y2={y}
                        className="lateral-profile-gridline lateral-profile-gridline-horizontal"
                      />
                      <text x={chartPadding.left - 12} y={y + 5} textAnchor="end" className="lateral-profile-axis-text">
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
                        y1={chartPadding.top}
                        y2={chartSize.height - chartPadding.bottom}
                        className="lateral-profile-gridline lateral-profile-gridline-vertical"
                      />
                      <text
                        x={x}
                        y={chartSize.height - chartPadding.bottom + 16}
                        textAnchor="middle"
                        className="lateral-profile-axis-text"
                      >
                        {formatNumber(tick, 0)}
                      </text>
                    </g>
                  );
                })}

                <line
                  x1={chartPadding.left}
                  x2={chartSize.width - chartPadding.right}
                  y1={chartSize.height - chartPadding.bottom}
                  y2={chartSize.height - chartPadding.bottom}
                  className="lateral-profile-axis-line"
                />
                <line
                  x1={chartPadding.left}
                  x2={chartPadding.left}
                  y1={chartPadding.top}
                  y2={chartSize.height - chartPadding.bottom}
                  className="lateral-profile-axis-line"
                />

                <text
                  x={(chartSize.width - chartPadding.right + chartPadding.left) / 2}
                  y={chartSize.height - 32}
                  textAnchor="middle"
                  className="lateral-profile-axis-label"
                >
                  Measured Depth (MD, ft)
                </text>
                <text
                  x={22}
                  y={chartPadding.top - 6}
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
    </section>
  );
}
