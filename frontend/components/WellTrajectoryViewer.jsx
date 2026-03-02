"use client";

import { Canvas } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";

const ISOMETRIC_POLAR_ANGLE = Math.acos(1 / Math.sqrt(3));
const ISOMETRIC_POLAR_LOCK_EPSILON = 0.0001;

function toFiniteNumber(value) {
  const cleaned = String(value ?? "").replace(/,/g, "").trim();
  if (!cleaned) {
    return null;
  }

  const numericValue = Number(cleaned);
  return Number.isFinite(numericValue) ? numericValue : null;
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

function formatAnnotation(value) {
  const text = String(value ?? "").trim();
  return text || "—";
}

function getBounds(points) {
  const initial = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    minZ: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
    maxZ: Number.NEGATIVE_INFINITY,
  };

  const bounds = points.reduce((acc, point) => {
    acc.minX = Math.min(acc.minX, point.x);
    acc.minY = Math.min(acc.minY, point.y);
    acc.minZ = Math.min(acc.minZ, -point.z);
    acc.maxX = Math.max(acc.maxX, point.x);
    acc.maxY = Math.max(acc.maxY, point.y);
    acc.maxZ = Math.max(acc.maxZ, -point.z);
    return acc;
  }, initial);

  const center = [
    (bounds.minX + bounds.maxX) / 2,
    (bounds.minY + bounds.maxY) / 2,
    (bounds.minZ + bounds.maxZ) / 2,
  ];

  const xSpan = bounds.maxX - bounds.minX;
  const ySpan = bounds.maxY - bounds.minY;
  const zSpan = bounds.maxZ - bounds.minZ;
  const span = Math.max(xSpan, ySpan, zSpan, 1);

  return { center, span };
}

export default function WellTrajectoryViewer({ points, formations = [] }) {
  const [hoverPointIndex, setHoverPointIndex] = useState(null);
  const [pinnedPointIndex, setPinnedPointIndex] = useState(null);
  const hasEnoughPoints = Array.isArray(points) && points.length >= 2;

  useEffect(() => {
    if (hoverPointIndex !== null && (hoverPointIndex < 0 || hoverPointIndex >= points.length)) {
      setHoverPointIndex(null);
    }

    if (pinnedPointIndex !== null && (pinnedPointIndex < 0 || pinnedPointIndex >= points.length)) {
      setPinnedPointIndex(null);
    }
  }, [hoverPointIndex, pinnedPointIndex, points.length]);

  const { center, span } = useMemo(() => {
    if (!hasEnoughPoints) {
      return { center: [0, 0, 0], span: 1 };
    }

    return getBounds(points);
  }, [hasEnoughPoints, points]);

  const linePoints = useMemo(
    () => (hasEnoughPoints ? points.map((point) => [point.x, point.y, -point.z]) : []),
    [hasEnoughPoints, points],
  );

  const shallowestTvd = useMemo(() => {
    if (!hasEnoughPoints) {
      return 0;
    }

    const tvdValues = points
      .map((point) => toFiniteNumber(point.tvd ?? point.z))
      .filter((value) => value !== null);

    if (tvdValues.length === 0) {
      return 0;
    }

    return Math.min(...tvdValues);
  }, [hasEnoughPoints, points]);

  const surfaceGridZ = -shallowestTvd;

  const { minTvd, maxTvd, tvdTicks } = useMemo(() => {
    if (!hasEnoughPoints) {
      return { minTvd: 0, maxTvd: 0, tvdTicks: [0] };
    }

    const tvdValues = points
      .map((point) => toFiniteNumber(point.tvd ?? point.z))
      .filter((value) => value !== null);

    if (tvdValues.length === 0) {
      return { minTvd: 0, maxTvd: 0, tvdTicks: [0] };
    }

    const localMinTvd = Math.min(...tvdValues);
    const localMaxTvd = Math.max(...tvdValues);
    const tickStep = getNiceTickStep(localMinTvd, localMaxTvd);
    const firstTick = Math.floor(localMinTvd / tickStep) * tickStep;
    const lastTick = Math.ceil(localMaxTvd / tickStep) * tickStep;
    const ticks = [];

    for (let tick = firstTick; tick <= lastTick + tickStep * 0.5; tick += tickStep) {
      ticks.push(Number(tick.toFixed(6)));
    }

    return {
      minTvd: localMinTvd,
      maxTvd: localMaxTvd,
      tvdTicks: ticks,
    };
  }, [hasEnoughPoints, points]);

  const formationIntervals = useMemo(() => {
    if (!hasEnoughPoints || !Array.isArray(formations) || formations.length === 0) {
      return [];
    }

    return formations.reduce((acc, formation, formationIndex) => {
      if (!formation || !formation.visible) {
        return acc;
      }

      const topDepth = toFiniteNumber(formation.top);
      const bottomDepth = toFiniteNumber(formation.bottom);

      if (topDepth === null || bottomDepth === null) {
        return acc;
      }

      const minDepth = Math.min(topDepth, bottomDepth);
      const maxDepth = Math.max(topDepth, bottomDepth);
      const segments = [];
      let activeSegment = [];

      points.forEach((point, pointIndex) => {
        const pointTvd = toFiniteNumber(point.tvd ?? point.z);
        const inInterval = pointTvd !== null && pointTvd >= minDepth && pointTvd <= maxDepth;

        if (inInterval) {
          activeSegment.push(linePoints[pointIndex]);
          return;
        }

        if (activeSegment.length >= 2) {
          segments.push(activeSegment);
        }

        activeSegment = [];
      });

      if (activeSegment.length >= 2) {
        segments.push(activeSegment);
      }

      if (segments.length === 0) {
        return acc;
      }

      acc.push({
        id: formation.id ?? `formation-${formationIndex}`,
        name: String(formation.name || `Formation ${formationIndex + 1}`),
        color: formation.color || "#2f7d63",
        top: minDepth,
        bottom: maxDepth,
        segments,
      });

      return acc;
    }, []);
  }, [formations, hasEnoughPoints, linePoints, points]);

  const activePointIndex = pinnedPointIndex ?? hoverPointIndex;
  const activePoint =
    activePointIndex !== null && activePointIndex >= 0 && activePointIndex < points.length
      ? points[activePointIndex]
      : null;
  const activePosition =
    activePointIndex !== null && activePointIndex >= 0 && activePointIndex < linePoints.length
      ? linePoints[activePointIndex]
      : null;

  if (!hasEnoughPoints) {
    return <div className="viewer-empty">No valid trajectory to render yet.</div>;
  }

  const pointMarkerRadius = Math.max(span * 0.006, 1.6);
  const endpointRadius = Math.max(span * 0.018, 6);
  const axisLength = span * 0.8;
  const axisOrigin = [center[0], center[1], surfaceGridZ];

  return (
    <div className="viewer-canvas">
      <Canvas
        onPointerMissed={() => {
          setPinnedPointIndex(null);
          setHoverPointIndex(null);
        }}
        camera={{
          position: [center[0] + span * 1.4, center[1] + span * 0.8, center[2] + span * 1.4],
          up: [0, 0, 1],
          fov: 50,
          near: 0.1,
          far: 100000,
        }}
      >
        <color attach="background" args={["#fff8ea"]} />
        <ambientLight intensity={0.65} />
        <directionalLight position={[span, span, span]} intensity={1.1} />

        <group position={axisOrigin}>
          <axesHelper args={[axisLength]} />
        </group>
        <gridHelper
          args={[span * 2, 20, "#688597", "#b6c3cc"]}
          position={[center[0], center[1], surfaceGridZ]}
          rotation={[Math.PI / 2, 0, 0]}
        />

        <Line points={linePoints} color="#0f7b8a" lineWidth={3} />

        {formationIntervals.flatMap((formation) =>
          formation.segments.map((segmentPoints, segmentIndex) => (
            <Line
              key={`${formation.id}-segment-${segmentIndex}`}
              points={segmentPoints}
              color={formation.color}
              lineWidth={5}
            />
          )),
        )}

        {linePoints.map((position, index) => (
          <mesh
            key={`pt-${index}`}
            position={position}
            onPointerDown={(event) => {
              event.stopPropagation();
              setPinnedPointIndex((currentIndex) => (currentIndex === index ? null : index));
            }}
            onPointerOver={(event) => {
              event.stopPropagation();
              setHoverPointIndex(index);
            }}
            onPointerOut={(event) => {
              event.stopPropagation();
              setHoverPointIndex((currentIndex) => (currentIndex === index ? null : currentIndex));
            }}
          >
            <sphereGeometry args={[pointMarkerRadius, 12, 12]} />
            <meshStandardMaterial
              color={
                index === pinnedPointIndex ? "#f28f3b" : index === hoverPointIndex ? "#e9a963" : "#3f7d9e"
              }
              transparent
              opacity={index === pinnedPointIndex ? 0.95 : index === hoverPointIndex ? 0.78 : 0.45}
            />
          </mesh>
        ))}

        <mesh position={linePoints[0]}>
          <sphereGeometry args={[endpointRadius, 24, 24]} />
          <meshStandardMaterial color="#0d5e14" />
        </mesh>

        <mesh position={linePoints[linePoints.length - 1]}>
          <sphereGeometry args={[endpointRadius, 24, 24]} />
          <meshStandardMaterial color="#c7472f" />
        </mesh>

        {activePoint && activePosition ? (
          <Html position={activePosition} center distanceFactor={14}>
            <div className="depth-pill">
              {pinnedPointIndex !== null ? "Pinned" : "Hover"} | MD: {formatNumber(activePoint.md, 1)} ft | TVD: {formatNumber(activePoint.tvd ?? activePoint.z, 1)} ft
            </div>
          </Html>
        ) : null}

        <Html position={[axisOrigin[0] + axisLength, axisOrigin[1], axisOrigin[2]]} center distanceFactor={20}>
          <div className="axis-tag axis-tag-east">X / E</div>
        </Html>
        <Html position={[axisOrigin[0], axisOrigin[1] + axisLength, axisOrigin[2]]} center distanceFactor={20}>
          <div className="axis-tag axis-tag-north">Y / N</div>
        </Html>
        <Html position={[axisOrigin[0], axisOrigin[1], axisOrigin[2] - axisLength]} center distanceFactor={20}>
          <div className="axis-tag axis-tag-tvd">TVD (+) / -Z</div>
        </Html>

        <OrbitControls
          makeDefault
          target={center}
          enableDamping
          dampingFactor={0.08}
          minPolarAngle={ISOMETRIC_POLAR_ANGLE - ISOMETRIC_POLAR_LOCK_EPSILON}
          maxPolarAngle={ISOMETRIC_POLAR_ANGLE + ISOMETRIC_POLAR_LOCK_EPSILON}
          minAzimuthAngle={-Infinity}
          maxAzimuthAngle={Infinity}
        />
      </Canvas>

      <section className="inspector-card" aria-live="polite">
        <div className="inspector-header">
          <p className="inspector-title">
            {pinnedPointIndex !== null
              ? `Pinned Point #${pinnedPointIndex + 1}`
              : activePointIndex !== null
                ? `Hover Point #${activePointIndex + 1}`
                : "Point Inspector"}
          </p>
          {pinnedPointIndex !== null ? (
            <button type="button" className="secondary-btn inspector-clear-btn" onClick={() => setPinnedPointIndex(null)}>
              Clear Pin
            </button>
          ) : null}
        </div>

        {activePoint ? (
          <dl className="inspector-grid">
            <div>
              <dt>MD (ft)</dt>
              <dd>{formatNumber(activePoint.md, 1)}</dd>
            </div>
            <div>
              <dt>TVD (ft)</dt>
              <dd>{formatNumber(activePoint.tvd ?? activePoint.z, 1)}</dd>
            </div>
            <div>
              <dt>Northing (ft)</dt>
              <dd>{formatNumber(activePoint.northing ?? activePoint.y, 2)}</dd>
            </div>
            <div>
              <dt>Easting (ft)</dt>
              <dd>{formatNumber(activePoint.easting ?? activePoint.x, 2)}</dd>
            </div>
            <div>
              <dt>DLS (deg/100ft)</dt>
              <dd>{formatNumber(activePoint.dls, 2)}</dd>
            </div>
            <div className="inspector-annotation">
              <dt>Annotation</dt>
              <dd>{formatAnnotation(activePoint.annotations)}</dd>
            </div>
          </dl>
        ) : (
          <p className="inspector-empty">
            Click a trajectory point to pin MD/TVD/N/E/DLS/Annotation. Hover previews are temporary.
          </p>
        )}
      </section>

      <section className="tvd-ruler" aria-label="TVD ruler">
        <p className="tvd-ruler-title">TVD Ruler (ft)</p>
        <div className="tvd-ruler-track">
          {tvdTicks.map((tickValue) => {
            const percent =
              maxTvd === minTvd ? 0 : ((tickValue - minTvd) / Math.max(maxTvd - minTvd, 1)) * 100;
            const clampedPercent = Math.max(0, Math.min(100, percent));

            return (
              <div key={`tvd-tick-${tickValue}`} className="tvd-tick" style={{ top: `${clampedPercent}%` }}>
                <span className="tvd-tick-line" />
                <span className="tvd-tick-label">{formatNumber(tickValue, 0)}</span>
              </div>
            );
          })}
        </div>
        <p className="tvd-ruler-range">
          {formatNumber(minTvd, 0)} to {formatNumber(maxTvd, 0)}
        </p>
      </section>

      {formationIntervals.length > 0 ? (
        <section className="formation-legend" aria-label="Visible formations">
          <p className="formation-legend-title">Visible Formations</p>
          <ul className="formation-legend-list">
            {formationIntervals.map((formation) => (
              <li key={`legend-${formation.id}`}>
                <span className="formation-legend-swatch" style={{ backgroundColor: formation.color }} />
                <span>
                  {formation.name}: {formatNumber(formation.top, 0)}-{formatNumber(formation.bottom, 0)} ft TVD
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="viewer-hint">Isometric tilt locked. Drag to rotate full 360° azimuth, scroll to zoom, right-drag to pan.</div>
    </div>
  );
}
