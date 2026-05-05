import { Router, type Response } from "express";
import { requireConvexAuth, type AuthedRequest } from "../../middleware/convexAuth.js";
import { completeIntegrationOAuthState, createIntegrationOAuthState, getIntegrationToken, insertSleepFromIntegration } from "../../services/convexClient.js";

export const ouraRouter = Router();

type OAuthTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

const OURA_AUTHORIZE_URL = "https://cloud.ouraring.com/oauth/authorize";
const OURA_TOKEN_URL = "https://api.ouraring.com/oauth/token";
const OURA_API_BASE = "https://api.ouraring.com/v2/usercollection";
const OURA_SCOPES = "daily sleep workout";

function buildOuraAuthUrl(state: string) {
  const clientId = process.env.OURA_CLIENT_ID;
  const redirectUri = process.env.OURA_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    throw new Error("OURA_CLIENT_ID and OURA_REDIRECT_URI are required");
  }
  const url = new URL(OURA_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", OURA_SCOPES);
  url.searchParams.set("state", state);
  return url.toString();
}

async function buildOuraRedirect(req: AuthedRequest, res: Response) {
  if (!process.env.OURA_CLIENT_ID || !process.env.OURA_CLIENT_SECRET || !process.env.OURA_REDIRECT_URI) {
    res.status(501).json({ error: "Oura OAuth requires OURA_CLIENT_ID, OURA_CLIENT_SECRET, and OURA_REDIRECT_URI." });
    return null;
  }
  try {
    const state = await createIntegrationOAuthState(req.convexToken!, "oura");
    const redirectUrl = buildOuraAuthUrl(state);
    return redirectUrl;
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unable to start Oura OAuth" });
    return null;
  }
}

ouraRouter.get("/auth", requireConvexAuth, async (req: AuthedRequest, res) => {
  const redirectUrl = await buildOuraRedirect(req, res);
  if (redirectUrl) res.redirect(redirectUrl);
});
ouraRouter.post("/auth", requireConvexAuth, async (req: AuthedRequest, res) => {
  const redirectUrl = await buildOuraRedirect(req, res);
  if (redirectUrl) res.json({ redirectUrl });
});

ouraRouter.get("/callback", async (req, res) => {
  const code = String(req.query.code ?? "");
  const state = String(req.query.state ?? "");
  if (!code || !state) {
    res.status(400).json({ error: "Missing code or state" });
    return;
  }
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.OURA_REDIRECT_URI ?? "",
    client_id: process.env.OURA_CLIENT_ID ?? "",
    client_secret: process.env.OURA_CLIENT_SECRET ?? "",
  });
  const response = await fetch(OURA_TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  const data = await response.json() as OAuthTokenResponse;
  if (!response.ok) {
    res.status(response.status).json(data);
    return;
  }
  try {
    await completeIntegrationOAuthState("oura", state, { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid OAuth state" });
    return;
  }
  res.redirect(`${process.env.CLIENT_ORIGIN ?? "http://localhost:5173"}/integrations`);
});

ouraRouter.post("/sync", requireConvexAuth, async (req: AuthedRequest, res) => {
  try {
    const accessToken = await getIntegrationToken(req.convexToken!, "oura");
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const endDate = new Date().toISOString().slice(0, 10);
    const sleep = await ouraFetch<{ data?: OuraSleep[] }>(`/sleep?start_date=${startDate}&end_date=${endDate}`, accessToken);
    let inserted = 0;
    for (const record of sleep.data ?? []) {
      const mapped = mapOuraSleep(record);
      if (!mapped) continue;
      await insertSleepFromIntegration(req.convexToken!, mapped);
      inserted += 1;
    }
    res.json({ inserted });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Oura sync failed" });
  }
});

type OuraSleep = {
  day?: string;
  bedtime_start?: string;
  total_sleep_duration?: number;
  rem_sleep_duration?: number;
  deep_sleep_duration?: number;
  light_sleep_duration?: number;
  awake_time?: number;
  average_heart_rate?: number;
  average_hr?: number;
  score?: number;
};

async function ouraFetch<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${OURA_API_BASE}${path}`, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`Oura request failed: ${response.status}`);
  return await response.json() as T;
}

function mapOuraSleep(sleep: OuraSleep) {
  const date = sleep.day ?? sleep.bedtime_start?.slice(0, 10);
  if (!date) return null;
  return {
    date,
    source: "oura" as const,
    totalSleepMin: secondsToMin(sleep.total_sleep_duration),
    remMin: secondsToMin(sleep.rem_sleep_duration),
    deepMin: secondsToMin(sleep.deep_sleep_duration),
    lightMin: secondsToMin(sleep.light_sleep_duration),
    awakeMin: secondsToMin(sleep.awake_time),
    sleepScore: sleep.score,
    avgHr: sleep.average_heart_rate ?? sleep.average_hr,
  };
}

function secondsToMin(value?: number) {
  return value === undefined ? undefined : Math.round(value / 60);
}
