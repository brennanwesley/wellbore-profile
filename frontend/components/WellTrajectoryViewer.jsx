"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Vector3 } from "three";

const ISOMETRIC_POLAR_ANGLE = Math.acos(1 / Math.sqrt(3));
const ISOMETRIC_POLAR_LOCK_EPSILON = 0.0001;
const FREE_POLAR_MIN = 0.08;
const FREE_POLAR_MAX = Math.PI - 0.08;

const AXIS_VECTORS = {
  x: [1, 0, 0],
  y: [0, 1, 0],
  z: [0, 0, 1],
};

const COARSE_DEPTH_GUIDE_STEP = 1000;

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

function formatAnnotation(value) {
  const text = String(value ?? "").trim();
  return text || "—";
}

function clamp(value, minValue, maxValue) {
  return Math.min(Math.max(value, minValue), maxValue);
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

  return { center, span, bounds };
}

function CameraSpinner({ controlsRef, enabled, axis = "z", speed = 0.45 }) {
  const axisVector = useMemo(() => {
    const axisValues = AXIS_VECTORS[axis] || AXIS_VECTORS.z;
    return new Vector3(axisValues[0], axisValues[1], axisValues[2]).normalize();
  }, [axis]);

  useFrame((_, delta) => {
    if (!enabled || !controlsRef.current) {
      return;
    }

    const controls = controlsRef.current;
    const camera = controls.object;
    const target = controls.target;
    const offset = camera.position.clone().sub(target);

    offset.applyAxisAngle(axisVector, delta * speed);
    camera.position.copy(target.clone().add(offset));
    camera.lookAt(target);
    controls.update();
  });

  return null;
}

export default function WellTrajectoryViewer({
  points,
  formations = [],
  selectedPointIndex = null,
  onSelectPoint,
  profileMode = "wellbore",
  depthGuideStep = COARSE_DEPTH_GUIDE_STEP,
  verticalReferenceOrigin = null,
  horizontalExaggeration = 1,
  emptyStateMessage = "No valid trajectory to render yet.",
}) {
  const [hoverPointIndex, setHoverPointIndex] = useState(null);
  const [showDepthGuides, setShowDepthGuides] = useState(false);
  const [showDepthLabels, setShowDepthLabels] = useState(false);
  const [viewMode, setViewMode] = useState("isometric");
  const [spinEnabled, setSpinEnabled] = useState(false);
  const [spinAxis, setSpinAxis] = useState("z");
  const [spinSpeed, setSpinSpeed] = useState(0.45);
  const [viewerResetKey, setViewerResetKey] = useState(0);

  const orbitControlsRef = useRef(null);
  const normalizedPoints = useMemo(
    () =>
      Array.isArray(points)
        ? points.map((point, index) => ({
            ...point,
            pointIndex: Number.isInteger(point?.pointIndex) ? point.pointIndex : index,
          }))
        : [],
    [points],
  );
  const hasEnoughPoints = normalizedPoints.length >= 2;
  const isVerticalProfileMode = profileMode === "vertical";
  const effectiveHorizontalExaggeration = isVerticalProfileMode ? Math.max(horizontalExaggeration, 1) : 1;

  useEffect(() => {
    if (hoverPointIndex !== null && !normalizedPoints.some((point) => point.pointIndex === hoverPointIndex)) {
      setHoverPointIndex(null);
    }
  }, [hoverPointIndex, normalizedPoints]);

  useEffect(() => {
    setViewerResetKey((previous) => previous + 1);
    setSpinEnabled(false);
    setHoverPointIndex(null);
    setShowDepthGuides(false);
    setShowDepthLabels(false);
    setViewMode(isVerticalProfileMode ? "free" : "isometric");
    if (isVerticalProfileMode) {
      setSpinAxis("z");
    }
  }, [isVerticalProfileMode, points]);

  const { center, span, bounds } = useMemo(() => {
    if (!hasEnoughPoints) {
      return {
        center: [0, 0, 0],
        span: 1,
        bounds: {
          minX: -0.5,
          maxX: 0.5,
          minY: -0.5,
          maxY: 0.5,
          minZ: -0.5,
          maxZ: 0.5,
        },
      };
    }

    const originX = toFiniteNumber(verticalReferenceOrigin?.x);
    const originY = toFiniteNumber(verticalReferenceOrigin?.y);
    const renderPoints = normalizedPoints.map((point) => {
      const pointX = toFiniteNumber(point.x);
      const pointY = toFiniteNumber(point.y);

      if (
        !isVerticalProfileMode ||
        effectiveHorizontalExaggeration === 1 ||
        originX === null ||
        originY === null ||
        pointX === null ||
        pointY === null
      ) {
        return point;
      }

      return {
        ...point,
        x: originX + (pointX - originX) * effectiveHorizontalExaggeration,
        y: originY + (pointY - originY) * effectiveHorizontalExaggeration,
      };
    });

    return getBounds(renderPoints);
  }, [effectiveHorizontalExaggeration, hasEnoughPoints, isVerticalProfileMode, normalizedPoints, verticalReferenceOrigin?.x, verticalReferenceOrigin?.y]);

  const linePoints = useMemo(
    () => {
      if (!hasEnoughPoints) {
        return [];
      }

      const originX = toFiniteNumber(verticalReferenceOrigin?.x);
      const originY = toFiniteNumber(verticalReferenceOrigin?.y);

      return normalizedPoints.map((point) => {
        const pointX = toFiniteNumber(point.x) ?? 0;
        const pointY = toFiniteNumber(point.y) ?? 0;
        const pointZ = toFiniteNumber(point.z) ?? 0;

        if (
          !isVerticalProfileMode ||
          effectiveHorizontalExaggeration === 1 ||
          originX === null ||
          originY === null
        ) {
          return [pointX, pointY, -pointZ];
        }

        return [
          originX + (pointX - originX) * effectiveHorizontalExaggeration,
          originY + (pointY - originY) * effectiveHorizontalExaggeration,
          -pointZ,
        ];
      });
    },
    [effectiveHorizontalExaggeration, hasEnoughPoints, isVerticalProfileMode, normalizedPoints, verticalReferenceOrigin?.x, verticalReferenceOrigin?.y],
  );

  const shallowestTvd = useMemo(() => {
    if (!hasEnoughPoints) {
      return 0;
    }

    const tvdValues = normalizedPoints
      .map((point) => toFiniteNumber(point.tvd ?? point.z))
      .filter((value) => value !== null);

    if (tvdValues.length === 0) {
      return 0;
    }

    return Math.min(...tvdValues);
  }, [hasEnoughPoints, normalizedPoints]);

  const surfaceGridZ = -shallowestTvd;

  const { minTvd, maxTvd, tvdTicks } = useMemo(() => {
    if (!hasEnoughPoints) {
      return { minTvd: 0, maxTvd: 0, tvdTicks: [0] };
    }

    const tvdValues = normalizedPoints
      .map((point) => toFiniteNumber(point.tvd ?? point.z))
      .filter((value) => value !== null);

    if (tvdValues.length === 0) {
      return { minTvd: 0, maxTvd: 0, tvdTicks: [0] };
    }

    const localMinTvd = Math.min(...tvdValues);
    const localMaxTvd = Math.max(...tvdValues);
    const tickStep = depthGuideStep;
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
  }, [depthGuideStep, hasEnoughPoints, normalizedPoints]);

  const depthGuides = useMemo(() => {
    if (!hasEnoughPoints || tvdTicks.length === 0) {
      return [];
    }

    const mdTvdPairs = normalizedPoints
      .map((point) => ({
        md: toFiniteNumber(point.md),
        tvd: toFiniteNumber(point.tvd ?? point.z),
      }))
      .filter((pair) => pair.md !== null && pair.tvd !== null);

    if (mdTvdPairs.length === 0) {
      return tvdTicks.map((tvdValue) => ({ tvd: tvdValue, md: null, z: -tvdValue }));
    }

    const estimateMdAtTvd = (targetTvd) => {
      for (let index = 1; index < mdTvdPairs.length; index += 1) {
        const previous = mdTvdPairs[index - 1];
        const current = mdTvdPairs[index];
        const minSegmentDepth = Math.min(previous.tvd, current.tvd);
        const maxSegmentDepth = Math.max(previous.tvd, current.tvd);

        if (targetTvd < minSegmentDepth || targetTvd > maxSegmentDepth) {
          continue;
        }

        const depthDelta = current.tvd - previous.tvd;
        if (Math.abs(depthDelta) < 1e-6) {
          return current.md;
        }

        const ratio = (targetTvd - previous.tvd) / depthDelta;
        return previous.md + ratio * (current.md - previous.md);
      }

      return mdTvdPairs.reduce(
        (closest, pair) => {
          const diff = Math.abs(pair.tvd - targetTvd);
          if (diff < closest.diff) {
            return { diff, md: pair.md };
          }

          return closest;
        },
        { diff: Number.POSITIVE_INFINITY, md: mdTvdPairs[mdTvdPairs.length - 1].md },
      ).md;
    };

    return tvdTicks.map((tvdValue) => ({
      tvd: tvdValue,
      md: estimateMdAtTvd(tvdValue),
      z: -tvdValue,
    }));
  }, [hasEnoughPoints, normalizedPoints, tvdTicks]);

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

      normalizedPoints.forEach((point, pointIndex) => {
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

      const volumeSizeX = Math.max(bounds.maxX - bounds.minX + span * 0.25, span * 0.4);
      const volumeSizeY = Math.max(bounds.maxY - bounds.minY + span * 0.25, span * 0.4);
      const volumeThickness = Math.max(maxDepth - minDepth, Math.max(span * 0.01, 8));
      const normalizedOpacity = clamp(toFiniteNumber(formation.opacity) ?? 0.22, 0.05, 0.9);

      acc.push({
        id: formation.id ?? `formation-${formationIndex}`,
        name: String(formation.name || `Formation ${formationIndex + 1}`),
        color: formation.color || "#2f7d63",
        opacity: normalizedOpacity,
        top: minDepth,
        bottom: maxDepth,
        segments,
        volume: {
          position: [center[0], center[1], -(minDepth + maxDepth) / 2],
          size: [volumeSizeX, volumeSizeY, volumeThickness],
        },
      });

      return acc;
    }, []);
  }, [bounds.maxX, bounds.maxY, bounds.minX, bounds.minY, center, formations, hasEnoughPoints, linePoints, normalizedPoints, span]);

  const activePointIndex = selectedPointIndex ?? hoverPointIndex;
  const activePoint =
    activePointIndex !== null ? normalizedPoints.find((point) => point.pointIndex === activePointIndex) ?? null : null;
  const activePosition =
    activePointIndex !== null
      ? (() => {
          const pointIndex = normalizedPoints.findIndex((point) => point.pointIndex === activePointIndex);
          return pointIndex >= 0 && pointIndex < linePoints.length ? linePoints[pointIndex] : null;
        })()
      : null;
  const activePointOffset = useMemo(() => {
    if (!isVerticalProfileMode || !activePoint) {
      return null;
    }

    const pointX = toFiniteNumber(activePoint.x);
    const pointY = toFiniteNumber(activePoint.y);
    const originX = toFiniteNumber(verticalReferenceOrigin?.x);
    const originY = toFiniteNumber(verticalReferenceOrigin?.y);

    if (pointX === null || pointY === null || originX === null || originY === null) {
      return null;
    }

    return Math.hypot(pointX - originX, pointY - originY);
  }, [activePoint, isVerticalProfileMode, verticalReferenceOrigin?.x, verticalReferenceOrigin?.y]);
  const maxOffsetPoint = useMemo(() => {
    if (!isVerticalProfileMode) {
      return null;
    }

    const originX = toFiniteNumber(verticalReferenceOrigin?.x);
    const originY = toFiniteNumber(verticalReferenceOrigin?.y);

    if (originX === null || originY === null) {
      return null;
    }

    return normalizedPoints.reduce((bestPoint, point) => {
      const pointX = toFiniteNumber(point.x);
      const pointY = toFiniteNumber(point.y);

      if (pointX === null || pointY === null) {
        return bestPoint;
      }

      const offset = Math.hypot(pointX - originX, pointY - originY);

      if (!bestPoint || offset > bestPoint.offset) {
        return {
          point,
          offset,
        };
      }

      return bestPoint;
    }, null);
  }, [isVerticalProfileMode, normalizedPoints, verticalReferenceOrigin?.x, verticalReferenceOrigin?.y]);
  const maxOffsetPosition =
    maxOffsetPoint !== null
      ? (() => {
          const pointIndex = normalizedPoints.findIndex((point) => point.pointIndex === maxOffsetPoint.point.pointIndex);
          return pointIndex >= 0 && pointIndex < linePoints.length ? linePoints[pointIndex] : null;
        })()
      : null;

  const resetViewerCamera = useCallback(() => {
    setViewerResetKey((previous) => previous + 1);
    setSpinEnabled(false);
    setHoverPointIndex(null);
    onSelectPoint?.(null);
  }, [onSelectPoint]);

  const usingIsometricMode = viewMode === "isometric";

  if (!hasEnoughPoints) {
    return <div className="viewer-empty">{emptyStateMessage}</div>;
  }

  const pointMarkerRadius = Math.max(span * 0.006, 1.6);
  const endpointRadius = Math.max(span * 0.018, 6);
  const axisLength = span * 0.8;
  const axisOrigin = [center[0], center[1], surfaceGridZ];
  const initialCameraPosition = isVerticalProfileMode
    ? [center[0] + Math.max(span * 0.22, 18), bounds.minY - span * 1.85, center[2] + Math.max(span * 0.32, 24)]
    : [center[0] + span * 1.4, center[1] + span * 0.8, center[2] + span * 1.4];
  const depthGuidePadding = Math.max(span * 0.08, 12);
  const depthGuideXStart = bounds.minX - depthGuidePadding;
  const depthGuideXEnd = bounds.maxX + depthGuidePadding;
  const depthGuideYStart = bounds.minY - depthGuidePadding;
  const depthGuideYEnd = bounds.maxY + depthGuidePadding;
  const depthAxisX = axisOrigin[0] + Math.max(span * 0.07, 10);
  const depthAxisY = axisOrigin[1] + Math.max(span * 0.07, 10);
  const depthTickHalfWidth = Math.max(span * 0.014, 2);
  const depthGuideLabelX = depthGuideXEnd + Math.max(depthGuidePadding * 0.12, 4);
  const depthGuideLabelY = center[1];
  const referenceOriginX = toFiniteNumber(verticalReferenceOrigin?.x);
  const referenceOriginY = toFiniteNumber(verticalReferenceOrigin?.y);
  const verticalReferencePoints =
    isVerticalProfileMode && referenceOriginX !== null && referenceOriginY !== null
      ? [
          [referenceOriginX, referenceOriginY, -minTvd],
          [referenceOriginX, referenceOriginY, -maxTvd],
        ]
      : [];
  const activeReferenceConnectorPoints =
    isVerticalProfileMode && activePoint && activePosition && referenceOriginX !== null && referenceOriginY !== null
      ? [
          [referenceOriginX, referenceOriginY, activePosition[2]],
          activePosition,
        ]
      : [];
  const maxOffsetConnectorPoints =
    isVerticalProfileMode && maxOffsetPoint && maxOffsetPosition && referenceOriginX !== null && referenceOriginY !== null
      ? [
          [referenceOriginX, referenceOriginY, -(maxOffsetPoint.point.tvd ?? maxOffsetPoint.point.z)],
          maxOffsetPosition,
        ]
      : [];

  return (
    <div className="viewer-canvas">
      <Canvas
        key={`viewer-${viewerResetKey}`}
        onPointerMissed={() => {
          onSelectPoint?.(null);
          setHoverPointIndex(null);
        }}
        camera={{
          position: initialCameraPosition,
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
          args={[span * 2, isVerticalProfileMode ? Math.max(Math.round(span / Math.max(depthGuideStep, 1)), 12) : 20, "#688597", "#b6c3cc"]}
          position={[center[0], center[1], surfaceGridZ]}
          rotation={[Math.PI / 2, 0, 0]}
        />

        {depthGuides.map((guide) => {
          return (
            <group key={`depth-guide-${guide.tvd}`}>
              {showDepthGuides ? (
                <>
                  <Line
                    points={[
                      [depthGuideXStart, center[1], guide.z],
                      [depthGuideXEnd, center[1], guide.z],
                    ]}
                    color="#c5d1d9"
                    lineWidth={1}
                  />
                  <Line
                    points={[
                      [center[0], depthGuideYStart, guide.z],
                      [center[0], depthGuideYEnd, guide.z],
                    ]}
                    color="#d1dce2"
                    lineWidth={1}
                  />
                  <Line
                    points={[
                      [depthAxisX - depthTickHalfWidth, depthAxisY, guide.z],
                      [depthAxisX + depthTickHalfWidth, depthAxisY, guide.z],
                    ]}
                    color="#4f6b7b"
                    lineWidth={1.6}
                  />
                </>
              ) : null}
              {showDepthLabels ? (
                <Html
                  position={[depthGuideLabelX, depthGuideLabelY, guide.z]}
                  center
                >
                  <div className="depth-gridline-label">TVD {formatNumber(Math.abs(guide.tvd), 0)} ft</div>
                </Html>
              ) : null}
            </group>
          );
        })}

        <Line
          points={[
            [depthAxisX, depthAxisY, -minTvd],
            [depthAxisX, depthAxisY, -maxTvd],
          ]}
          color="#3f6478"
          lineWidth={1.9}
        />

        <Html position={[depthAxisX, depthAxisY, axisOrigin[2] - axisLength]} center distanceFactor={20}>
          <div className="depth-axis-title">TVD</div>
        </Html>

        {verticalReferencePoints.length === 2 ? (
          <>
            <Line points={verticalReferencePoints} color="#9b5c58" lineWidth={1.8} />
            <Html position={verticalReferencePoints[0]} center distanceFactor={18}>
              <div className="axis-tag axis-tag-reference">Vertical Reference</div>
            </Html>
          </>
        ) : null}

        {maxOffsetConnectorPoints.length === 2 ? (
          <Line points={maxOffsetConnectorPoints} color="#c08a33" lineWidth={1.6} />
        ) : null}

        {activeReferenceConnectorPoints.length === 2 ? (
          <Line points={activeReferenceConnectorPoints} color="#f28f3b" lineWidth={2.3} />
        ) : null}

        <Line points={linePoints} color={isVerticalProfileMode ? "#1d6d8d" : "#0f7b8a"} lineWidth={3} />

        {formationIntervals.map((formation) => (
          <mesh key={`${formation.id}-volume`} position={formation.volume.position}>
            <boxGeometry args={formation.volume.size} />
            <meshStandardMaterial
              color={formation.color}
              transparent
              opacity={formation.opacity}
              depthWrite={false}
            />
          </mesh>
        ))}

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
            key={`pt-${normalizedPoints[index]?.pointIndex ?? index}`}
            position={position}
            onPointerDown={(event) => {
              event.stopPropagation();
              const pointIdentifier = normalizedPoints[index]?.pointIndex ?? index;
              onSelectPoint?.(selectedPointIndex === pointIdentifier ? null : pointIdentifier);
            }}
            onPointerOver={(event) => {
              event.stopPropagation();
              setHoverPointIndex(normalizedPoints[index]?.pointIndex ?? index);
            }}
            onPointerOut={(event) => {
              event.stopPropagation();
              const pointIdentifier = normalizedPoints[index]?.pointIndex ?? index;
              setHoverPointIndex((currentIndex) => (currentIndex === pointIdentifier ? null : currentIndex));
            }}
          >
            <sphereGeometry args={[pointMarkerRadius, 12, 12]} />
            <meshStandardMaterial
              color={
                normalizedPoints[index]?.pointIndex === selectedPointIndex
                  ? "#f28f3b"
                  : normalizedPoints[index]?.pointIndex === hoverPointIndex
                    ? "#e9a963"
                    : "#3f7d9e"
              }
              transparent
              opacity={
                normalizedPoints[index]?.pointIndex === selectedPointIndex
                  ? 0.95
                  : normalizedPoints[index]?.pointIndex === hoverPointIndex
                    ? 0.78
                    : 0.45
              }
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
              {selectedPointIndex !== null ? "Selected" : "Hover"} | MD: {formatNumber(activePoint.md, 1)} ft | TVD: {formatNumber(activePoint.tvd ?? activePoint.z, 1)} ft
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
          ref={orbitControlsRef}
          makeDefault
          target={center}
          enableDamping
          dampingFactor={0.08}
          minPolarAngle={
            usingIsometricMode ? ISOMETRIC_POLAR_ANGLE - ISOMETRIC_POLAR_LOCK_EPSILON : FREE_POLAR_MIN
          }
          maxPolarAngle={
            usingIsometricMode ? ISOMETRIC_POLAR_ANGLE + ISOMETRIC_POLAR_LOCK_EPSILON : FREE_POLAR_MAX
          }
          minAzimuthAngle={-Infinity}
          maxAzimuthAngle={Infinity}
        />

        <CameraSpinner controlsRef={orbitControlsRef} enabled={spinEnabled} axis={spinAxis} speed={spinSpeed} />
      </Canvas>

      <section className="inspector-card" aria-live="polite">
        <div className="inspector-header">
          <p className="inspector-title">
            {selectedPointIndex !== null
              ? `Selected Point #${selectedPointIndex + 1}`
              : activePointIndex !== null
                ? `Hover Point #${activePointIndex + 1}`
                : "Point Inspector"}
          </p>
          {selectedPointIndex !== null ? (
            <button type="button" className="secondary-btn inspector-clear-btn" onClick={() => onSelectPoint?.(null)}>
              Clear Selection
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
              <dt>DLS (deg/100ft)</dt>
              <dd>{formatNumber(activePoint.dls, 2)}</dd>
            </div>
            <div>
              <dt>Inclination (deg)</dt>
              <dd>{formatNumber(activePoint.inclination, 2)}</dd>
            </div>
            <div className="inspector-annotation">
              <dt>Annotation</dt>
              <dd>{formatAnnotation(activePoint.annotations)}</dd>
            </div>
          </dl>
        ) : (
          <p className="inspector-empty">
            Click a trajectory point to select MD, TVD, DLS, inclination, and annotation. Hover previews are temporary.
          </p>
        )}
      </section>

      {isVerticalProfileMode ? (
        <section className="vertical-context-card" aria-label="Vertical context summary">
          <p className="vertical-context-title">Vertical Context</p>
          <dl className="vertical-context-grid">
            <div>
              <dt>Window TVD</dt>
              <dd>{formatNumber(maxTvd - minTvd, 1)} ft</dd>
            </div>
            <div>
              <dt>Max Offset</dt>
              <dd>{formatNumber(maxOffsetPoint?.offset, 1)} ft</dd>
            </div>
            <div>
              <dt>Max Offset MD</dt>
              <dd>{formatNumber(maxOffsetPoint?.point?.md, 1)} ft</dd>
            </div>
            <div>
              <dt>Active Offset</dt>
              <dd>{formatNumber(activePointOffset, 1)} ft</dd>
            </div>
          </dl>
        </section>
      ) : null}

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

      <section className="viewer-toolbar" aria-label="Viewer toolbar">
        <div className="viewer-toolbar-row">
          <button
            type="button"
            className={`viewer-tool-btn ${usingIsometricMode ? "is-active" : ""}`}
            onClick={() => setViewMode("isometric")}
          >
            Isometric
          </button>
          <button
            type="button"
            className={`viewer-tool-btn ${!usingIsometricMode ? "is-active" : ""}`}
            onClick={() => setViewMode("free")}
          >
            Free Orbit
          </button>
          <button type="button" className="viewer-tool-btn" onClick={resetViewerCamera}>
            Reset View
          </button>
          <button
            type="button"
            className={`viewer-tool-btn ${showDepthGuides ? "is-active" : ""}`}
            onClick={() => setShowDepthGuides((previous) => !previous)}
          >
            {showDepthGuides ? "Hide TVD Gridlines" : "Show TVD Gridlines"}
          </button>
          <button
            type="button"
            className={`viewer-tool-btn ${showDepthLabels ? "is-active" : ""}`}
            onClick={() => setShowDepthLabels((previous) => !previous)}
          >
            {showDepthLabels ? "Hide TVD Labels" : "Show TVD Labels"}
          </button>
        </div>

        <div className="viewer-toolbar-row">
          <button
            type="button"
            className={`viewer-tool-btn ${spinEnabled ? "is-active" : ""}`}
            onClick={() => setSpinEnabled((previous) => !previous)}
          >
            {spinEnabled ? "Pause Spin" : "Start Spin"}
          </button>

          <label className="viewer-tool-label" htmlFor="spin-axis-select">
            <span>Axis</span>
            <select
              id="spin-axis-select"
              className="viewer-tool-select"
              value={spinAxis}
              onChange={(event) => setSpinAxis(event.target.value)}
            >
              <option value="x">X (Easting)</option>
              <option value="y">Y (Northing)</option>
              <option value="z">Z / TVD</option>
            </select>
          </label>

          <label className="viewer-tool-label viewer-tool-speed" htmlFor="spin-speed-range">
            <span>Speed ({spinSpeed.toFixed(2)} rad/s)</span>
            <input
              id="spin-speed-range"
              type="range"
              min="0.1"
              max="1.5"
              step="0.05"
              value={spinSpeed}
              onChange={(event) => setSpinSpeed(Number(event.target.value))}
            />
          </label>
        </div>

        <p className="viewer-toolbar-hint">
          {isVerticalProfileMode
            ? "Vertical Profile shows the selected MD window against the true vertical reference. Left-drag rotate, scroll zoom, right-drag pan."
            : "Left-drag rotate, scroll zoom, right-drag pan. Use Free Orbit for full tilt freedom."}
        </p>
      </section>
    </div>
  );
}
