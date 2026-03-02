"use client";

import { Canvas } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";

const ISOMETRIC_POLAR_ANGLE = Math.acos(1 / Math.sqrt(3));
const ISOMETRIC_POLAR_RANGE = Math.PI / 9;
const MIN_ISOMETRIC_POLAR = Math.max(0.25, ISOMETRIC_POLAR_ANGLE - ISOMETRIC_POLAR_RANGE);
const MAX_ISOMETRIC_POLAR = Math.min(Math.PI / 2.15, ISOMETRIC_POLAR_ANGLE + ISOMETRIC_POLAR_RANGE);

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

export default function WellTrajectoryViewer({ points }) {
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

        <group position={center}>
          <axesHelper args={[axisLength]} />
        </group>
        <gridHelper args={[span * 2, 20, "#688597", "#b6c3cc"]} />

        <Line points={linePoints} color="#0f7b8a" lineWidth={3} />

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

        <Html position={[center[0] + axisLength, center[1], center[2]]} center distanceFactor={20}>
          <div className="axis-tag">E</div>
        </Html>
        <Html position={[center[0], center[1] + axisLength, center[2]]} center distanceFactor={20}>
          <div className="axis-tag">N</div>
        </Html>
        <Html position={[center[0], center[1], center[2] - axisLength]} center distanceFactor={20}>
          <div className="axis-tag">TVD (+)</div>
        </Html>

        <OrbitControls
          makeDefault
          target={center}
          enableDamping
          dampingFactor={0.08}
          minPolarAngle={MIN_ISOMETRIC_POLAR}
          maxPolarAngle={MAX_ISOMETRIC_POLAR}
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

      <div className="viewer-hint">Isometric view locked. Drag to rotate 360°, scroll to zoom, right-drag to pan.</div>
    </div>
  );
}
