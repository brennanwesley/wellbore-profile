"use client";

import { RISK_LEVEL, formatDrillingContext } from "@/lib/wellboreRisk";

function formatNumber(value, digits = 0) {
  return Number.isFinite(value)
    ? value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
    : "—";
}

function formatMd(value) {
  return Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : "—";
}

export default function RiskAnalysisTable({
  analysis,
  hasGyro,
  settingsMessage,
  selectedZoneId,
  onSelectZone,
  onClearSelection,
  onExport,
}) {
  const zones = analysis?.zones ?? [];
  const emptyMessage = !hasGyro
    ? "Load a gyro survey to run wellbore risk screening."
    : settingsMessage
      ? `${settingsMessage} Risk screening is paused.`
      : "No High or Review intervals in the screened gyro range.";

  return (
    <section className="risk-panel" aria-label="Wellbore risk analysis">
      <header className="risk-panel-header">
        <div className="risk-panel-heading">
          <p className="risk-panel-title">Wellbore Risk Analysis</p>
          <p className="risk-panel-subtitle">
            {analysis ? (
              <>
                <span className="risk-count risk-count-high">{analysis.counts.high} High</span>
                <span className="risk-count risk-count-review">{analysis.counts.review} Review</span>
              </>
            ) : null}
            <span>Gyro screening indicator only, not an equipment passability determination.</span>
          </p>
        </div>
        <div className="risk-panel-actions">
          {selectedZoneId ? (
            <button type="button" className="viewer-tool-btn" onClick={onClearSelection}>
              Clear Zone Focus
            </button>
          ) : null}
          <button type="button" className="viewer-tool-btn" onClick={onExport} disabled={!analysis}>
            Export CSV
          </button>
        </div>
      </header>

      {analysis?.notes?.length ? (
        <ul className="risk-notes" aria-label="Screening notes">
          {analysis.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      <div className="risk-table-scroll">
        {zones.length > 0 ? (
          <table className="risk-table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">MD Window (ft)</th>
                <th scope="col">Risk</th>
                <th scope="col">
                  Peak Gyro DLS<span>imported</span>
                </th>
                <th scope="col">
                  25-ft DLS<span>calculated</span>
                </th>
                <th scope="col">
                  Drilling DLS<span>imported</span>
                </th>
                <th scope="col">Finding</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((zone, index) => {
                const isSelected = zone.id === selectedZoneId;
                const isHigh = zone.risk === RISK_LEVEL.HIGH;

                return (
                  <tr
                    key={zone.id}
                    className={`risk-row ${isSelected ? "is-selected" : ""}`}
                    tabIndex={0}
                    aria-selected={isSelected}
                    title="Focus both 3D viewers on this MD window"
                    onClick={() => onSelectZone(zone)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectZone(zone);
                      }
                    }}
                  >
                    <td className="risk-cell-index">{index + 1}</td>
                    <td className="risk-cell-md">
                      {formatMd(zone.startMd)} – {formatMd(zone.endMd)}
                      <small>{formatMd(zone.length)} ft</small>
                    </td>
                    <td>
                      <span className={`risk-pill ${isHigh ? "risk-pill-high" : "risk-pill-review"}`}>{isHigh ? "High" : "Review"}</span>
                    </td>
                    <td className="risk-cell-number">
                      {zone.nativePeak ? formatNumber(zone.nativePeak.value, 2) : "—"}
                      {zone.nativePeak ? <small>@ {formatMd(zone.nativePeak.md)}</small> : <small>no imported DLS</small>}
                    </td>
                    <td className="risk-cell-number">
                      {zone.max25 ? formatNumber(zone.max25.value, 2) : "—"}
                      {zone.max25 ? (
                        <small>
                          {formatMd(zone.max25.startMd)}–{formatMd(zone.max25.endMd)}
                        </small>
                      ) : (
                        <small>not assessed</small>
                      )}
                    </td>
                    <td className="risk-cell-number">
                      {zone.drilling.status === "ok" ? formatNumber(zone.drilling.maxDls, 2) : "—"}
                      <small>
                        {zone.drilling.status === "ok"
                          ? `${formatMd(zone.drilling.courseLength)}-ft course ${formatMd(zone.drilling.courseStartMd)}–${formatMd(zone.drilling.courseEndMd)}`
                          : formatDrillingContext(zone.drilling)}
                      </small>
                    </td>
                    <td className="risk-cell-finding">{zone.finding}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="risk-empty">{emptyMessage}</p>
        )}
      </div>

      <p className="risk-footnote">
        DLS in deg/100ft. 25-ft DLS: dogleg between stations ~25 ft apart, calculated from MD, inclination, and azimuth. Click a
        row to focus both viewers.
      </p>
    </section>
  );
}
