import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

const convexUrl = process.env.VITE_CONVEX_URL ?? "https://nautical-seahorse-122.convex.cloud";
const timestamp = Date.now();
const email = `verify+${timestamp}@phenoagent.local`;
const password = `Verify-${timestamp}-pass`;

const signIn = makeFunctionReference("auth:signIn");
const isAuthenticated = makeFunctionReference("auth:isAuthenticated");
const readiness = makeFunctionReference("pheno:getReadinessScore");

const unauthenticatedClient = new ConvexHttpClient(convexUrl, { logger: false });
const result = await unauthenticatedClient.action(signIn, {
  provider: "password",
  params: { email, password, flow: "signUp" },
});

const token = result?.tokens?.token;
if (!token) {
  throw new Error("Password sign-up did not return an auth token.");
}

const authenticatedClient = new ConvexHttpClient(convexUrl, { logger: false, auth: token });
const authenticated = await authenticatedClient.query(isAuthenticated, {});
if (authenticated !== true) {
  throw new Error("Returned token did not authenticate against Convex.");
}

const readinessScore = await authenticatedClient.query(readiness, {});
if (typeof readinessScore !== "number") {
  throw new Error("Authenticated readiness query did not return a number.");
}

console.log(JSON.stringify({
  convexUrl,
  testAccount: "verify+<timestamp>@phenoagent.local",
  isAuthenticated: authenticated,
  readinessScore,
}));
