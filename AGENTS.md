# Agent notes

- The app lives in `frontend/` (Next.js 14, static, client-only). `backend/` and Supabase are unused legacy code.
- Verify changes with: `npm test --workspace frontend`, `npm run lint --workspace frontend`, `npm run build:frontend`.
- Unit tests (vitest) live next to the modules in `frontend/lib/*.test.js`.
- Survey data must never leave the browser: no network calls, storage, or logging of survey contents.
- `rg` is not installed in this environment; use `grep`.
