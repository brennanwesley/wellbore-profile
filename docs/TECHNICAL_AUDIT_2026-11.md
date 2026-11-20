# Wellbore Profile – Technical Audit (2026-11-20)

Scope: pre-sprint review of `main` @ `6e54ddc`. Audit only; one small correctness fix was made (see §7).
Product constraints assumed: free, public, no accounts, no billing, no permanent survey storage.

## 1. Current architecture & capabilities

| Layer | What exists | Used in production? |
|---|---|---|
| Frontend | Next.js 14.2.35 (App Router), React 18, React Three Fiber 8 / drei 9 / three 0.169, PapaParse. Deployed on Vercel (`https://wellbore-profile.vercel.app`). | **Yes – the entire app** |
| Backend | `backend/src/server.js` – Express with `/health` and `/api/well/preview` (returns point bounds, stores nothing). `render.yaml` blueprint (`plan: starter`). | **No – never called by the frontend** |
| Supabase | `frontend/lib/supabaseClient.js` + `@supabase/supabase-js` in both packages. | **No – imported nowhere, not in bundle** |

All five routes (`/`, `/workspace`, `/single-well`, `/dsu-view`, `/_not-found`) build as static pages (`○ Static`). All computation runs client-side.

Functional capabilities:
- **Import** (`components/import/SurveyImportMapper.jsx`, `lib/surveyImport.js`): CSV/TXT upload or paste (PapaParse delimiter auto-detect, so tab-delimited paste from Excel works). Header-row detection, units-row skip, alias-based auto-mapping, manual mapping, row validation, metadata sniffing (well name, KB, ground elevation).
- **Required inputs**: MD, TVD, Northing, Easting. Optional: Inclination, Azimuth, DLS, VS, Sub-Sea, Annotations.
- **Single well** (`SingleWellWorkspace.jsx`): 3D isometric/free viewer, formation (TVD interval) overlays, point inspector, 2D "Lateral" plot (TVD vs MD from a start MD), "Vertical Profile" mode (3D + 2D section with horizontal exaggeration).
- **DSU** (`MultiWellDsuWorkspace.jsx`, `lib/dsuSpatial.js`): N wells, each with its own survey + surface lat/lon, placed in one 3D scene; wide-spacing warning above 10,000 ft.
- **Not implemented**: no trajectory calculations (minimum curvature, DLS, VS are not computed – only displayed if present in the file); `lib/metrics.js` (KPI calculations) is tested but not wired into any UI; no `.xlsx` upload.

## 2. Survey data storage & privacy

### Verified facts (source code, local production build, and live production JS)
1. Uploaded files are read in the browser with `File.text()` (`SurveyImportMapper.jsx:160`), parsed in the browser with PapaParse, and held **only in React component state**.
2. App code makes **no network requests**: no `fetch`/XHR/`sendBeacon` in `app/`, `components/`, `lib/`. The live production chunks (all 21 JS files served by `wellbore-profile.vercel.app`) contain no reference to Supabase, Render, the backend API, `NEXT_PUBLIC_API_BASE_URL`, or any analytics SDK (Vercel Analytics/Speed Insights, GA, PostHog, Sentry). The only `fetch(` calls in the bundle are Next.js route-navigation/prefetch internals (same-origin, no survey content) and unused three.js loaders.
3. **No browser persistence**: no `localStorage`, `sessionStorage`, IndexedDB, or cookies. A page refresh, navigating away, or "Clear Current Well"/"Reset All Wells" discards all survey data.
4. **No logging** of survey data (the only `console.log` in the repo is the unused backend's startup message).
5. **Supabase**: no reads/writes. The client module is never imported and is tree-shaken out of the bundle. The Supabase account reachable from this environment (projects `opi`, `operationsintel`, `All Access Artist`) has no Wellbore project.
6. **Render backend**: not referenced by the frontend; even if it is running, it receives no survey data.

**Conclusion: Render and Supabase are not required.** The app is a fully static, client-side tool.

### Requires deployment-dashboard access (not verifiable from the repo)
- Whether the Render service `wellbore-profile-api` is still running/billing (blueprint specifies the paid `starter` plan).
- Whether a Supabase project for this app exists under a different account.
- Vercel project settings (Web Analytics toggle, env vars). The live HTML loads no analytics script, so none is currently active. Vercel keeps standard request logs (URL, IP, user agent); these cannot contain survey content because files never leave the browser.

## 3. Findings

### Critical
None. Nothing found exposes user data or breaks current production workflows.

### High
**H1 – DSU depth uses each well's TVD with no shared vertical reference.** `MultiWellTrajectoryViewer.jsx:124` plots `-tvd` directly. Each survey's TVD is measured from its own rig KB. KB differences between wells (often 10–50+ ft, more with different rigs or pads) show up as false vertical offsets between laterals. That is the same scale as bench and landing-zone spacing, which is what a DSU view is used to judge. Formation tops share the same assumption. The single-well page collects KB/Ground Elevation but uses them only for display.
*Recommendation:* add per-well KB elevation to the DSU card (pre-filled from metadata sniffing) and plot TVDSS (`KB − TVD` as elevation, or the mapped Sub-Sea column). Label the depth reference on the axes.

**H2 – Framework on an end-of-life line with open advisories.** `next@14.2.35` is the final 14.x release. `npm audit --omit=dev` reports 10 issues (2 critical, 6 high), led by `next` (fix only in 15.5.x/16.x), plus `postcss`/`nanoid` in the frontend and `proxy-addr`/`body-parser`/`path-to-regexp`/`qs` in the unused backend. Actual exposure is low: the site is fully static on Vercel and uses no Server Actions, middleware, rewrites, or self-hosted image optimizer. Only `next/image` on the landing page touches an affected area, and Vercel serves it.
*Recommendation:* run a dedicated upgrade (Next 15.5.x or 16 + React 19 + R3F 9 / drei 10) **after** the regression tests in §5 exist. Don't use `npm audit fix --force`. Removing the backend (M1) clears the backend advisories.

**H3 – Silent numeric misinterpretation on import.** `toNumber` strips every comma (`surveyImport.js:115`), so a decimal-comma export (`1234,5`) is read as `12345` with no warning. There is no unit handling: a metric survey is accepted and labeled "ft".
*Recommendation:* when the delimiter is `;` or values match `^\d+,\d+$`, treat the comma as the decimal separator or block with a warning. Add a units selector (ft/m) at import, or at least a visible "assumed feet" confirmation.

**H4 – No trajectory sanity checks.** Non-monotonic MD, `|ΔTVD| > ΔMD`, horizontal step > ΔMD, and duplicate stations are all accepted silently (verified with test inputs). The single-well views sort stations by MD, but the DSU viewer draws them in file order, so the two views can disagree on the same file.
*Recommendation:* add non-blocking validation warnings in `extractMappedSurvey`: MD non-decreasing (already a stated rule in `README_BUILD PLAN.md` §1.4), `sqrt(ΔTVD² + ΔN² + ΔE²) ≤ ΔMD + tolerance`, and duplicate MD. Sort consistently in one place, the import result.

### Medium
**M1 – Unused backend, Render blueprint, and Supabase dependency.** These add cost (if the Render service is running), carry vulnerable dependencies, and give a misleading picture of where data goes. The previous README told users to set up Supabase and Render.
*Recommendation:* confirm in the Render/Supabase dashboards, suspend the service, then in a separate PR remove `backend/`, `render.yaml`, `lib/supabaseClient.js`, `lib/parseCoordinates.js` (also unused), the `@supabase/supabase-js` deps, and the workspace entries.

**M2 – DLS, inclination, and azimuth are pass-through only.** If the file lacks a DLS column, the inspector shows "—". If the mapped column is wrong, nothing cross-checks it. Azimuth, VS, and Sub-Sea are parsed and then dropped from `points` (`surveyImport.js:521-534`), so later features can't use them.
*Recommendation:* add a pure `lib/survey/minimumCurvature.js` (MD/Inc/Azi → TVD/N/E/DLS), test it against a published reference survey, and use it to (a) compute DLS when it is missing and (b) warn when the file's TVD/N/E differ materially from the computed values. Keep all source columns on each point.

**M3 – Vertical-profile section direction is implicit and moves with the MD window.** `VerticalProfileViewer.jsx:94-121` projects onto the bearing from the first station to the deepest station *inside the selected window*. Changing the window changes the section azimuth, and the result won't match the survey's own Vertical Section column (which is imported and then discarded).
*Recommendation:* use an explicit VS azimuth: user input, defaulting to the bearing from surface to TD of the full survey, or use the imported VS column. Show the azimuth on the plot.

**M4 – DSU horizontal-placement assumptions are undocumented.**
- Lat/lon offsets use a flat-earth approximation with a constant 364,000 ft/degree. That is ~0.1–0.3% error, acceptable at DSU scale.
- No geodetic datum is captured. Mixing NAD27 and NAD83/WGS84 coordinates shifts wells by up to tens of meters.
- Survey N/E is assumed to share the lat/lon north reference. Grid convergence (often 1–2° in State Plane) is ignored, which skews relative lateral spacing by roughly `surface separation × sin(convergence)`, e.g. ~25 ft for wells 1,000 ft apart.
- The **first survey row** is placed at the surface coordinate. A survey that starts at a tie-in with non-zero offsets shifts the whole well.
- 4-decimal lat/lon is only ±~36 ft precise.

*Recommendation:* add a datum selector (or a single "all wells use the same datum" confirmation), a north-reference/convergence field, a warning when the first station isn't near MD 0 or N/E 0, and a warning for fewer than 5 decimal places. List all of these assumptions in the UI.

**M5 – Rendering scales poorly with large surveys.** Each station is a separate `<mesh>` with its own sphere geometry and material: one draw call per station, multiplied by the number of wells in DSU. The `<Canvas>` remounts on every data change (`key={viewerResetKey}`). `Math.min(...array)` spreads are used throughout (they throw above ~100k elements). Vertical mode uses 20 ft depth guides with one DOM `<Html>` label each, which means hundreds of labels on long windows. Typical surveys (100–1,000 stations) are fine; dense MWD/gyro exports (10k+) will lag.
*Recommendation:* use `InstancedMesh` for station markers, cap or decimate depth-guide labels, and replace spreads with loops. Add a large-survey fixture to measure against.

**M6 – Code organization will slow engineering features.** `WellTrajectoryViewer.jsx` (915 lines) and `SingleWellWorkspace.jsx` (896) mix domain math with rendering: section projection, MD-at-TVD interpolation, max offset, and formation intersection. `toFiniteNumber`/`formatNumber`/`clamp`/`getBounds` are copy-pasted in 6+ files, and `MultiWellTrajectoryViewer` duplicates most of the single-well viewer. Each copy of `toFiniteNumber` also strips commas, repeating H3.
*Recommendation:* extract incrementally as features touch these areas (see §4), not as a big-bang refactor.

**M7 – Thin test coverage, no CI.** 13 unit tests cover `lib/` only. Section projection, depth-guide interpolation, DSU positioning edge cases, and every component have no tests. Vercel runs lint and build but not `vitest`, and there is no GitHub Actions workflow.
*Recommendation:* add a CI workflow running `npm ci`, `npm test`, `npm run lint`, and `npm run build:frontend` on PRs.

### Low
- **L1 – `.xlsx` not accepted** (`accept=".csv,.txt"`). Paste-from-Excel works. If you add xlsx, note that the `xlsx` package on npm is stale and has advisories; use SheetJS's own distribution or an alternative.
- **L2 – Stale docs.** The README described the retired x,y,z input and a Render/Supabase setup; `README_BUILD PLAN.md` §4 still plans Supabase persistence, which conflicts with the no-storage direction. *README corrected in this commit;* the build plan should be re-scoped.
- **L3 – `lib/metrics.js` is dead code.** If it gets wired into the UI: "approximate lateral length" sums horizontal displacement over the whole well (including the curve), and `maxTvd` starts its reduce at 0 (wrong for all-negative TVDSS). Define lateral length from a landing point (e.g. first station with Inc ≥ 85–88°).
- **L4 – Formation overlays.** Highlighted segments use stations inside the interval with no interpolation at boundaries, and formations are drawn flat (no dip). Fine for visualization; label them as such.
- **L5 – Fixed camera far plane (100,000 ft).** DSU scenes spanning more than ~45,000 ft are clipped in the initial view. Derive `far` from scene span.
- **L6 – No security headers** (CSP, `X-Content-Type-Options`, `Referrer-Policy`) on Vercel. Low impact because no user data leaves the browser, but cheap to add via `next.config.mjs` `headers()`.
- **L7 – Dev-only advisories** (vitest/eslint tooling) – not shipped to users.

## 4. Suggested foundations (to avoid later refactoring)
1. **Canonical survey model** in `lib/survey/`: one normalized station shape `{ md, inc, azi, tvd, ns, ew, dls, vs, tvdss, sourceRow, raw }` plus well-level context `{ units, kbElevation, groundElevation, datum, northReference }`. The importer produces it; every viewer consumes it.
2. **Pure engineering functions** with unit tests and reference fixtures: minimum curvature, DLS, VS projection, interpolation at MD/TVD, TVDSS conversion. Components only render.
3. **Shared utilities**: one `lib/format.js`/`lib/number.js` (locale-aware parsing), shared scene helpers (bounds, depth guides, picking) used by both 3D viewers.
4. **Fixture-driven tests**: anonymized real vendor exports in `frontend/lib/__fixtures__/` (header variants, units rows, metadata blocks, semicolon/decimal-comma, metric).
5. **Order of work**: CI + regression tests → remove unused backend/Supabase → survey model + validation (H3/H4/M2) → DSU vertical reference (H1) → framework upgrade (H2).

## 5. Functionality to protect with regression tests
- Auto-mapping for known vendor headers (incl. `Global/Local N/E Coord`, `+N/-S`, `NS/EW`, `Dogleg`, units rows) and header/data-start-row detection.
- Validation outcomes: invalid-row skipping, duplicate required columns, mismatched required counts, < 2 rows.
- Coordinate convention: `x = E − E₀`, `y = N − N₀`, `z = TVD`, rendered as `−TVD` with `up = +Z` (right-handed E/N/Up, no mirroring).
- MD sorting and the lateral start-MD / vertical start–end MD window clamping.
- Vertical-profile section offset, max offset, and horizontal exaggeration about the reference origin.
- Depth-guide MD-at-TVD interpolation.
- DSU: lat/lon validation, offset placement relative to the first ready well, wide-spacing warning, exclusion of incomplete wells.
- Metadata sniffing (well name, KB, ground elevation) and "don't overwrite user-entered values".
- Smoke test: each route renders, and the WebGL fallback (`WebGlViewerGuard`) shows when no context is available.

## 6. Verification performed
- `npm test --workspace frontend`: 13/13 pass (11 existing + 2 new).
- `npm run lint --workspace frontend`: no warnings or errors.
- `npm run build:frontend`: succeeds; all routes static; first-load JS ~345 kB on viewer routes.
- `npm audit`: results summarized in H2.
- Git history checked: no committed secrets or `.env` files.
- Live production HTML and all served JS chunks inspected for network, storage, and analytics references.

## 7. Changes made in this audit
- **Fix – auto-mapping false matches** (`lib/surveyImport.js`, `suggestMappings`). Headers of 1–2 characters were reverse-matched against aliases (e.g. `n` is a substring of `inclination`). A file with `MD,TVD,N,E` headers auto-mapped Inclination, Azimuth, VS, and Annotations to the **N** column and DLS and Sub-Sea to the **E** column, so the inspector silently showed coordinates as inclination/DLS. Reverse matching now requires ≥ 3 characters, the same guard `detectHeaderRowIndex` already uses. Exact matches (`NS`, `EW`, `VS`) are unchanged. Covered by 2 new tests that fail without the fix.
- README updated to reflect the actual (static, client-only) architecture.

## 8. Status update – Sprint 1 (2026-11-20)
- **H2 resolved.** Frontend upgraded to Next.js 16.4.6, React 19.3.1, React Three Fiber 9.8.2, drei 10.7.9; ESLint 9 flat config replaces `next lint`. Transitive advisories fixed with non-breaking updates (`npm audit fix`, Express 4.22.3 lockfile bump). `npm audit` (prod and dev): **0 vulnerabilities**.
- **React 19 regression fixed.** drei 10's `Html` threw `removeChild` errors whenever a 3D viewer unmounted (mode switch, navigation). Replaced with `components/SceneLabel.jsx`, which defers root unmounts out of React's commit phase and is pointer-transparent.
- **M1 partially done.** Removed the unused frontend Supabase client and dependency, `lib/parseCoordinates.js`, the obsolete `public/data/well-1.csv` sample, and `frontend/.env.local.example`. `backend/` and `render.yaml` are intentionally retained because the Render service remains active; remove them once it is retired.
- **M2 partially done.** Imported Azimuth, VS, and Sub-Sea are now kept on each station; the point inspector shows Azimuth.
- **New:** `/survey-compare` gyro vs. drilling comparison (side-by-side 3D viewers, synchronized MD window, imported-DLS red/yellow station highlighting). Logic in `lib/dlsThresholds.js` and `lib/surveyComparison.js` with unit tests.
- **Known limitation (M5 still open):** stations are still rendered as one mesh each. A 1,520-station gyro loads in under 0.5 s, but with two viewers open, frame rate on low-end or software-rendered GPUs is modest. Move station markers to `InstancedMesh` if dense surveys become common.
