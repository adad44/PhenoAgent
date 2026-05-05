#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const convexVars = ["ANTHROPIC_API_KEY", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"];
const netlifyVars = [
  "VITE_CONVEX_URL",
  "VITE_API_BASE_URL",
  "CONVEX_URL",
  "CLIENT_ORIGIN",
  "ANTHROPIC_API_KEY",
  "WHOOP_CLIENT_ID",
  "WHOOP_CLIENT_SECRET",
  "WHOOP_REDIRECT_URI",
  "OURA_CLIENT_ID",
  "OURA_CLIENT_SECRET",
  "OURA_REDIRECT_URI",
];
const localDeployVars = ["RENDER_API_KEY", "RENDER_TOKEN", "GARMIN_CONSUMER_KEY", "GARMIN_CONSUMER_SECRET"];

function run(command, args) {
  return spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 20000,
  });
}

function convexEnvNames() {
  const result = run("npx", ["convex", "env", "list", "--prod"]);
  if (result.status !== 0) return new Set();
  return new Set(result.stdout.split("\n").map((line) => line.split("=")[0]?.trim()).filter(Boolean));
}

function netlifyEnvNames() {
  const result = run("npx", ["netlify", "env:list", "--context", "production", "--json"]);
  if (result.status !== 0) return new Set();
  try {
    const data = JSON.parse(result.stdout);
    if (Array.isArray(data)) return new Set(data.map((entry) => entry.key).filter(Boolean));
    return new Set(Object.keys(data));
  } catch {
    return new Set();
  }
}

function printSection(title, rows) {
  console.log(`== ${title} ==`);
  for (const row of rows) {
    console.log(`${row.ok ? "present" : "missing"} ${row.name}${row.detail ? ` - ${row.detail}` : ""}`);
  }
}

const convexNames = convexEnvNames();
const netlifyNames = netlifyEnvNames();
const convex = convexVars.map((name) => ({ name, ok: convexNames.has(name) }));
const netlify = netlifyVars.map((name) => ({ name, ok: netlifyNames.has(name) }));
const local = localDeployVars.map((name) => ({
  name,
  ok: Boolean(process.env[name]),
  detail: name.startsWith("RENDER_") ? "needed only to automate Render deployment from this shell" : "needed for Garmin once approved",
}));

printSection("Convex production env", convex);
printSection("Netlify production env", netlify);
printSection("Local deploy/provider env", local);

const requiredMissing = [
  ...convex.filter((row) => row.name === "ANTHROPIC_API_KEY" && !row.ok),
  ...netlify.filter((row) => ["ANTHROPIC_API_KEY", "WHOOP_CLIENT_ID", "WHOOP_CLIENT_SECRET", "OURA_CLIENT_ID", "OURA_CLIENT_SECRET"].includes(row.name) && !row.ok),
  ...local.filter((row) => row.name.startsWith("RENDER_") && !row.ok),
];

if (requiredMissing.length > 0) {
  console.error("\nProduction readiness is blocked by missing external credentials or deploy access.");
  process.exit(1);
}

console.log("\nProduction readiness credentials are present. Run npm run verify and live provider smoke tests next.");
