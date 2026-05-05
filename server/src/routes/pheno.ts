import { Router } from "express";
import { requireConvexAuth, type AuthedRequest } from "../middleware/convexAuth.js";
import { phenoRateLimit } from "../middleware/rateLimit.js";
import { streamClaude } from "../services/anthropic.js";
import { buildSnapshotFromConvex, normalizeHistory, persistPhenoExchange } from "../services/convexClient.js";

export const phenoRouter = Router();

phenoRouter.post("/chat", requireConvexAuth, phenoRateLimit, async (req: AuthedRequest, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message : "";
  if (!message.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  let answer = "";
  try {
    const snapshot = await buildSnapshotFromConvex(req.convexToken!);
    await streamClaude({
      snapshot,
      message,
      history: normalizeHistory(req.body?.history),
      onToken: (token) => {
        answer += token;
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      },
    });
    await persistPhenoExchange(req.convexToken!, message, answer);
    res.write(`event: done\ndata: ${JSON.stringify({ ok: true })}\n\n`);
  } catch (error) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" })}\n\n`);
  } finally {
    res.end();
  }
});
