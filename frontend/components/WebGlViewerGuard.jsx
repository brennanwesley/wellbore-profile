"use client";

import { Component, useMemo } from "react";

function canCreateWebGlContext() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return true;
  }

  try {
    const canvas = document.createElement("canvas");
    const contextNames = ["webgl2", "webgl", "experimental-webgl"];

    return contextNames.some((contextName) => {
      try {
        return Boolean(canvas.getContext(contextName));
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

function WebGlUnavailableNotice({
  className,
  title = "3D viewer unavailable on this device",
  description = "This browser session could not create a WebGL context, so the interactive 3D viewer cannot start here.",
}) {
  return (
    <div className={className}>
      <div className="viewer-unavailable">
        <p className="viewer-unavailable-eyebrow">3D Viewer Unavailable</p>
        <h3 className="viewer-unavailable-title">{title}</h3>
        <p className="viewer-unavailable-copy">{description}</p>
        <p className="viewer-unavailable-copy">
          Try enabling browser hardware acceleration, updating the graphics driver, or using another browser or device.
        </p>
      </div>
    </div>
  );
}

class WebGlErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(previousProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

export default function WebGlViewerGuard({
  children,
  resetKey,
  className = "viewer-empty",
  fallbackTitle,
  fallbackDescription,
}) {
  const isSupported = canCreateWebGlContext();
  const fallback = useMemo(
    () => (
      <WebGlUnavailableNotice
        className={className}
        title={fallbackTitle}
        description={fallbackDescription}
      />
    ),
    [className, fallbackDescription, fallbackTitle],
  );

  if (!isSupported) {
    return fallback;
  }

  return (
    <WebGlErrorBoundary resetKey={resetKey} fallback={fallback}>
      {children}
    </WebGlErrorBoundary>
  );
}
