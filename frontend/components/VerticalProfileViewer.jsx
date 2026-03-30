"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_PROFILE_WIDTH = 980;
const DEFAULT_PROFILE_HEIGHT = 360;
const MIN_PROFILE_WIDTH = 420;
const MIN_PROFILE_HEIGHT = 240;
const HORIZONTAL_GRID_STEPS = [5, 10, 20];
const TVD_GRID_STEPS = [1000, 500, 100];

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

export default function VerticalProfileViewer({
  points,
  verticalReferenceOrigin,
  selectedPointIndex = null,
  onSelectPoint,
  appliedStartMd = null,
  appliedEndMd = null,
  horizontalExaggeration = 1,
}) {
  const [horizontalGridStep, setHorizontalGridStep] = useState(5);
  const [verticalGridStep, setVerticalGridStep] = useState(1000);
  const [chartSize, setChartSize] = useState({
    width: DEFAULT_PROFILE_WIDTH,
    height: DEFAULT_PROFILE_HEIGHT,
  });
  const chartShellRef = useRef(null);

  const validPoints = useMemo(() => {
    if (!Array.isArray(points)) {
      return [];
    }

    const originX = toFiniteNumber(verticalReferenceOrigin?.x);
    const originY = toFiniteNumber(verticalReferenceOrigin?.y);

    if (originX === null || originY === null) {
      return [];
    }

    const normalizedPoints = points
      .map((point, index) => ({
        ...point,
        pointIndex: Number.isInteger(point?.pointIndex) ? point.pointIndex : index,
        md: toFiniteNumber(point?.md),
        tvd: toFiniteNumber(point?.tvd ?? point?.z),
        x: toFiniteNumber(point?.x),
        y: toFiniteNumber(point?.y),
      }))
      .filter((point) => point.md !== null && point.tvd !== null && point.x !== null && point.y !== null)
      .sort((left, right) => left.md - right.md);

    if (normalizedPoints.length === 0) {
      return [];
    }

    const deepestPoint = normalizedPoints[normalizedPoints.length - 1];
    const deepestDx = deepestPoint.x - originX;
    const deepestDy = deepestPoint.y - originY;
    const deepestMagnitude = Math.hypot(deepestDx, deepestDy);
    const fallbackPoint = normalizedPoints.reduce(
      (bestPoint, point) => {
        const offset = Math.hypot(point.x - originX, point.y - originY);

        if (!bestPoint || offset > bestPoint.offset) {
          return { point, offset };
        }

        return bestPoint;
      },
      null,
    );
    const directionSource =
      deepestMagnitude >= 1e-6
        ? { x: deepestDx, y: deepestDy, magnitude: deepestMagnitude }
        : fallbackPoint && fallbackPoint.offset >= 1e-6
          ? {
              x: fallbackPoint.point.x - originX,
              y: fallbackPoint.point.y - originY,
              magnitude: fallbackPoint.offset,
            }
          : { x: 1, y: 0, magnitude: 1 };
    const directionX = directionSource.x / directionSource.magnitude;
    const directionY = directionSource.y / directionSource.magnitude;

    return normalizedPoints.map((point) => {
      const deltaX = point.x - originX;
      const deltaY = point.y - originY;
      const sectionOffset = deltaX * directionX + deltaY * directionY;
      const radialOffset = Math.hypot(deltaX, deltaY);

      return {
        ...point,
        sectionOffset,
        plottedOffset: sectionOffset * Math.max(horizontalExaggeration, 1),
        radialOffset,
      };
    });
  }, [horizontalExaggeration, points, verticalReferenceOrigin?.x, verticalReferenceOrigin?.y]);

  const chartPadding = useMemo(() => {
    const left = clamp(Math.round(chartSize.width * 0.12), 102, 132);
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

  const selectedProfilePoint = useMemo(
    () => validPoints.find((point) => point.pointIndex === selectedPointIndex) ?? null,
    [selectedPointIndex, validPoints],
  );

  const shallowestPoint = useMemo(() => {
    if (validPoints.length === 0) {
      return null;
    }

    return validPoints.reduce((shallowest, point) => (point.tvd < shallowest.tvd ? point : shallowest), validPoints[0]);
  }, [validPoints]);

  const deepestPoint = useMemo(() => {
    if (validPoints.length === 0) {
      return null;
    }

    return validPoints.reduce((deepest, point) => (point.tvd > deepest.tvd ? point : deepest), validPoints[0]);
  }, [validPoints]);

  const chartMetrics = useMemo(() => {
    if (validPoints.length < 2) {
      return null;
    }

    const minOffset = Math.min(...validPoints.map((point) => point.plottedOffset), 0);
    const maxOffset = Math.max(...validPoints.map((point) => point.plottedOffset), 0);
    const minTvd = Math.min(...validPoints.map((point) => point.tvd));
    const maxTvd = Math.max(...validPoints.map((point) => point.tvd));
    const snappedMinOffset = Math.floor(minOffset / horizontalGridStep) * horizontalGridStep;
    const snappedMaxOffset = Math.ceil(maxOffset / horizontalGridStep) * horizontalGridStep;
    const safeMinOffset = snappedMinOffset === snappedMaxOffset ? snappedMinOffset - horizontalGridStep : snappedMinOffset;
    const safeMaxOffset = snappedMinOffset === snappedMaxOffset ? snappedMaxOffset + horizontalGridStep : snappedMaxOffset;
    const plotWidth = Math.max(chartSize.width - chartPadding.left - chartPadding.right, 160);
    const plotHeight = Math.max(chartSize.height - chartPadding.top - chartPadding.bottom, 120);
    const offsetRange = Math.max(safeMaxOffset - safeMinOffset, horizontalGridStep);
    const tvdRange = Math.max(maxTvd - minTvd, 1);
    const offsetTicks = [];
    const tvdTicks = [];

    for (let tick = safeMinOffset; tick <= safeMaxOffset + horizontalGridStep * 0.5; tick += horizontalGridStep) {
      offsetTicks.push(Number(tick.toFixed(6)));
    }

    for (
      let tick = Math.floor(minTvd / verticalGridStep) * verticalGridStep;
      tick <= maxTvd + verticalGridStep * 0.5;
      tick += verticalGridStep
    ) {
      if (tick >= minTvd - verticalGridStep * 0.25) {
        tvdTicks.push(Number(tick.toFixed(6)));
      }
    }

    const getX = (point) => chartPadding.left + ((point.plottedOffset - safeMinOffset) / offsetRange) * plotWidth;
    const getY = (point) => chartPadding.top + ((point.tvd - minTvd) / tvdRange) * plotHeight;
    const zeroOffsetX = chartPadding.left + ((0 - safeMinOffset) / offsetRange) * plotWidth;

    return {
      minTvd,
      maxTvd,
      safeMinOffset,
      safeMaxOffset,
      offsetTicks,
      tvdTicks,
      getX,
      getY,
      zeroOffsetX,
      path: buildPath(validPoints, getX, getY),
    };
  }, [chartPadding.bottom, chartPadding.left, chartPadding.right, chartPadding.top, chartSize.height, chartSize.width, horizontalGridStep, validPoints, verticalGridStep]);

  const canRenderChart = chartMetrics !== null && validPoints.length >= 2;

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
    return <div className="lateral-profile-empty">Apply a vertical MD window with at least 2 survey points to inspect the vertical profile.</div>;
  }

  return (
    <section className="lateral-profile-panel" aria-label="2D vertical profile viewer">
      <div className="lateral-profile-header">
        <div>
          <h2 className="lateral-profile-title">Vertical Profile</h2>
          <p className="lateral-profile-subtitle">
            {formatNumber(appliedStartMd, 0)} - {formatNumber(appliedEndMd, 0)} ft MD window
          </p>
        </div>

        <div className="lateral-profile-scale-group" aria-label="Vertical profile grid controls">
          {HORIZONTAL_GRID_STEPS.map((step) => (
            <button
              key={`vertical-profile-grid-${step}`}
              type="button"
              className={`viewer-tool-btn ${horizontalGridStep === step ? "is-active" : ""}`}
              onClick={() => setHorizontalGridStep(step)}
            >
              X: {step} ft
            </button>
          ))}

          {TVD_GRID_STEPS.map((step) => (
            <button
              key={`vertical-profile-tvd-grid-${step}`}
              type="button"
              className={`viewer-tool-btn ${verticalGridStep === step ? "is-active" : ""}`}
              onClick={() => setVerticalGridStep(step)}
            >
              Y: {step} ft
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
              aria-label="Vertical profile plot of TVD versus projected horizontal offset"
            >
              <rect
                x={chartPadding.left}
                y={chartPadding.top}
                width={Math.max(chartSize.width - chartPadding.left - chartPadding.right, 160)}
                height={Math.max(chartSize.height - chartPadding.top - chartPadding.bottom, 120)}
                className="lateral-profile-plot-bg"
              />

              {chartMetrics.tvdTicks.map((tick) => {
                const y = chartMetrics.getY({ plottedOffset: 0, tvd: tick });
                return (
                  <g key={`vertical-tvd-tick-${tick}`}>
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

              {chartMetrics.offsetTicks.map((tick) => {
                const x = chartMetrics.getX({ plottedOffset: tick, tvd: chartMetrics.minTvd });
                return (
                  <g key={`vertical-offset-tick-${tick}`}>
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
              <line
                x1={chartMetrics.zeroOffsetX}
                x2={chartMetrics.zeroOffsetX}
                y1={chartPadding.top}
                y2={chartSize.height - chartPadding.bottom}
                className="vertical-profile-reference-line"
              />

              <text
                x={(chartSize.width - chartPadding.right + chartPadding.left) / 2}
                y={chartSize.height - 32}
                textAnchor="middle"
                className="lateral-profile-axis-label"
              >
                Section Offset from True Vertical (ft)
              </text>
              <text
                x={34}
                y={chartPadding.top - 14}
                textAnchor="start"
                className="lateral-profile-axis-label lateral-profile-axis-label-y"
              >
                TVD (ft)
              </text>
              <text
                x={chartMetrics.zeroOffsetX + 8}
                y={chartPadding.top + 16}
                textAnchor="start"
                className="vertical-profile-reference-label"
              >
                True Vertical
              </text>

              <path d={chartMetrics.path} className="vertical-profile-line" />

              {validPoints.map((point) => {
                const isSelected = point.pointIndex === selectedPointIndex;
                const isShallowest = shallowestPoint?.pointIndex === point.pointIndex;
                const isDeepest = deepestPoint?.pointIndex === point.pointIndex;
                const circleClassName = [
                  "vertical-profile-point",
                  isSelected ? "is-selected" : "",
                  isShallowest ? "is-shallowest" : "",
                  isDeepest ? "is-deepest" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <circle
                    key={`vertical-profile-point-${point.pointIndex}`}
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
          <div className="lateral-profile-empty">The selected vertical MD window does not contain enough survey points to draw a vertical profile.</div>
        )}
      </div>

      <div className="vertical-profile-summary-row" aria-label="Vertical profile summary">
        <span className="vertical-profile-summary-pill">Selected Offset: {formatNumber(selectedProfilePoint?.radialOffset, 1)} ft</span>
        <span className="vertical-profile-summary-pill">Max Offset: {formatNumber(Math.max(...validPoints.map((point) => point.radialOffset)), 1)} ft</span>
        <span className="vertical-profile-summary-pill">Display: {formatNumber(horizontalExaggeration, 1)}x</span>
      </div>
    </section>
  );
}
