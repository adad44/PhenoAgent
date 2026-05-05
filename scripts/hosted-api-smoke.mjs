import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

const convexUrl = process.env.VITE_CONVEX_URL ?? "https://nautical-seahorse-122.convex.cloud";
const apiBaseUrl = process.env.VITE_API_BASE_URL ?? "https://phenoagent-demo.netlify.app";
const timestamp = Date.now();
const email = `api-smoke+${timestamp}@phenoagent.local`;
const password = `Verify-${timestamp}-pass`;

const ref = (name) => makeFunctionReference(name);

const unauthenticatedClient = new ConvexHttpClient(convexUrl, { logger: false });
const result = await unauthenticatedClient.action(ref("auth:signIn"), {
  provider: "password",
  params: { email, password, flow: "signUp" },
});
const token = result?.tokens?.token;
if (!token) throw new Error("Password sign-up did not return an auth token.");

const response = await fetch(`${apiBaseUrl}/api/pheno/chat`, {
  method: "POST",
  headers: {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  },
  body: JSON.stringify({ message: "Give me a one sentence readiness check.", history: [] }),
});
if (!response.ok || !response.body) {
  throw new Error(`Hosted Pheno API returned ${response.status}`);
}

const text = await response.text();
if (!text.includes("event: done")) {
  throw new Error("Hosted Pheno API stream did not complete.");
}
if (!text.includes("data:")) {
  throw new Error("Hosted Pheno API stream did not send data.");
}

const authenticatedClient = new ConvexHttpClient(convexUrl, { logger: false, auth: token });
const history = await authenticatedClient.query(ref("pheno:getChatHistory"), {});
if (history.length < 2) {
  throw new Error("Hosted Pheno API did not persist the exchange to Convex.");
}

console.log(JSON.stringify({
  apiBaseUrl,
  testAccount: "api-smoke+<timestamp>@phenoagent.local",
  streamCompleted: true,
  persistedMessages: history.length,
}));
