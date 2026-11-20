# Wellbore Profile

Free, public, browser-based viewer for directional surveys: single-well 3D/2D profiles, multi-well DSU views, and gyro vs. drilling survey comparison.

Live: https://wellbore-profile.vercel.app

## Architecture

- **Frontend (the whole app):** Next.js 16 (App Router, React 19) + React Three Fiber 9 / drei 10 in `frontend/`, deployed to Vercel (root directory `frontend`, Node >= 20.9). All routes are static.
- **Survey data stays in the browser.** Files are read and parsed client-side and kept only in memory. Nothing is uploaded, stored, or logged.
- `backend/` and `render.yaml` are legacy scaffolding for a Render service that the frontend does not call. They are kept only so the existing Render deployment keeps building; they are not needed to run or deploy the app.

See `docs/TECHNICAL_AUDIT_2026-11.md` for the technical audit and its current status.

## Workspaces

| Route | Purpose |
|---|---|
| `/single-well` | One survey: 3D wellbore, 2D lateral profile (TVD vs MD), vertical profile mode, formation overlays, point inspector. |
| `/dsu-view` | Several surveys placed by surface latitude/longitude in one 3D scene. |
| `/survey-compare` | Drilling survey (left) vs. gyro survey (right) in side-by-side 3D viewers with a synchronized MD window and red/yellow DLS station highlighting. |

### Gyro vs. Drilling Survey comparison

1. Load the **Drilling Survey** and **Gyro Survey** separately with the standard import mapper (MD, TVD, Northing, Easting required; map DLS, Inclination, and Azimuth to inspect them). Either survey can be replaced or cleared at any time.
2. Set a **Synchronized MD Window** (or use *Full Range* / *Fit Drilling Coverage* / *Fit Gyro Coverage*). The window may extend past either survey's coverage; only imported stations are drawn.
3. Set **DLS thresholds** in deg/100ft: stations with DLS > X are red, DLS > Y and ≤ X are yellow (X must be greater than Y). Normal stations stay blue; stations without an imported DLS value are grey.
4. Hover or click a station to see its MD, TVD, DLS, inclination, azimuth, and DLS flag.

DLS values are used exactly as imported; the app does not calculate, interpolate, or smooth DLS. Trajectory lines connect stations and do not indicate DLS between them. Both viewers share scale, orientation, and TVD axis; each trajectory is drawn from its own first imported station, and neither survey is shifted to line up with the other.

## Local Development

```bash
npm install
npm run dev:frontend   # http://localhost:3000
```

No environment variables are required.

## Verification

```bash
npm test --workspace frontend
npm run lint --workspace frontend
npm run build:frontend
```
