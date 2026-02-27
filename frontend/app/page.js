"use client";

import { useMemo, useState } from "react";
import WellTrajectoryViewer from "@/components/WellTrajectoryViewer";
import { parseCoordinateText } from "@/lib/parseCoordinates";

const SAMPLE_COORDINATES = `0,0,0
100,0,200
220,80,450
350,180,720
450,320,1100
520,450,1450`;

export default function HomePage() {
  const [editorValue, setEditorValue] = useState(SAMPLE_COORDINATES);
  const [appliedValue, setAppliedValue] = useState(SAMPLE_COORDINATES);

  const previewPoints = useMemo(() => parseCoordinateText(editorValue), [editorValue]);
  const points = useMemo(() => parseCoordinateText(appliedValue), [appliedValue]);

  const hasEnoughPoints = previewPoints.length >= 2;

  return (
    <main className="page-shell">
      <section className="panel control-panel">
        <div>
          <h1>Wellbore Profile</h1>
          <p className="subtitle">Phase 1: single-well 3D trajectory visualizer</p>
        </div>

        <label htmlFor="coordinates" className="label">
          Enter coordinates (one point per line: <code>x,y,z</code>)
        </label>
        <textarea
          id="coordinates"
          value={editorValue}
          onChange={(event) => setEditorValue(event.target.value)}
          spellCheck={false}
          className="coordinate-input"
          placeholder="0,0,0"
        />

        <div className="actions">
          <button
            type="button"
            onClick={() => setAppliedValue(editorValue)}
            disabled={!hasEnoughPoints}
            className="primary-btn"
          >
            Render Trajectory
          </button>
          <button
            type="button"
            onClick={() => {
              setEditorValue(SAMPLE_COORDINATES);
              setAppliedValue(SAMPLE_COORDINATES);
            }}
            className="secondary-btn"
          >
            Load Sample
          </button>
        </div>

        <div className="helper-text">
          <p>Detected points: {previewPoints.length}</p>
          {!hasEnoughPoints ? <p className="warning">Add at least 2 valid points to render.</p> : null}
        </div>
      </section>

      <section className="panel viewer-panel">
        <WellTrajectoryViewer points={points} />
      </section>
    </main>
  );
}
