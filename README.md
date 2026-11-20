# Wellbore Profile

Free, public, browser-based viewer for directional surveys: single-well 3D/2D profiles and multi-well DSU views.

Live: https://wellbore-profile.vercel.app

## Architecture

- **Frontend (the whole app):** Next.js App Router + React Three Fiber in `frontend/`, deployed to Vercel (root directory `frontend`). All routes are static.
- **Survey data stays in the browser.** Files are read and parsed client-side and kept only in memory. Nothing is uploaded, stored, or logged.
- `backend/`, `render.yaml`, and `frontend/lib/supabaseClient.js` are legacy scaffolding. The frontend doesn't use them, and they're not needed to run or deploy the app.

See `docs/TECHNICAL_AUDIT_2026-11.md` for the latest technical audit.

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

## Usage

1. Open **Single Well** or **DSU View** from the workspace page.
2. Upload a CSV/TXT survey (or paste a table), review the column mapping (MD, TVD, Northing, Easting required), and validate.
3. View the trajectory in 3D and in the 2D lateral or vertical profile.
