# Wellbore Risk Screening – Methodology (V1)

Implemented in `frontend/lib/wellboreRisk.js` (pure functions, unit-tested in `wellboreRisk.test.js`) and shown in the **Wellbore Risk Analysis** table on `/survey-compare`. Everything runs in the browser.

The results are **screening indicators** for intervals that may deserve attention before running ESPs, tubing, packers, or other equipment. They are not equipment passability, casing clearance, or bending-stress determinations.

## Data categories

| Category | Source | Where shown |
|---|---|---|
| Survey-provided measurements | Imported MD, TVD, inclination, azimuth, **native DLS** (gyro and drilling) | Station markers, point inspector, "Peak Gyro DLS" and "Drilling DLS" columns (labeled *imported*) |
| Calculated curvature | **25-ft DLS** from MD, inclination, azimuth | "25-ft DLS" column (labeled *calculated*) |
| Screening classification | High / Review rules below | "Risk" column, finding text |

Imported values are never modified, interpolated, or smoothed. Station marker colors (red/yellow/blue/grey in the 3D views) reflect imported DLS only and are independent of the depth-interval risk classification.

## 25-ft DLS (calculated)

- **Dogleg angle** between two stations uses the standard minimum-curvature dogleg, in its numerically stable form:
  `sin²(β/2) = sin²(ΔI/2) + sin I₁ · sin I₂ · sin²(ΔA/2)`. Then `DLS = β × 100 / ΔMD` (deg/100ft).
- **Rolling windows:** for every gyro station with inclination and azimuth, the window ends at the first later station at least 25 ft away (0.5 ft tolerance). The DLS is the *net* dogleg between the two end stations divided by the actual window length.
  - On 5-ft data the windows are exactly 25 ft; on 15-ft data they are 30 ft.
  - The actual window MDs are shown in the table and the CSV. Native DLS values are never averaged.
- **Maximum window length:** windows longer than 40 ft are not used. Any course longer than 40 ft is reported as a station gap (see *Insufficient data*).
- **Missing inclination/azimuth:** stations without both values are skipped for 25-ft DLS. The window spans the neighbouring valid stations, and a note reports how many stations were skipped. If skipping them creates a course over 40 ft, that course is flagged as not assessed.

## Native DLS runs (imported)

- A station's native DLS is taken to represent the survey course ending at that station, from the previous station to this one.
- Consecutive stations with native DLS ≥ the spike threshold form a run. The run length is the MD covered by those courses, so three 5-ft stations cover 15 ft. A missing native DLS value breaks the run.

## Classification (defaults, adjustable in the sidebar)

| Risk | Rule |
|---|---|
| **High** | 25-ft DLS ≥ 6 deg/100ft, **or** native DLS ≥ 6 sustained over ≥ 15 ft |
| **Review** | 25-ft DLS ≥ 3 and < 6, **or** an isolated native spike ≥ 6 (run < 15 ft), **or** an interval that cannot be assessed |
| Normal | Assessed and below all thresholds; not listed in the table |

- Boundaries are inclusive (≥).
- High takes precedence over Review.
- An isolated spike becomes High only if the 25-ft or sustained criterion is also met.

## Insufficient data (conservative handling)

These intervals are flagged **Review – Not assessed** instead of being treated as Normal:

- Station gaps over 40 ft.
- A survey with fewer than two stations carrying inclination/azimuth.
- A survey shorter than 25 ft.

If native DLS was not imported, a note states that spike and sustained screening is unavailable; 25-ft screening still runs. Depths outside the gyro's MD coverage are not screened, and the screened range is stated above the table.

## Survey reliability notes (shown in the finding, never used to dismiss a flag)

- **Azimuth-driven at near-vertical inclination:** within a zone, a survey course with inclination < 5° where the azimuth term of the dogleg exceeds the inclination term, and the course DLS is at or above the Review threshold. Small azimuth errors dominate there, so verify the data.
- **Direction reversal:** a window whose cumulative station-to-station dogleg is at least 2× its net dogleg (and at least the Review threshold). Net 25-ft DLS understates the directional change; native spikes remain visible in the Peak Gyro DLS column.
- **Native DLS missing** at stations inside the zone.
- **Irregular spacing:** reported when the maximum spacing exceeds 2× the median.

## Trouble-zone consolidation

- All flagged windows, runs, and unassessed gaps are sorted by MD.
- Flags that overlap or sit within 25 ft of each other are merged into one zone. The zone's risk is the highest of its members.
- **MD Window** is the union of the merged flags. Because windows are 25 ft long, a single sharp dogleg can produce a zone up to ~50 ft long.
- **Peak Gyro DLS** is the maximum imported DLS of gyro stations inside the zone.
- **25-ft DLS** is the maximum calculated value among windows overlapping the zone.
- **Sorting:** High zones first, then Review; within each group, by MD.

## Drilling survey context

- For each zone, the drilling survey courses (station to station) that overlap the zone are found. The table reports the maximum **imported** drilling DLS among them and its course MDs.
- Nothing is interpolated or recalculated for the drilling survey. If drilling DLS was not imported, the column says so.
- "Not evident in N-ft drilling course" means the coarse drilling course DLS was below the Review threshold. A long course averages curvature over its whole length, so low drilling DLS does **not** confirm that the interval is smooth.
- If the drilling survey is not loaded, or doesn't cover the zone, the column says "Not loaded" or "No coverage".

## 3D integration and export

- Clicking a row sets the synchronized MD window to the zone, padded by ≥ 50 ft and widened to the bracketing drilling stations so the overlapping drilling course is visible.
- The zone is highlighted in violet: across the gyro stations inside the zone, and across the bracketing course in the drilling view. Clicking the row again clears the highlight.
- **Export CSV** downloads the table, criteria, notes, and source labels, generated client-side.
