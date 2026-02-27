"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import { useMemo } from "react";

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
    acc.minZ = Math.min(acc.minZ, point.z);
    acc.maxX = Math.max(acc.maxX, point.x);
    acc.maxY = Math.max(acc.maxY, point.y);
    acc.maxZ = Math.max(acc.maxZ, point.z);
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
  const hasEnoughPoints = Array.isArray(points) && points.length >= 2;

  const { center, span } = useMemo(() => {
    if (!hasEnoughPoints) {
      return { center: [0, 0, 0], span: 1 };
    }

    return getBounds(points);
  }, [hasEnoughPoints, points]);

  const linePoints = useMemo(
    () => (hasEnoughPoints ? points.map((point) => [point.x, point.y, point.z]) : []),
    [hasEnoughPoints, points],
  );

  if (!hasEnoughPoints) {
    return <div className="viewer-empty">No valid trajectory to render yet.</div>;
  }

  return (
    <div className="viewer-canvas">
      <Canvas
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

        <axesHelper args={[span * 0.8]} />
        <gridHelper args={[span * 2, 20, "#688597", "#b6c3cc"]} />

        <Line points={linePoints} color="#0f7b8a" lineWidth={3} />

        <mesh position={linePoints[0]}>
          <sphereGeometry args={[Math.max(span * 0.018, 6), 24, 24]} />
          <meshStandardMaterial color="#0d5e14" />
        </mesh>

        <mesh position={linePoints[linePoints.length - 1]}>
          <sphereGeometry args={[Math.max(span * 0.018, 6), 24, 24]} />
          <meshStandardMaterial color="#c7472f" />
        </mesh>

        <OrbitControls makeDefault target={center} enableDamping dampingFactor={0.08} />
      </Canvas>
    </div>
  );
}
