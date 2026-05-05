import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

const convexUrl = process.env.VITE_CONVEX_URL ?? "https://nautical-seahorse-122.convex.cloud";
const apiBaseUrl = process.env.VITE_API_BASE_URL ?? "https://phenoagent-demo.netlify.app";
const timestamp = Date.now();
const email = `live-smoke+${timestamp}@phenoagent.local`;
const password = `Verify-${timestamp}-pass`;

const ref = (name) => makeFunctionReference(name);

async function step(label, fn) {
  try {
    return await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${label} failed: ${message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function makePdf(text) {
  const escaped = text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${escaped.length + 35} >>\nstream\nBT /F1 12 Tf 72 720 Td (${escaped}) Tj ET\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefStart = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf);
}

const unauthenticatedClient = new ConvexHttpClient(convexUrl, { logger: false });
const signIn = await step("auth:signIn", () => unauthenticatedClient.action(ref("auth:signIn"), {
  provider: "password",
  params: { email, password, flow: "signUp" },
}));
const token = signIn?.tokens?.token;
assert(token, "Password sign-up did not return an auth token.");

const client = new ConvexHttpClient(convexUrl, { logger: false, auth: token });

await step("hosted Pheno Claude stream", async () => {
  const response = await fetch(`${apiBaseUrl}/api/pheno/chat`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ message: "Give one short readiness sentence.", history: [] }),
  });
  assert(response.ok && response.body, `Hosted Pheno API returned ${response.status}`);
  const text = await response.text();
  assert(text.includes("event: done"), "Hosted Pheno stream did not complete.");
  assert(!text.includes("ANTHROPIC_API_KEY is not configured"), "Hosted API is still using the missing Anthropic key fallback.");
});

const scan = await step("nutrition:aiScanMacros", () => client.action(ref("nutrition:aiScanMacros"), {
  text: "Two scrambled eggs, one cup cooked oatmeal, blueberries, and black coffee.",
}));
assert(typeof scan?.calories === "number", "Nutrition AI scan did not return calories.");

await step("bloodwork PDF extraction", async () => {
  const uploadUrl = await client.mutation(ref("files:generateUploadUrl"), {});
  const pdf = makePdf("Lab Results HbA1c 5.2 % reference range 4.0 - 5.6");
  const upload = await fetch(uploadUrl, {
    method: "POST",
    headers: { "content-type": "application/pdf" },
    body: pdf,
  });
  assert(upload.ok, `Convex Storage upload returned ${upload.status}`);
  const { storageId } = await upload.json();
  assert(storageId, "Convex Storage upload did not return storageId.");
  const markers = await client.action(ref("bloodwork:parsePdfUpload"), { storageId });
  assert(Array.isArray(markers) && markers.length > 0, "PDF biomarker extraction returned no markers.");
});

async function assertProviderRedirect(provider) {
  const response = await fetch(`${apiBaseUrl}/api/integrations/${provider}/auth`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  });
  assert(response.status !== 501, `${provider} hosted credentials are still missing.`);
  assert(response.ok, `${provider} auth start returned ${response.status}`);
  const body = await response.json();
  assert(typeof body.redirectUrl === "string" && body.redirectUrl.startsWith("https://"), `${provider} did not return a redirect URL.`);
}

await step("WHOOP OAuth redirect", () => assertProviderRedirect("whoop"));
await step("Oura OAuth redirect", () => assertProviderRedirect("oura"));

console.log(JSON.stringify({
  apiBaseUrl,
  convexUrl,
  testAccount: "live-smoke+<timestamp>@phenoagent.local",
  hostedClaude: true,
  nutritionAiScan: true,
  bloodworkPdfExtraction: true,
  whoopOAuthStart: true,
  ouraOAuthStart: true,
}));
