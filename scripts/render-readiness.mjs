#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const blueprintPath = process.argv[2] ?? "render.yaml";

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 60000,
    ...options,
  });
}

function hasCommand(command) {
  const result = run("sh", ["-lc", `command -v ${command}`]);
  return result.status === 0;
}

function validateLocally() {
  const text = readFileSync(blueprintPath, "utf8");
  const requiredSnippets = [
    "services:",
    "type: web",
    "runtime: node",
    "plan: free",
    "rootDir: server",
    "buildCommand: npm install && npm run build",
    "startCommand: npm start",
  ];
  const missing = requiredSnippets.filter((snippet) => !text.includes(snippet));
  if (missing.length > 0) {
    throw new Error(`render.yaml is missing expected AGENTS service fields: ${missing.join(", ")}`);
  }
  return { status: "locally-checked", detail: "required AGENTS Render service fields are present" };
}

async function validateWithApi() {
  const apiKey = process.env.RENDER_API_KEY ?? process.env.RENDER_TOKEN;
  const ownerId = process.env.RENDER_OWNER_ID;
  if (!apiKey || !ownerId) return null;

  const form = new FormData();
  const file = new Blob([readFileSync(blueprintPath)], { type: "application/x-yaml" });
  form.set("blueprint", file, blueprintPath);
  form.set("ownerId", ownerId);

  const response = await fetch("https://api.render.com/v1/blueprints/validate", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Render Blueprint validation API returned ${response.status}`);
  if (data.valid === false) throw new Error(`Render Blueprint validation failed: ${JSON.stringify(data.errors ?? data)}`);
  return { status: "api-validated", detail: "Render Validate Blueprint API accepted render.yaml" };
}

function validateWithCli() {
  if (!hasCommand("render")) return null;
  const result = run("render", ["blueprints", "validate", blueprintPath]);
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || "Render CLI Blueprint validation failed");
  }
  return { status: "cli-validated", detail: "Render CLI accepted render.yaml" };
}

try {
  const apiResult = await validateWithApi();
  const cliResult = apiResult ? null : validateWithCli();
  const localResult = apiResult || cliResult || validateLocally();
  console.log(JSON.stringify({
    blueprint: blueprintPath,
    ...localResult,
    renderApiAvailable: Boolean(process.env.RENDER_API_KEY ?? process.env.RENDER_TOKEN),
    ownerIdAvailable: Boolean(process.env.RENDER_OWNER_ID),
  }));
  if (!apiResult && !cliResult) {
    console.error("Render service deployment still requires Render dashboard setup or RENDER_API_KEY plus RENDER_OWNER_ID.");
    process.exit(1);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
