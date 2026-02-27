# Wellbore Profile

Phase 1 scaffold for a single-well 3D trajectory viewer.

## Stack

- **Frontend:** Next.js (App Router) + React Three Fiber (deploy to Vercel)
- **Backend:** Node.js + Express (deploy to Render)
- **Database:** Supabase (not required to render Phase 1 trajectory, but client is pre-installed)

## Monorepo Structure

```text
/
├─ frontend/      # Next.js app
├─ backend/       # Express API
├─ render.yaml    # Render blueprint for backend service
└─ package.json   # npm workspaces
```

## Local Development

1. Install dependencies at repo root:

   ```bash
   npm install
   ```

2. Configure backend env:

   - copy `backend/.env.example` -> `backend/.env`

3. Configure frontend env:

   - copy `frontend/.env.local.example` -> `frontend/.env.local`

4. Start backend:

   ```bash
   npm run dev:backend
   ```

5. Start frontend (new terminal):

   ```bash
   npm run dev:frontend
   ```

6. Open `http://localhost:3000`.

## Phase 1 Usage

- Enter one point per line in the form `x,y,z`
- Click **Render Trajectory**
- Rotate / pan / zoom the 3D well path with your mouse

## Deployment Setup Order (Fastest Path)

1. **Supabase**
   - Create a new project
   - Copy:
     - Project URL (`SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`)
     - anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
     - service role key (`SUPABASE_SERVICE_ROLE_KEY`, backend only)

2. **Render (Backend)**
   - Create service from repo using `render.yaml`
   - Set environment variables:
     - `CORS_ORIGIN` = your Vercel frontend URL
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`

3. **Vercel (Frontend)**
   - Import repo
   - Set root directory to `frontend`
   - Set environment variables:
     - `NEXT_PUBLIC_API_BASE_URL` = your Render backend URL
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`