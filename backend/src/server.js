import "dotenv/config";
import cors from "cors";
import express from "express";
import { createClient } from "@supabase/supabase-js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : true;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : null;

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "wellbore-profile-api",
    supabaseConfigured: Boolean(supabase),
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/well/preview", (req, res) => {
  const points = req.body?.points;

  if (!Array.isArray(points) || points.length < 2) {
    return res.status(400).json({
      error: "Request body must include points with at least two coordinate objects.",
    });
  }

  const parsed = points.map((point) => ({
    x: Number(point?.x),
    y: Number(point?.y),
    z: Number(point?.z),
  }));

  const hasInvalidPoint = parsed.some(
    (point) => !Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z),
  );

  if (hasInvalidPoint) {
    return res.status(400).json({
      error: "Each point must include finite numeric x, y, z values.",
    });
  }

  const bounds = parsed.reduce(
    (acc, point) => ({
      minX: Math.min(acc.minX, point.x),
      minY: Math.min(acc.minY, point.y),
      minZ: Math.min(acc.minZ, point.z),
      maxX: Math.max(acc.maxX, point.x),
      maxY: Math.max(acc.maxY, point.y),
      maxZ: Math.max(acc.maxZ, point.z),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      minZ: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
      maxZ: Number.NEGATIVE_INFINITY,
    },
  );

  return res.json({
    pointCount: parsed.length,
    bounds,
  });
});

app.listen(port, () => {
  console.log(`Wellbore Profile API running on port ${port}`);
});
