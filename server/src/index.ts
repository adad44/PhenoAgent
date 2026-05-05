import cors from "cors";
import "dotenv/config";
import express from "express";
import { phenoRouter } from "./routes/pheno.js";
import { garminRouter } from "./routes/integrations/garmin.js";
import { ouraRouter } from "./routes/integrations/oura.js";
import { whoopRouter } from "./routes/integrations/whoop.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true, service: "phenoagent-server" }));
app.use("/api/integrations/whoop", whoopRouter);
app.use("/api/integrations/oura", ouraRouter);
app.use("/api/integrations/garmin", garminRouter);
app.use("/api/pheno", phenoRouter);

app.listen(port, () => {
  console.log(`PhenoAgent server listening on http://localhost:${port}`);
});
