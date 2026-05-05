import { Router } from "express";

export const garminRouter = Router();

garminRouter.get("/auth", (_req, res) => {
  res.status(501).json({ error: "Garmin Health API requires program approval and OAuth 1.0a credentials before auth URLs can be enabled." });
});

garminRouter.get("/callback", (_req, res) => {
  res.status(501).json({ error: "Garmin callback is pending approved Garmin Health API credentials." });
});
