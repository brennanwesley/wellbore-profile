"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import WellTrajectoryViewer from "@/components/WellTrajectoryViewer";
import { parseCoordinateText } from "@/lib/parseCoordinates";

const WELL_NAME = "Carpenter 11-31 A Unit L2H";
const WELL_FILE_PATH = "/data/well-1.csv";

const SAMPLE_COORDINATES = `0,0,0
100,0,200
220,80,450
350,180,720
450,320,1100
520,450,1450`;

export default function HomePage() {
  const [editorValue, setEditorValue] = useState(SAMPLE_COORDINATES);
  const [appliedValue, setAppliedValue] = useState(SAMPLE_COORDINATES);
  const [fileStatus, setFileStatus] = useState("Loading well-1.csv...");

  const loadWellFile = useCallback(async () => {
    setFileStatus("Loading well-1.csv...");

    try {
      const response = await fetch(WELL_FILE_PATH, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Failed to load well file (${response.status}).`);
      }

      const fileText = (await response.text()).trim();
      const parsedFromFile = parseCoordinateText(fileText);

      if (parsedFromFile.length < 2) {
        setFileStatus("Loaded file, but it does not contain at least two valid points.");
        return;
      }

      setEditorValue(fileText);
      setAppliedValue(fileText);
      setFileStatus(`Loaded ${parsedFromFile.length} points from well-1.csv`);
    } catch {
      setFileStatus("Could not load well-1.csv automatically. Paste coordinates or retry.");
    }
  }, []);

  useEffect(() => {
    loadWellFile();
  }, [loadWellFile]);

  const previewPoints = useMemo(() => parseCoordinateText(editorValue), [editorValue]);
  const points = useMemo(() => parseCoordinateText(appliedValue), [appliedValue]);

  const hasEnoughPoints = previewPoints.length >= 2;

  return (
    <main className="page-shell">
      <section className="panel control-panel">
        <div>
          <p className="well-name">{WELL_NAME}</p>
          <h1>Wellbore Profile</h1>
          <p className="subtitle">Phase 1: Easting / Northing / MD trajectory viewer (ft)</p>
        </div>

        <label htmlFor="coordinates" className="label">
          Enter coordinates (one point per line: <code>Easting,Northing,MD</code>)
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
              setFileStatus("Loaded sample trajectory.");
            }}
            className="secondary-btn"
          >
            Load Sample
          </button>
          <button type="button" onClick={loadWellFile} className="secondary-btn">
            Reload well-1.csv
          </button>
        </div>

        <div className="helper-text">
          <p className="file-status">{fileStatus}</p>
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
