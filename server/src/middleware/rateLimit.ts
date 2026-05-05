import rateLimit from "express-rate-limit";
import type { AuthedRequest } from "./convexAuth.js";

export const phenoRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  keyGenerator: (req) => (req as AuthedRequest).convexToken ?? req.ip ?? "anonymous",
  standardHeaders: true,
  legacyHeaders: false,
});
