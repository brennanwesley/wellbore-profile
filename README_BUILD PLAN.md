# Wellbore Profile Tool: Build Plan (Decision-Locked + Flexible Intake)

**Project:** Single Wellbore Profile (SWP) Digital Twin  
**Primary Outcome:** A production/reservoir-useful 3D trajectory workspace that is simple, fast, and reliable for engineers.

---

## 0) Product Rules (Decision Order)

1. **Simplicity + speed of execution**
2. **Useful UI/UX for engineers**
3. **Scalable architecture with clean modules**

If a feature does not improve real engineering decisions, it is deferred.

### 0.1 Progress Tracking Convention

- Track work in the checklist in Section 7.
- When a step is complete, change it to this format:
  - `- [x] ~~Step text~~`
- Keep the plan flexible: if a simple, high-impact improvement appears, include it and log it under Section 7 as an added checklist item.

### 0.2 Delivery Workflow (Incremental)

- Build in small vertical slices.
- Validate each slice locally before moving on.
- Push completed slices to GitHub incrementally to keep deployment risk low and progress auditable.

---

## 1) Phase 1 (Immediate): Reliable Survey Ingestion + Isometric 3D Viewer

**Goal:** Ship a trustworthy single-well trajectory viewer using uploaded survey data and manual well metadata entry.

### 1.1 Locked Input Workflow (Phase 1)

- Input type is **CSV or XLSX upload** (JSON not required for users).
- Optional fallback: paste full table block if file upload fails.
- User manually enters/edits in sidebar:
  - `Well Name`
  - `Kelly Bushing (ft)`
  - `Ground Elevation (ft)`
- Import does **not** depend on provider-specific header naming.

### 1.2 Required Logical Fields (Mapping Targets)

The importer requires users to map source columns to these logical fields:

- Required:
  - `MD (ft)`
  - `TVD (ft)`
  - `Northing (ft)`
  - `Easting (ft)`
- Optional:
  - `Inclination (deg)`
  - `Azimuth (deg)`
  - `DLS (deg/100ft)`
  - `Vertical Section (ft)`
  - `Sub-Sea (ft)`
  - `Annotations`

### 1.3 Import Mapper UX (Format-Agnostic)

- Step 1: upload file (or paste table).
- Step 2: choose header row or "no header" mode.
- Step 3: map visible source columns to required logical fields.
- Step 4: run validation and preview first N rows.
- Step 5: confirm import.

This supports unknown naming conventions (e.g., `Global N Coord`, `NS`, `Y`, etc.) without writing company-specific parser rules.

### 1.4 Data Validation + Transform Rules

- Required mapped fields must parse as numeric.
- All required mapped columns must have equal row counts.
- `MD (ft)` should be non-decreasing across rows.
- Non-numeric required values invalidate that row and are reported.
- Geometry generation for Phase 1 uses user-mapped coordinates:
  - `X = mapped Easting`
  - `Y = mapped Northing`
  - `Z = -mapped TVD`
- Normalize coordinates to first survey point for stable rendering precision.
- Preserve original source row values in memory for inspect/readout and future features.

### 1.5 3D Viewer Behavior (Phase 1)

- **Default and primary camera mode:** Isometric.
- **Plan View is deferred to a later phase.**
- Orbit interaction must support full 360-degree continuous spin (no hard stop in azimuth).
- Keep practical controls only:
  - rotate
  - zoom
  - pan
  - reset view
  - fit trajectory

### 1.6 Point Inspection + Scale Readability

- No auto-detection of KOP, heel, or toe in Phase 1.
- Add click-to-pin point inspector with:
  - MD
  - TVD
  - Mapped Northing
  - Mapped Easting
  - DLS
  - Annotation text (if present)
- Add persistent depth ruler/ticks for TVD reference in scene/UI.
- Hover preview is optional; pinned inspect is primary.

### 1.7 Formation Layer (Manual Table Entry)

- Formations are user-added manually in sidebar table rows.
- Per-row fields:
  - `Formation Name`
  - `Top (ft)`
  - `Bottom (ft)`
  - `Visible` toggle
  - `Color` (recommended for readability)
- Formation depth reference in Phase 1 is TVD (ft).
- Show formations as interval overlays aligned to well trajectory.

### 1.8 Minimum Engineering KPI Strip (Phase 1)

- Total MD
- Max TVD
- Total horizontal displacement
- Approximate lateral length
- In-zone lateral length and in-zone percentage (based on selected target interval)

### 1.9 Architecture Guardrails (Phase 1)

- Keep modules small and explicit:
  - `lib/import/` for CSV/XLSX ingestion + table parsing
  - `lib/survey/` for mapping normalization + transforms
  - `lib/metrics/` for engineering calculations
  - `components/viewer/` for scene and interaction components
  - `components/import/` for mapper workflow UI
  - `components/sidebar/` for forms/tables
- Avoid putting domain math directly in page-level component.
- Add unit tests for import mapping, row-count validation, and KPI calculations.

### 1.10 Phase 1 Acceptance Criteria

Phase 1 is complete only when all are true:

- Import accepts varied survey layouts via mapping step (not fixed vendor schema)
- Required mapped fields (MD/TVD/Northing/Easting) validate with matching row counts
- Trajectory renders correctly from mapped TVD/Northing/Easting columns
- Isometric viewer supports continuous 360 rotation, zoom, and pan
- Point click inspector shows MD/TVD/N/E (+ DLS/annotation when available)
- Persistent TVD scale/ruler is visible and readable
- Manual formation table supports add/edit/toggle visibility per row
- KPI strip computes from uploaded survey without blocking errors on 200+ points

---

## 2) Phase 2: Expanded Viewing Tools + Adders

**Goal:** Add power-user controls and expanded operational overlays after Phase 1 is stable.

### 2.1 Viewer Expansion

- Add Plan View preset
- Add Section View preset
- Add optional camera bookmarks
- Add reusable mapping profiles to speed repeat imports from known providers

### 2.2 Adders (priority order)

1. Perforation intervals
2. Fluid level marker
3. Downhole equipment segments (ESP, packer, screen)
4. Advanced formation visuals/planes

Each adder must support visibility toggle, color/style config, and quick edit/remove.

---

## 3) Phase 3: Control Room UX Hardening

**Goal:** High-speed workflow UX for daily engineering use.

- Refine sidebar information hierarchy
- Improve bulk edit/table interactions
- Add session persistence for view settings and overlay state

---

## 4) Phase 4: Data Integration + Persistence

**Goal:** Move from local demo workflow to durable multi-user data handling.

### 4.1 Database Preflight Gate (Required Before Any DB Build Work)

- Before creating any tables/migrations, verify Supabase connection is the intended project.
- Run MCP table discovery and confirm there are currently no app tables expected yet.
- Record preflight check results in build notes before proceeding.

### 4.2 Persistence Scope

- Save wells and surveys in Supabase
- Persist formation rows and adders
- Store CSV import metadata, timestamps, and source tracking

---

## 5) Phase 5: Security + Scale

- Enable RLS by org/project/well ownership
- Add audit fields (`created_by`, `updated_by`, timestamps)
- Prepare reusable multi-well viewer container for DSU workflows

---

## 6) Deferred (Not in Immediate Phase 1)

- Advanced shaders and heavy visual effects
- Real-time collaborative editing
- Mobile app build
- Simulation engines

---

## 7) Immediate Next Build Slice

- [x] ~~Run Supabase preflight table check for `public` schema before DB build tasks (result: no tables).~~
- [x] ~~Implement format-agnostic import mapper (upload/paste, header-row selection, field mapping)~~
- [ ] Add sidebar manual fields (Well Name, KB, Ground Elevation) with metadata override capability
- [ ] Add validation summary panel (valid rows, invalid rows, row-count mismatch, missing required mappings)
- [ ] Implement isometric-only camera controls with continuous 360 azimuth rotation
- [ ] Add click-to-pin point inspector with MD/TVD/N/E/DLS/Annotation
- [ ] Add persistent TVD ruler/ticks
- [ ] Add formation table rows (Name/Top/Bottom/Visible/Color) + trajectory interval overlay
- [ ] Add unit tests for import mapping, validation rules, and KPI metrics
- [ ] Push completed slice to GitHub after validation; then mark the slice as `- [x] ~~...~~`