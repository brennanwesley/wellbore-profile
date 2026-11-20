"use client";

import { useLayoutEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";

const Z_INDEX_RANGE = [16777271, 0];
const labelPosition = new Vector3();
const cameraPosition = new Vector3();
const cameraDirection = new Vector3();
const offsetFromCamera = new Vector3();

function getDistanceZIndex(distance, camera) {
  const slope = (Z_INDEX_RANGE[1] - Z_INDEX_RANGE[0]) / (camera.far - camera.near);
  const intercept = Z_INDEX_RANGE[1] - slope * camera.far;
  return Math.round(slope * distance + intercept);
}

export default function SceneLabel({ position, center = false, distanceFactor, children }) {
  const { gl, camera, size, events } = useThree();
  const groupRef = useRef(null);
  const rootStateRef = useRef({ root: null, container: null, unmountTimer: null });
  const target = events.connected || gl.domElement.parentNode;

  useLayoutEffect(() => {
    if (!target) {
      return undefined;
    }

    const rootState = rootStateRef.current;
    clearTimeout(rootState.unmountTimer);
    rootState.unmountTimer = null;

    if (!rootState.container) {
      rootState.container = document.createElement("div");
      rootState.container.style.cssText = "position:absolute;top:0;left:0;transform-origin:0 0;pointer-events:none;";
    }

    const container = rootState.container;
    rootState.root ??= createRoot(container);
    target.appendChild(container);

    return () => {
      container.style.display = "none";
      rootState.unmountTimer = setTimeout(() => {
        rootState.unmountTimer = null;
        rootState.root?.unmount();
        rootState.root = null;
        rootState.container = null;
        container.remove();
      }, 0);
    };
  }, [target]);

  useLayoutEffect(() => {
    rootStateRef.current.root?.render(
      <div style={{ position: "absolute", transform: center ? "translate3d(-50%,-50%,0)" : "none" }}>{children}</div>,
    );
  });

  useFrame(() => {
    const group = groupRef.current;
    const container = rootStateRef.current.container;

    if (!group || !container) {
      return;
    }

    group.updateWorldMatrix(true, false);
    labelPosition.setFromMatrixPosition(group.matrixWorld);
    cameraPosition.setFromMatrixPosition(camera.matrixWorld);
    camera.getWorldDirection(cameraDirection);
    offsetFromCamera.copy(labelPosition).sub(cameraPosition);

    if (offsetFromCamera.angleTo(cameraDirection) > Math.PI / 2) {
      container.style.display = "none";
      return;
    }

    const distance = offsetFromCamera.length();
    const projected = labelPosition.project(camera);
    const screenX = (projected.x + 1) * (size.width / 2);
    const screenY = (1 - projected.y) * (size.height / 2);
    const scale =
      distanceFactor !== undefined && camera.isPerspectiveCamera
        ? distanceFactor / (2 * Math.tan((camera.fov * Math.PI) / 360) * Math.max(distance, 1e-6))
        : 1;

    container.style.display = "block";
    container.style.zIndex = String(getDistanceZIndex(distance, camera));
    container.style.transform = `translate3d(${screenX}px,${screenY}px,0) scale(${scale})`;
  });

  return <group ref={groupRef} position={position} />;
}
