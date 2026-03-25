"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Vector3 } from "three";

const ISOMETRIC_POLAR_ANGLE = Math.acos(1 / Math.sqrt(3));
const ISOMETRIC_POLAR_LOCK_EPSILON = 0.0001;
const FREE_POLAR_MIN = 0.08;
const FREE_POLAR_MAX = Math.PI - 0.08;
const COARSE_DEPTH_GUIDE_STEP = 1000;
const AXIS_VECTORS = {
  x: [1, 0, 0],
  y: [0, 1, 0],
  z: [0, 0, 1],
};

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

function isSameTarget(firstTarget, secondTarget) {
  return firstTarget?.wellId === secondTarget?.wellId && firstTarget?.pointIndex === secondTarget?.pointIndex;
}

function getBounds(positionEntries) {
  const initial = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    minZ: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
    maxZ: Number.NEGATIVE_INFINITY,
  };

  const bounds = positionEntries.reduce((accumulator, entry) => {
    const [x, y, z] = entry.position;
    accumulator.minX = Math.min(accumulator.minX, x);
    accumulator.minY = Math.min(accumulator.minY, y);
    accumulator.minZ = Math.min(accumulator.minZ, z);
    accumulator.maxX = Math.max(accumulator.maxX, x);
    accumulator.maxY = Math.max(accumulator.maxY, y);
    accumulator.maxZ = Math.max(accumulator.maxZ, z);
    return accumulator;
  }, initial);

  const center = [
    (bounds.minX + bounds.maxX) / 2,
    (bounds.minY + bounds.maxY) / 2,
    (bounds.minZ + bounds.maxZ) / 2,
  ];
  const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY, bounds.maxZ - bounds.minZ, 1);

  return { bounds, center, span };
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

export default function MultiWellTrajectoryViewer({ wells }) {
  const [hoverTarget, setHoverTarget] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [showDepthGuides, setShowDepthGuides] = useState(true);
  const [showDepthLabels, setShowDepthLabels] = useState(true);
  const [viewMode, setViewMode] = useState("isometric");
  const [spinEnabled, setSpinEnabled] = useState(false);
  const [spinAxis, setSpinAxis] = useState("z");
  const [spinSpeed, setSpinSpeed] = useState(0.45);
  const [viewerResetKey, setViewerResetKey] = useState(0);
  const orbitControlsRef = useRef(null);

  const renderWells = useMemo(
    () =>
      (Array.isArray(wells) ? wells : []).map((well) => {
        const pointEntries = (Array.isArray(well.points) ? well.points : []).map((point, pointIndex) => {
          const x = (toFiniteNumber(point.x) ?? 0) + well.surfaceOffsetEastingFt;
          const y = (toFiniteNumber(point.y) ?? 0) + well.surfaceOffsetNorthingFt;
          const tvd = toFiniteNumber(point.tvd ?? point.z) ?? 0;

          return {
            pointIndex,
            point,
            position: [x, y, -tvd],
            tvd,
          };
        });

        return {
          ...well,
          color: well.color || "#0f7b8a",
          pointEntries,
          linePoints: pointEntries.map((entry) => entry.position),
        };
      }),
    [wells],
  );

  const positionEntries = useMemo(
    () => renderWells.flatMap((well) => well.pointEntries.map((entry) => ({ ...entry, wellId: well.id }))),
    [renderWells],
  );

  const hasEnoughPoints = renderWells.length > 0 && positionEntries.length >= 2;

  useEffect(() => {
    if (!selectedTarget) {
      return;
    }

    const activeWell = renderWells.find((well) => well.id === selectedTarget.wellId);
    if (!activeWell || selectedTarget.pointIndex < 0 || selectedTarget.pointIndex >= activeWell.pointEntries.length) {
      setSelectedTarget(null);
    }
  }, [renderWells, selectedTarget]);

  useEffect(() => {
    if (!hoverTarget) {
      return;
    }

    const activeWell = renderWells.find((well) => well.id === hoverTarget.wellId);
    if (!activeWell || hoverTarget.pointIndex < 0 || hoverTarget.pointIndex >= activeWell.pointEntries.length) {
      setHoverTarget(null);
    }
  }, [hoverTarget, renderWells]);

  const { bounds, center, span } = useMemo(() => {
    if (!hasEnoughPoints) {
      return {
        bounds: { minX: -0.5, maxX: 0.5, minY: -0.5, maxY: 0.5, minZ: -0.5, maxZ: 0.5 },
        center: [0, 0, 0],
        span: 1,
      };
    }

    return getBounds(positionEntries);
  }, [hasEnoughPoints, positionEntries]);

  const tvdValues = useMemo(() => positionEntries.map((entry) => entry.tvd).filter((value) => Number.isFinite(value)), [positionEntries]);
  const shallowestTvd = tvdValues.length > 0 ? Math.min(...tvdValues) : 0;
  const deepestTvd = tvdValues.length > 0 ? Math.max(...tvdValues) : 0;
  const surfaceGridZ = -shallowestTvd;
  const firstTick = Math.floor(shallowestTvd / COARSE_DEPTH_GUIDE_STEP) * COARSE_DEPTH_GUIDE_STEP;
  const lastTick = Math.ceil(deepestTvd / COARSE_DEPTH_GUIDE_STEP) * COARSE_DEPTH_GUIDE_STEP;
  const tvdTicks = [];
  for (let tick = firstTick; tick <= lastTick + COARSE_DEPTH_GUIDE_STEP * 0.5; tick += COARSE_DEPTH_GUIDE_STEP) {
    tvdTicks.push(Number(tick.toFixed(6)));
  }

  const activeTarget = selectedTarget ?? hoverTarget;
  const activeWell = renderWells.find((well) => well.id === activeTarget?.wellId) ?? null;
  const activeEntry = activeWell && activeTarget ? activeWell.pointEntries[activeTarget.pointIndex] ?? null : null;
  const usingIsometricMode = viewMode === "isometric";

  const resetViewerCamera = useCallback(() => {
    setViewerResetKey((previous) => previous + 1);
    setSpinEnabled(false);
    setHoverTarget(null);
    setSelectedTarget(null);
  }, []);

  if (!hasEnoughPoints) {
    return (
      <div className="viewer-empty dsu-viewer-empty">
        Add at least one survey with 2 valid points and a surface latitude/longitude to begin the 3D DSU view.
      </div>
    );
  }

  const pointMarkerRadius = Math.max(span * 0.005, 1.5);
  const surfaceMarkerRadius = Math.max(span * 0.018, 6);
  const axisLength = span * 0.8;
  const axisOrigin = [center[0], center[1], surfaceGridZ];
  const initialCameraPosition = [center[0] + span * 1.4, center[1] + span * 0.8, center[2] + span * 1.4];
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

  return (
    <div className="viewer-canvas">
      <Canvas
        key={`dsu-viewer-${viewerResetKey}`}
        onPointerMissed={() => {
          setSelectedTarget(null);
          setHoverTarget(null);
        }}
        camera={{ position: initialCameraPosition, up: [0, 0, 1], fov: 50, near: 0.1, far: 100000 }}
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

        {tvdTicks.map((tvdValue) => {
          const guideZ = -tvdValue;
          return (
            <group key={`depth-guide-${tvdValue}`}>
              {showDepthGuides ? (
                <>
                  <Line points={[[depthGuideXStart, center[1], guideZ], [depthGuideXEnd, center[1], guideZ]]} color="#c5d1d9" lineWidth={1} />
                  <Line points={[[center[0], depthGuideYStart, guideZ], [center[0], depthGuideYEnd, guideZ]]} color="#d1dce2" lineWidth={1} />
                  <Line
                    points={[[depthAxisX - depthTickHalfWidth, depthAxisY, guideZ], [depthAxisX + depthTickHalfWidth, depthAxisY, guideZ]]}
                    color="#4f6b7b"
                    lineWidth={1.6}
                  />
                </>
              ) : null}
              {showDepthLabels ? (
                <Html position={[depthGuideLabelX, depthGuideLabelY, guideZ]} center>
                  <div className="depth-gridline-label">TVD {formatNumber(Math.abs(tvdValue), 0)} ft</div>
                </Html>
              ) : null}
            </group>
          );
        })}

        <Line points={[[depthAxisX, depthAxisY, -shallowestTvd], [depthAxisX, depthAxisY, -deepestTvd]]} color="#3f6478" lineWidth={1.9} />

        <Html position={[depthAxisX, depthAxisY, axisOrigin[2] - axisLength]} center distanceFactor={20}>
          <div className="depth-axis-title">TVD</div>
        </Html>

        {renderWells.map((well) => (
          <group key={`well-${well.id}`}>
            <Line points={well.linePoints} color={well.color} lineWidth={3} />

            <mesh position={[well.surfaceOffsetEastingFt, well.surfaceOffsetNorthingFt, surfaceGridZ]}>
              <sphereGeometry args={[surfaceMarkerRadius, 20, 20]} />
              <meshStandardMaterial color={well.color} />
            </mesh>

            <Html position={[well.surfaceOffsetEastingFt, well.surfaceOffsetNorthingFt, surfaceGridZ]} center distanceFactor={24}>
              <div className="axis-tag dsu-well-label" style={{ borderColor: well.color, color: well.color }}>
                {well.wellName}
              </div>
            </Html>

            {well.pointEntries.map((entry) => {
              const currentTarget = { wellId: well.id, pointIndex: entry.pointIndex };
              const isSelected = isSameTarget(selectedTarget, currentTarget);
              const isHovered = isSameTarget(hoverTarget, currentTarget);

              return (
                <mesh
                  key={`point-${well.id}-${entry.pointIndex}`}
                  position={entry.position}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    setSelectedTarget((previous) => (isSameTarget(previous, currentTarget) ? null : currentTarget));
                  }}
                  onPointerOver={(event) => {
                    event.stopPropagation();
                    setHoverTarget(currentTarget);
                  }}
                  onPointerOut={(event) => {
                    event.stopPropagation();
                    setHoverTarget((previous) => (isSameTarget(previous, currentTarget) ? null : previous));
                  }}
                >
                  <sphereGeometry args={[pointMarkerRadius, 12, 12]} />
                  <meshStandardMaterial
                    color={isSelected ? "#f28f3b" : isHovered ? "#e9a963" : well.color}
                    transparent
                    opacity={isSelected ? 0.95 : isHovered ? 0.82 : 0.52}
                  />
                </mesh>
              );
            })}
          </group>
        ))}

        {activeWell && activeEntry ? (
          <Html position={activeEntry.position} center distanceFactor={14}>
            <div className="depth-pill">
              {selectedTarget ? "Selected" : "Hover"} | {activeWell.wellName} | MD: {formatNumber(activeEntry.point.md, 1)} ft
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
          minPolarAngle={usingIsometricMode ? ISOMETRIC_POLAR_ANGLE - ISOMETRIC_POLAR_LOCK_EPSILON : FREE_POLAR_MIN}
          maxPolarAngle={usingIsometricMode ? ISOMETRIC_POLAR_ANGLE + ISOMETRIC_POLAR_LOCK_EPSILON : FREE_POLAR_MAX}
          minAzimuthAngle={-Infinity}
          maxAzimuthAngle={Infinity}
        />

        <CameraSpinner controlsRef={orbitControlsRef} enabled={spinEnabled} axis={spinAxis} speed={spinSpeed} />
      </Canvas>

      <section className="inspector-card" aria-live="polite">
        <div className="inspector-header">
          <p className="inspector-title">
            {selectedTarget ? `Selected ${activeWell?.wellName ?? "Point"}` : hoverTarget ? `Hover ${activeWell?.wellName ?? "Point"}` : "DSU Point Inspector"}
          </p>
          {selectedTarget ? (
            <button type="button" className="secondary-btn inspector-clear-btn" onClick={() => setSelectedTarget(null)}>
              Clear Selection
            </button>
          ) : null}
        </div>

        {activeWell && activeEntry ? (
          <dl className="inspector-grid">
            <div>
              <dt>Well</dt>
              <dd>{activeWell.wellName}</dd>
            </div>
            <div>
              <dt>MD (ft)</dt>
              <dd>{formatNumber(activeEntry.point.md, 1)}</dd>
            </div>
            <div>
              <dt>TVD (ft)</dt>
              <dd>{formatNumber(activeEntry.point.tvd ?? activeEntry.point.z, 1)}</dd>
            </div>
            <div>
              <dt>Inclination (deg)</dt>
              <dd>{formatNumber(activeEntry.point.inclination, 2)}</dd>
            </div>
            <div>
              <dt>DLS (deg/100ft)</dt>
              <dd>{formatNumber(activeEntry.point.dls, 2)}</dd>
            </div>
            <div>
              <dt>Surface Offset</dt>
              <dd>{formatNumber(activeWell.surfaceDistanceFromReferenceFt, 0)} ft</dd>
            </div>
            <div className="inspector-annotation">
              <dt>Surface Coordinates</dt>
              <dd>
                {formatNumber(activeWell.latitude, 5)}, {formatNumber(activeWell.longitude, 5)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="inspector-empty">
            Click or hover a point to inspect its MD, TVD, and the well surface placement relative to the DSU reference well.
          </p>
        )}
      </section>

      <section className="formation-legend dsu-well-legend" aria-label="Ready wells in the DSU view">
        <p className="formation-legend-title">Ready Wells</p>
        <ul className="formation-legend-list">
          {renderWells.map((well) => (
            <li key={`legend-${well.id}`}>
              <span className="formation-legend-swatch" style={{ backgroundColor: well.color }} />
              <span>
                {well.wellName}: {well.pointEntries.length} pts, {formatNumber(well.surfaceDistanceFromReferenceFt, 0)} ft from ref
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="viewer-toolbar" aria-label="Viewer toolbar">
        <div className="viewer-toolbar-row">
          <button type="button" className={`viewer-tool-btn ${usingIsometricMode ? "is-active" : ""}`} onClick={() => setViewMode("isometric")}>
            Isometric
          </button>
          <button type="button" className={`viewer-tool-btn ${!usingIsometricMode ? "is-active" : ""}`} onClick={() => setViewMode("free")}>
            Free Orbit
          </button>
          <button type="button" className="viewer-tool-btn" onClick={resetViewerCamera}>
            Reset View
          </button>
          <button type="button" className={`viewer-tool-btn ${showDepthGuides ? "is-active" : ""}`} onClick={() => setShowDepthGuides((previous) => !previous)}>
            {showDepthGuides ? "Hide TVD Gridlines" : "Show TVD Gridlines"}
          </button>
          <button type="button" className={`viewer-tool-btn ${showDepthLabels ? "is-active" : ""}`} onClick={() => setShowDepthLabels((previous) => !previous)}>
            {showDepthLabels ? "Hide TVD Labels" : "Show TVD Labels"}
          </button>
        </div>

        <div className="viewer-toolbar-row">
          <button type="button" className={`viewer-tool-btn ${spinEnabled ? "is-active" : ""}`} onClick={() => setSpinEnabled((previous) => !previous)}>
            {spinEnabled ? "Pause Spin" : "Start Spin"}
          </button>

          <label className="viewer-tool-label" htmlFor="dsu-spin-axis-select">
            <span>Axis</span>
            <select id="dsu-spin-axis-select" className="viewer-tool-select" value={spinAxis} onChange={(event) => setSpinAxis(event.target.value)}>
              <option value="x">X (Easting)</option>
              <option value="y">Y (Northing)</option>
              <option value="z">Z / TVD</option>
            </select>
          </label>

          <label className="viewer-tool-label viewer-tool-speed" htmlFor="dsu-spin-speed-range">
            <span>Speed ({spinSpeed.toFixed(2)} rad/s)</span>
            <input
              id="dsu-spin-speed-range"
              type="range"
              min="0.1"
              max="1.5"
              step="0.05"
              value={clamp(spinSpeed, 0.1, 1.5)}
              onChange={(event) => setSpinSpeed(Number(event.target.value))}
            />
          </label>
        </div>

        <p className="viewer-toolbar-hint">
          Surface markers show each wellhead position relative to the first ready well. Left-drag rotate, scroll zoom, and right-drag pan.
        </p>
      </section>
    </div>
  );
}
