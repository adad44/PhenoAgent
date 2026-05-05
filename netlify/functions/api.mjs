import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

const getEnv = (key) => globalThis.Netlify?.env?.get(key) ?? process.env[key];
const convexUrl = () => getEnv("CONVEX_URL") ?? getEnv("VITE_CONVEX_URL") ?? "https://nautical-seahorse-122.convex.cloud";
const clientOrigin = () => getEnv("CLIENT_ORIGIN") ?? "https://phenoagent-demo.netlify.app";

const isAuthenticated = makeFunctionReference("auth:isAuthenticated");
const buildSnapshot = makeFunctionReference("pheno:buildSnapshot");
const addMessage = makeFunctionReference("pheno:addMessage");
const createOAuthState = makeFunctionReference("integrations:createOAuthState");
const completeOAuthIntegration = makeFunctionReference("integrations:completeOAuthIntegration");
const getIntegrationByProvider = makeFunctionReference("integrations:getByProvider");
const addSleepSession = makeFunctionReference("sleep:addSleepSession");

const oauthConfigs = {
  whoop: {
    authorizeUrl: "https://api.prod.whoop.com/oauth/oauth2/auth",
    tokenUrl: "https://api.prod.whoop.com/oauth/oauth2/token",
    apiBase: "https://api.prod.whoop.com/developer/v2",
    scopes: "read:sleep read:recovery read:cycles read:workout read:profile",
    clientIdEnv: "WHOOP_CLIENT_ID",
    clientSecretEnv: "WHOOP_CLIENT_SECRET",
    redirectUriEnv: "WHOOP_REDIRECT_URI",
  },
  oura: {
    authorizeUrl: "https://cloud.ouraring.com/oauth/authorize",
    tokenUrl: "https://api.ouraring.com/oauth/token",
    apiBase: "https://api.ouraring.com/v2/usercollection",
    scopes: "daily sleep workout",
    clientIdEnv: "OURA_CLIENT_ID",
    clientSecretEnv: "OURA_CLIENT_SECRET",
    redirectUriEnv: "OURA_REDIRECT_URI",
  },
};

export default async function api(req, context) {
  const path = new URL(req.url).pathname;
  if (path === "/api/health" || path === "/health") {
    return json({ ok: true, service: "phenoagent-netlify-api" });
  }

  if (path === "/api/pheno/chat" && req.method === "POST") {
    return handlePhenoChat(req);
  }

  if (path === "/api/integrations/garmin/auth" || path === "/api/integrations/garmin/callback") {
    return json({ error: "Garmin Health API requires program approval and OAuth 1.0a credentials before auth URLs can be enabled." }, 501);
  }

  if ((path === "/api/integrations/whoop/auth" || path === "/api/integrations/oura/auth") && (req.method === "GET" || req.method === "POST")) {
    const provider = path.includes("/whoop/") ? "whoop" : "oura";
    return handleOAuthStart(req, provider);
  }

  if ((path === "/api/integrations/whoop/callback" || path === "/api/integrations/oura/callback") && req.method === "GET") {
    const provider = path.includes("/whoop/") ? "whoop" : "oura";
    return handleOAuthCallback(req, provider);
  }

  if ((path === "/api/integrations/whoop/sync" || path === "/api/integrations/oura/sync") && req.method === "POST") {
    const auth = await requireBearer(req);
    if (auth instanceof Response) return auth;
    const provider = path.includes("/whoop/") ? "whoop" : "oura";
    return handleProviderSync(auth, provider);
  }

  return json({ error: "Not found" }, 404);
}

async function handleOAuthStart(req, provider) {
  const config = oauthConfigs[provider];
  const env = providerEnv(provider);
  if (!env) return providerConfigError(provider);
  const tokenOrResponse = await requireBearer(req);
  if (tokenOrResponse instanceof Response) return tokenOrResponse;
  const state = crypto.randomUUID().replace(/-/g, "");
  const client = new ConvexHttpClient(convexUrl(), { logger: false, auth: tokenOrResponse });
  await client.mutation(createOAuthState, {
    provider,
    state,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
  const url = new URL(config.authorizeUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", env.clientId);
  url.searchParams.set("redirect_uri", env.redirectUri);
  url.searchParams.set("scope", config.scopes);
  url.searchParams.set("state", state);
  if (req.method === "POST") return json({ redirectUrl: url.toString() });
  return Response.redirect(url.toString(), 302);
}

async function handleOAuthCallback(req, provider) {
  const env = providerEnv(provider);
  if (!env) return providerConfigError(provider);
  const url = new URL(req.url);
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  if (!code || !state) return json({ error: "Missing code or state" }, 400);
  const token = await exchangeOAuthCode(provider, code, env);
  try {
    const unauthenticatedClient = new ConvexHttpClient(convexUrl(), { logger: false });
    await unauthenticatedClient.mutation(completeOAuthIntegration, {
      state,
    provider,
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    tokenExpiresAt: token.expiresIn ? Date.now() + token.expiresIn * 1000 : undefined,
    });
  } catch {
    return json({ error: "Invalid OAuth state" }, 400);
  }
  return Response.redirect(`${clientOrigin()}/integrations`, 302);
}

async function exchangeOAuthCode(provider, code, env) {
  const config = oauthConfigs[provider];
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: env.redirectUri,
    client_id: env.clientId,
    client_secret: env.clientSecret,
  });
  const response = await fetch(config.tokenUrl, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  const data = await response.json();
  if (!response.ok) throw new Error(`${provider} token exchange failed: ${response.status}`);
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in };
}

async function handleProviderSync(convexToken, provider) {
  const env = providerEnv(provider);
  if (!env) return providerConfigError(provider);
  const client = new ConvexHttpClient(convexUrl(), { logger: false, auth: convexToken });
  const integration = await client.query(getIntegrationByProvider, { provider });
  if (!integration?.connected || !integration.accessToken) return json({ error: `${provider} is not connected` }, 400);
  const inserted = provider === "whoop"
    ? await syncWhoop(client, convexToken, integration.accessToken)
    : await syncOura(client, convexToken, integration.accessToken);
  return json({ inserted });
}

async function syncWhoop(client, convexToken, accessToken) {
  const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const end = new Date().toISOString();
  const cycles = await providerFetch("whoop", `/cycle?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&limit=25`, accessToken);
  let inserted = 0;
  for (const cycle of cycles.records ?? []) {
    const sleep = await providerFetch("whoop", `/cycle/${cycle.id}/sleep`, accessToken);
    if (sleep.nap || sleep.score_state !== "SCORED") continue;
    await client.mutation(addSleepSession, mapWhoopSleep(sleep));
    inserted += 1;
  }
  return inserted;
}

async function syncOura(client, convexToken, accessToken) {
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const endDate = new Date().toISOString().slice(0, 10);
  const sleep = await providerFetch("oura", `/sleep?start_date=${startDate}&end_date=${endDate}`, accessToken);
  let inserted = 0;
  for (const record of sleep.data ?? []) {
    const mapped = mapOuraSleep(record);
    if (!mapped) continue;
    await client.mutation(addSleepSession, mapped);
    inserted += 1;
  }
  return inserted;
}

async function providerFetch(provider, path, accessToken) {
  const response = await fetch(`${oauthConfigs[provider].apiBase}${path}`, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`${provider} request failed: ${response.status}`);
  return await response.json();
}

function mapWhoopSleep(sleep) {
  const stages = sleep.score?.stage_summary ?? {};
  return {
    date: sleep.start.slice(0, 10),
    source: "whoop",
    totalSleepMin: millisToMin((stages.total_in_bed_time_milli ?? 0) - (stages.total_awake_time_milli ?? 0)),
    remMin: millisToMin(stages.total_rem_sleep_time_milli),
    deepMin: millisToMin(stages.total_slow_wave_sleep_time_milli),
    lightMin: millisToMin(stages.total_light_sleep_time_milli),
    awakeMin: millisToMin(stages.total_awake_time_milli),
    sleepScore: sleep.score?.sleep_performance_percentage,
    respiratoryRate: sleep.score?.respiratory_rate,
  };
}

function mapOuraSleep(sleep) {
  const date = sleep.day ?? sleep.bedtime_start?.slice(0, 10);
  if (!date) return null;
  return {
    date,
    source: "oura",
    totalSleepMin: secondsToMin(sleep.total_sleep_duration),
    remMin: secondsToMin(sleep.rem_sleep_duration),
    deepMin: secondsToMin(sleep.deep_sleep_duration),
    lightMin: secondsToMin(sleep.light_sleep_duration),
    awakeMin: secondsToMin(sleep.awake_time),
    sleepScore: sleep.score,
    avgHr: sleep.average_heart_rate ?? sleep.average_hr,
  };
}

function millisToMin(value) {
  return value === undefined ? undefined : Math.round(value / 60000);
}

function secondsToMin(value) {
  return value === undefined ? undefined : Math.round(value / 60);
}

function providerEnv(provider) {
  const config = oauthConfigs[provider];
  const clientId = getEnv(config.clientIdEnv);
  const clientSecret = getEnv(config.clientSecretEnv);
  const redirectUri = getEnv(config.redirectUriEnv) ?? `${clientOrigin()}/api/integrations/${provider}/callback`;
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

function providerConfigError(provider) {
  const label = provider === "whoop" ? "WHOOP" : "Oura";
  return json({ error: `${label} OAuth requires hosted provider credentials before live auth can start.` }, 501);
}

export const config = {
  path: ["/api/*", "/health"],
};

async function handlePhenoChat(req) {
  const tokenOrResponse = await requireBearer(req);
  if (tokenOrResponse instanceof Response) return tokenOrResponse;
  const token = tokenOrResponse;
  const body = await safeJson(req);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) return json({ error: "message is required" }, 400);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event, data) => {
        controller.enqueue(encoder.encode(`${event ? `event: ${event}\n` : ""}data: ${JSON.stringify(data)}\n\n`));
      };

      let answer = "";
      try {
        const snapshot = await buildSnapshotFromConvex(token);
        await streamClaude({
          snapshot,
          message,
          history: normalizeHistory(body?.history),
          onToken: (chunk) => {
            answer += chunk;
            send("", { token: chunk });
          },
        });
        await persistPhenoExchange(token, message, answer);
        send("done", { ok: true });
      } catch (error) {
        send("error", { error: error instanceof Error ? error.message : "Unknown error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      "access-control-allow-origin": clientOrigin(),
      "access-control-allow-headers": "authorization, content-type",
    },
  });
}

async function requireBearer(req) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  if (!token) return json({ error: "Missing bearer token" }, 401);
  const client = new ConvexHttpClient(convexUrl(), { logger: false, auth: token });
  const ok = await client.query(isAuthenticated, {});
  if (!ok) return json({ error: "Invalid bearer token" }, 401);
  return token;
}

async function buildSnapshotFromConvex(token) {
  const client = new ConvexHttpClient(convexUrl(), { logger: false, auth: token });
  return await client.action(buildSnapshot, {});
}

async function persistPhenoExchange(token, message, answer) {
  const client = new ConvexHttpClient(convexUrl(), { logger: false, auth: token });
  await client.mutation(addMessage, { role: "user", content: message });
  await client.mutation(addMessage, { role: "assistant", content: answer });
}

async function streamClaude({ snapshot, message, history, onToken }) {
  const apiKey = getEnv("ANTHROPIC_API_KEY");
  if (!apiKey) {
    onToken("ANTHROPIC_API_KEY is not configured. Pheno can stream once the hosted API secret is set.");
    return;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 900,
      stream: true,
      system: `You are Pheno, an AI health advisor with access to the user's complete health data. Cite user data, do not diagnose, and recommend consulting a physician for clinical decisions.\n\n${snapshot}`,
      messages: [...history, { role: "user", content: message }],
    }),
  });

  if (!response.ok || !response.body) throw new Error(`Anthropic stream failed: ${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const eventBlock of events) {
      for (const line of eventBlock.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") continue;
        try {
          const event = JSON.parse(data);
          const text = event.delta?.text;
          if (text) onToken(text);
        } catch {
          // Ignore partial or non-message events.
        }
      }
    }
  }
}

async function safeJson(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.filter((item) => item && typeof item === "object" && (item.role === "user" || item.role === "assistant") && typeof item.content === "string");
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": clientOrigin(),
      "access-control-allow-headers": "authorization, content-type",
    },
  });
}
