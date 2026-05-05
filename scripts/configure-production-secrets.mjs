#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const convexKeys = ["ANTHROPIC_API_KEY", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"];
const netlifyKeys = [
  "ANTHROPIC_API_KEY",
  "WHOOP_CLIENT_ID",
  "WHOOP_CLIENT_SECRET",
  "WHOOP_REDIRECT_URI",
  "OURA_CLIENT_ID",
  "OURA_CLIENT_SECRET",
  "OURA_REDIRECT_URI",
  "VITE_CONVEX_URL",
  "VITE_API_BASE_URL",
  "CONVEX_URL",
  "CLIENT_ORIGIN",
];
const secretNetlifyKeys = new Set([
  "ANTHROPIC_API_KEY",
  "WHOOP_CLIENT_ID",
  "WHOOP_CLIENT_SECRET",
  "OURA_CLIENT_ID",
  "OURA_CLIENT_SECRET",
]);

const defaults = {
  VITE_CONVEX_URL: "https://nautical-seahorse-122.convex.cloud",
  VITE_API_BASE_URL: "https://phenoagent-demo.netlify.app",
  CONVEX_URL: "https://nautical-seahorse-122.convex.cloud",
  CLIENT_ORIGIN: "https://phenoagent-demo.netlify.app",
  WHOOP_REDIRECT_URI: "https://phenoagent-demo.netlify.app/api/integrations/whoop/callback",
  OURA_REDIRECT_URI: "https://phenoagent-demo.netlify.app/api/integrations/oura/callback",
};

const dryRun = process.argv.includes("--dry-run");

function valueFor(key) {
  return process.env[key] ?? defaults[key];
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 60000,
  });
  if (result.status !== 0) {
    const message = result.stderr.trim() || result.stdout.trim() || `${command} failed`;
    throw new Error(message);
  }
}

function setConvex(key) {
  const value = valueFor(key);
  if (!value) return { key, status: "skipped" };
  if (!dryRun) run("npx", ["convex", "env", "set", key, value, "--prod"]);
  return { key, status: dryRun ? "would-set" : "set" };
}

function setNetlify(key) {
  const value = valueFor(key);
  if (!value) return { key, status: "skipped" };
  const args = ["netlify", "env:set", key, value, "--context", "production", "--force"];
  if (secretNetlifyKeys.has(key)) args.push("--secret");
  if (!dryRun) run("npx", args);
  return { key, status: dryRun ? "would-set" : "set" };
}

function printRows(title, rows) {
  console.log(`== ${title} ==`);
  for (const row of rows) console.log(`${row.status} ${row.key}`);
}

try {
  printRows("Convex production", convexKeys.map(setConvex));
  printRows("Netlify production", netlifyKeys.map(setNetlify));
  console.log(dryRun ? "\nDry run complete. No values were changed." : "\nProduction secret configuration complete. Run npm run verify:production-ready next.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
