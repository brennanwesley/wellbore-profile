"use client";

import { useCallback, useState } from "react";
import WellTrajectoryViewer from "@/components/WellTrajectoryViewer";
import SurveyImportMapper from "@/components/import/SurveyImportMapper";

const WELL_NAME = "Carpenter 11-31 A Unit L2H";

export default function HomePage() {
  const [points, setPoints] = useState([]);
  const [fileStatus, setFileStatus] = useState(
    "Upload a survey file, map the required fields, then apply trajectory.",
  );
  const [importWarnings, setImportWarnings] = useState([]);

  const handleApplyTrajectory = useCallback(({ points: mappedPoints, summary, sourceLabel, warnings }) => {
    setPoints(mappedPoints);
    setImportWarnings(Array.isArray(warnings) ? warnings : []);

    if (!summary) {
      setFileStatus(`${sourceLabel} applied.`);
      return;
    }

    setFileStatus(
      `${sourceLabel} applied: ${summary.validRowCount} valid rows, ${summary.invalidRowCount} invalid rows.`,
    );
  }, []);

  const hasEnoughPoints = points.length >= 2;

  return (
    <main className="page-shell">
      <section className="panel control-panel">
        <div>
          <p className="well-name">{WELL_NAME}</p>
          <h1>Wellbore Profile</h1>
          <p className="subtitle">Phase 1: Format-agnostic survey mapper + isometric trajectory viewer</p>
        </div>

        <SurveyImportMapper onApplyTrajectory={handleApplyTrajectory} />

        <div className="helper-text">
          <p className="file-status">{fileStatus}</p>
          <p>Detected points: {points.length}</p>
          {!hasEnoughPoints ? <p className="warning">Add at least 2 valid points to render.</p> : null}
          {importWarnings.map((warningText) => (
            <p key={warningText} className="warning">
              {warningText}
            </p>
          ))}
        </div>
      </section>

      <section className="panel viewer-panel">
        <WellTrajectoryViewer points={points} />
      </section>
    </main>
  );
}
