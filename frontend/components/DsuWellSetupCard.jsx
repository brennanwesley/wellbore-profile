"use client";

import SurveyImportMapper from "@/components/import/SurveyImportMapper";
import { validateSurfaceCoordinates } from "@/lib/dsuSpatial";

export default function DsuWellSetupCard({
  well,
  index,
  canRemove,
  onFieldChange,
  onReset,
  onRemove,
  onApplyTrajectory,
}) {
  const coordinateValidation = validateSurfaceCoordinates(well);
  const hasSurfaceLocation = coordinateValidation.isComplete;
  const hasTrajectory = Array.isArray(well.points) && well.points.length >= 2;
  const statusText = hasTrajectory
    ? coordinateValidation.isValid
      ? "Ready in 3D view"
      : hasSurfaceLocation
        ? "Surface coordinates need correction before this well can enter the DSU view"
        : "Add surface coordinates to place this well in the DSU view"
    : "Upload, validate, and apply a survey for this well";

  return (
    <article className="metadata-block dsu-well-card">
      <div className="dsu-well-card-header">
        <div className="dsu-well-title-row">
          <span className="dsu-well-color-badge" style={{ backgroundColor: well.color }} aria-hidden="true" />
          <div>
            <p className="metadata-title">Well {index + 1}</p>
            <p className="dsu-well-status">{statusText}</p>
          </div>
        </div>

        <div className="dsu-well-actions">
          <button type="button" className="secondary-btn" onClick={() => onReset(well.id)}>
            Reset Well
          </button>
          {canRemove ? (
            <button type="button" className="secondary-btn" onClick={() => onRemove(well.id)}>
              Remove
            </button>
          ) : null}
        </div>
      </div>

      <div className="dsu-surface-grid">
        <label className="mapper-field" htmlFor={`dsu-well-name-${well.id}`}>
          <span>Well Name</span>
          <input
            id={`dsu-well-name-${well.id}`}
            type="text"
            className="mapper-input"
            value={well.name}
            onChange={(event) => onFieldChange(well.id, "name", event.target.value)}
            placeholder="e.g. Smith 14-2H"
          />
        </label>

        <label className="mapper-field" htmlFor={`dsu-well-latitude-${well.id}`}>
          <span>Surface Latitude</span>
          <input
            id={`dsu-well-latitude-${well.id}`}
            type="number"
            className={`mapper-input ${coordinateValidation.isComplete && !coordinateValidation.isValid ? "is-invalid" : ""}`}
            value={well.latitude}
            onChange={(event) => onFieldChange(well.id, "latitude", event.target.value)}
            placeholder="e.g. 31.75542"
            step="any"
          />
        </label>

        <label className="mapper-field" htmlFor={`dsu-well-longitude-${well.id}`}>
          <span>Surface Longitude</span>
          <input
            id={`dsu-well-longitude-${well.id}`}
            type="number"
            className={`mapper-input ${coordinateValidation.isComplete && !coordinateValidation.isValid ? "is-invalid" : ""}`}
            value={well.longitude}
            onChange={(event) => onFieldChange(well.id, "longitude", event.target.value)}
            placeholder="e.g. -102.35411"
            step="any"
          />
        </label>
      </div>

      {coordinateValidation.message ? <p className="warning mapper-field-note">{coordinateValidation.message}</p> : null}

      <SurveyImportMapper
        key={`${well.id}-${well.importMapperKey}`}
        onApplyTrajectory={onApplyTrajectory}
        applyButtonLabel="Add Well to DSU View"
      />

      <div className="helper-text">
        <p className="file-status">{well.fileStatus}</p>
        <p>Detected points: {well.points.length}</p>
        {!hasSurfaceLocation ? <p className="helper-note">Surface latitude and longitude are required for DSU placement.</p> : null}
        {well.importWarnings.map((warningText) => (
          <p key={`${well.id}-${warningText}`} className="warning">
            {warningText}
          </p>
        ))}
      </div>
    </article>
  );
}
