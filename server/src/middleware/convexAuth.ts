import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import type { NextFunction, Request, Response } from "express";

export type AuthedRequest = Request & {
  convexToken?: string;
};

const isAuthenticated = makeFunctionReference<"query", Record<string, never>, boolean>("auth:isAuthenticated");

export async function requireConvexAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing Convex bearer token" });
    return;
  }

  const token = header.slice("Bearer ".length);
  if (!process.env.CONVEX_URL) {
    res.status(503).json({ error: "CONVEX_URL is required to verify bearer tokens" });
    return;
  }

  try {
    const client = new ConvexHttpClient(process.env.CONVEX_URL, { auth: token });
    const ok = await client.query(isAuthenticated, {});
    if (!ok) {
      res.status(401).json({ error: "Invalid Convex bearer token" });
      return;
    }
  } catch {
    res.status(401).json({ error: "Invalid Convex bearer token" });
    return;
  }

  req.convexToken = token;
  next();
}
