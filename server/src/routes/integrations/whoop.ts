import { Router, type Response } from "express";
import { requireConvexAuth, type AuthedRequest } from "../../middleware/convexAuth.js";
import { completeIntegrationOAuthState, createIntegrationOAuthState, getIntegrationToken, insertSleepFromIntegration } from "../../services/convexClient.js";

export const whoopRouter = Router();

type OAuthTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

const WHOOP_AUTHORIZE_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const WHOOP_SCOPES = "read:sleep read:recovery read:cycles read:workout read:profile";
const WHOOP_API_BASE = "https://api.prod.whoop.com/developer/v2";

function buildWhoopAuthUrl(state: string) {
  const clientId = process.env.WHOOP_CLIENT_ID;
  const redirectUri = process.env.WHOOP_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    throw new Error("WHOOP_CLIENT_ID and WHOOP_REDIRECT_URI are required");
  }
  const url = new URL(WHOOP_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", WHOOP_SCOPES);
  url.searchParams.set("state", state);
  return url.toString();
}

async function buildWhoopRedirect(req: AuthedRequest, res: Response) {
  if (!process.env.WHOOP_CLIENT_ID || !process.env.WHOOP_CLIENT_SECRET || !process.env.WHOOP_REDIRECT_URI) {
    res.status(501).json({ error: "WHOOP OAuth requires WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET, and WHOOP_REDIRECT_URI." });
    return null;
  }
  try {
    const state = await createIntegrationOAuthState(req.convexToken!, "whoop");
    const redirectUrl = buildWhoopAuthUrl(state);
    return redirectUrl;
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unable to start WHOOP OAuth" });
    return null;
  }
}

whoopRouter.get("/auth", requireConvexAuth, async (req: AuthedRequest, res) => {
  const redirectUrl = await buildWhoopRedirect(req, res);
  if (redirectUrl) res.redirect(redirectUrl);
});
whoopRouter.post("/auth", requireConvexAuth, async (req: AuthedRequest, res) => {
  const redirectUrl = await buildWhoopRedirect(req, res);
  if (redirectUrl) res.json({ redirectUrl });
});

whoopRouter.get("/callback", async (req, res) => {
  const code = String(req.query.code ?? "");
  const state = String(req.query.state ?? "");
  if (!code || !state) {
    res.status(400).json({ error: "Missing code or state" });
    return;
  }
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.WHOOP_REDIRECT_URI ?? "",
    client_id: process.env.WHOOP_CLIENT_ID ?? "",
    client_secret: process.env.WHOOP_CLIENT_SECRET ?? "",
  });
  const response = await fetch(WHOOP_TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  const data = await response.json() as OAuthTokenResponse;
  if (!response.ok) {
    res.status(response.status).json(data);
    return;
  }
  try {
    await completeIntegrationOAuthState("whoop", state, { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid OAuth state" });
    return;
  }
  res.redirect(`${process.env.CLIENT_ORIGIN ?? "http://localhost:5173"}/integrations`);
});

whoopRouter.post("/sync", requireConvexAuth, async (req: AuthedRequest, res) => {
  try {
    const accessToken = await getIntegrationToken(req.convexToken!, "whoop");
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const end = new Date().toISOString();
    const cycles = await whoopFetch<{ records?: Array<{ id: number }> }>(`/cycle?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&limit=25`, accessToken);
    let inserted = 0;
    for (const cycle of cycles.records ?? []) {
      const sleep = await whoopFetch<WhoopSleep>(`/cycle/${cycle.id}/sleep`, accessToken);
      if (sleep.nap || sleep.score_state !== "SCORED") continue;
      await insertSleepFromIntegration(req.convexToken!, mapWhoopSleep(sleep));
      inserted += 1;
    }
    res.json({ inserted });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "WHOOP sync failed" });
  }
});

type WhoopSleep = {
  start: string;
  nap?: boolean;
  score_state?: string;
  score?: {
    respiratory_rate?: number;
    sleep_performance_percentage?: number;
    stage_summary?: {
      total_in_bed_time_milli?: number;
      total_awake_time_milli?: number;
      total_light_sleep_time_milli?: number;
      total_slow_wave_sleep_time_milli?: number;
      total_rem_sleep_time_milli?: number;
    };
  };
};

async function whoopFetch<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${WHOOP_API_BASE}${path}`, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`WHOOP request failed: ${response.status}`);
  return await response.json() as T;
}

function mapWhoopSleep(sleep: WhoopSleep) {
  const stages = sleep.score?.stage_summary ?? {};
  return {
    date: sleep.start.slice(0, 10),
    source: "whoop" as const,
    totalSleepMin: millisToMin((stages.total_in_bed_time_milli ?? 0) - (stages.total_awake_time_milli ?? 0)),
    remMin: millisToMin(stages.total_rem_sleep_time_milli),
    deepMin: millisToMin(stages.total_slow_wave_sleep_time_milli),
    lightMin: millisToMin(stages.total_light_sleep_time_milli),
    awakeMin: millisToMin(stages.total_awake_time_milli),
    sleepScore: sleep.score?.sleep_performance_percentage,
    respiratoryRate: sleep.score?.respiratory_rate,
  };
}

function millisToMin(value?: number) {
  return value === undefined ? undefined : Math.round(value / 60000);
}
