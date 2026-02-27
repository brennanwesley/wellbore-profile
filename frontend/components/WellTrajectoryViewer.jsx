"use client";

import { Canvas } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import { useMemo, useState } from "react";

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
  const [selectedPointIndex, setSelectedPointIndex] = useState(null);
  const hasEnoughPoints = Array.isArray(points) && points.length >= 2;

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

  const selectedPoint =
    selectedPointIndex !== null && selectedPointIndex >= 0 && selectedPointIndex < points.length
      ? points[selectedPointIndex]
      : null;
  const selectedPosition =
    selectedPointIndex !== null && selectedPointIndex >= 0 && selectedPointIndex < linePoints.length
      ? linePoints[selectedPointIndex]
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
        onPointerMissed={() => setSelectedPointIndex(null)}
        camera={{
          position: [center[0] + span * 1.4, center[1] + span * 0.8, center[2] + span * 1.4],
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
              setSelectedPointIndex(index);
            }}
            onPointerOver={(event) => {
              event.stopPropagation();
              setSelectedPointIndex(index);
            }}
          >
            <sphereGeometry args={[pointMarkerRadius, 12, 12]} />
            <meshStandardMaterial
              color={index === selectedPointIndex ? "#f28f3b" : "#3f7d9e"}
              transparent
              opacity={index === selectedPointIndex ? 0.95 : 0.45}
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

        {selectedPoint && selectedPosition ? (
          <Html position={selectedPosition} center distanceFactor={14}>
            <div className="depth-pill">MD: {selectedPoint.z.toFixed(1)} ft</div>
          </Html>
        ) : null}

        <Html position={[center[0] + axisLength, center[1], center[2]]} center distanceFactor={20}>
          <div className="axis-tag">E</div>
        </Html>
        <Html position={[center[0], center[1] + axisLength, center[2]]} center distanceFactor={20}>
          <div className="axis-tag">N</div>
        </Html>
        <Html position={[center[0], center[1], center[2] - axisLength]} center distanceFactor={20}>
          <div className="axis-tag">MD (+)</div>
        </Html>

        <OrbitControls makeDefault target={center} enableDamping dampingFactor={0.08} />
      </Canvas>
      <div className="viewer-hint">Hover or click a point to inspect MD (ft).</div>
    </div>
  );
}
