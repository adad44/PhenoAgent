import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

const convexUrl = process.env.VITE_CONVEX_URL ?? "https://nautical-seahorse-122.convex.cloud";
const timestamp = Date.now();
const email = `oauth-smoke+${timestamp}@phenoagent.local`;
const password = `Verify-${timestamp}-pass`;
const state = `state${timestamp}`;
const provider = "whoop";
const ref = (name) => makeFunctionReference(name);

const unauthenticatedClient = new ConvexHttpClient(convexUrl, { logger: false });
const signUp = await unauthenticatedClient.action(ref("auth:signIn"), {
  provider: "password",
  params: { email, password, flow: "signUp" },
});
const token = signUp?.tokens?.token;
if (!token) throw new Error("Password sign-up did not return an auth token.");

const authenticatedClient = new ConvexHttpClient(convexUrl, { logger: false, auth: token });
await authenticatedClient.mutation(ref("integrations:createOAuthState"), {
  provider,
  state,
  expiresAt: Date.now() + 10 * 60 * 1000,
});

await unauthenticatedClient.mutation(ref("integrations:completeOAuthIntegration"), {
  provider,
  state,
  accessToken: "fake-access-token",
  refreshToken: "fake-refresh-token",
  tokenExpiresAt: Date.now() + 60 * 60 * 1000,
});

const integration = await authenticatedClient.query(ref("integrations:getByProvider"), { provider });
if (!integration?.connected || !integration.accessToken || !integration.refreshToken) {
  throw new Error("OAuth state completion did not persist integration tokens.");
}

let rejectedReplay = false;
try {
  await unauthenticatedClient.mutation(ref("integrations:completeOAuthIntegration"), {
    provider,
    state,
    accessToken: "replay-access-token",
  });
} catch {
  rejectedReplay = true;
}
if (!rejectedReplay) throw new Error("Consumed OAuth state was accepted a second time.");

console.log(JSON.stringify({
  convexUrl,
  testAccount: "oauth-smoke+<timestamp>@phenoagent.local",
  provider,
  connected: integration.connected,
  replayRejected: rejectedReplay,
}));
