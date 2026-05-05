import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import type { ChatMessage } from "./anthropic.js";

const buildSnapshot = makeFunctionReference<"action", Record<string, never>, string>("pheno:buildSnapshot");
const addMessage = makeFunctionReference<"mutation", { role: "user" | "assistant"; content: string }, unknown>("pheno:addMessage");
const getIntegrationByProvider = makeFunctionReference<"query", { provider: "whoop" | "oura" | "garmin" }, { accessToken?: string; refreshToken?: string; connected: boolean } | null>("integrations:getByProvider");
const createOAuthState = makeFunctionReference<"mutation", { provider: "whoop" | "oura"; state: string; expiresAt: number }, unknown>("integrations:createOAuthState");
const completeOAuthIntegration = makeFunctionReference<"mutation", { provider: "whoop" | "oura"; state: string; accessToken?: string; refreshToken?: string; tokenExpiresAt?: number }, unknown>("integrations:completeOAuthIntegration");
const addSleepSession = makeFunctionReference<"mutation", {
  date: string;
  source: "whoop" | "oura" | "garmin" | "manual";
  totalSleepMin?: number;
  remMin?: number;
  deepMin?: number;
  lightMin?: number;
  awakeMin?: number;
  sleepScore?: number;
  hrvMs?: number;
  avgHr?: number;
  respiratoryRate?: number;
}, unknown>("sleep:addSleepSession");

export async function buildSnapshotFromConvex(_token: string) {
  const token = _token;
  if (!process.env.CONVEX_URL) {
    return "USER HEALTH SNAPSHOT\nConvex is not configured. Demo client data is local-only.";
  }
  const client = new ConvexHttpClient(process.env.CONVEX_URL, { auth: token });
  return await client.action(buildSnapshot, {});
}

export async function persistPhenoExchange(_token: string, _message: string, _answer: string) {
  const token = _token;
  if (!process.env.CONVEX_URL) return;
  const client = new ConvexHttpClient(process.env.CONVEX_URL, { auth: token });
  await client.mutation(addMessage, { role: "user", content: _message });
  await client.mutation(addMessage, { role: "assistant", content: _answer });
}

export async function createIntegrationOAuthState(convexToken: string, provider: "whoop" | "oura") {
  if (!process.env.CONVEX_URL) throw new Error("CONVEX_URL is required for OAuth state storage");
  const state = crypto.randomUUID().replace(/-/g, "");
  const client = new ConvexHttpClient(process.env.CONVEX_URL, { auth: convexToken });
  await client.mutation(createOAuthState, {
    provider,
    state,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
  return state;
}

export async function completeIntegrationOAuthState(provider: "whoop" | "oura", state: string, token: { accessToken?: string; refreshToken?: string; expiresIn?: number }) {
  if (!process.env.CONVEX_URL) throw new Error("CONVEX_URL is required for OAuth state storage");
  const client = new ConvexHttpClient(process.env.CONVEX_URL);
  return await client.mutation(completeOAuthIntegration, {
    provider,
    state,
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    tokenExpiresAt: token.expiresIn ? Date.now() + token.expiresIn * 1000 : undefined,
  });
}

export async function getIntegrationToken(convexToken: string, provider: "whoop" | "oura" | "garmin") {
  if (!process.env.CONVEX_URL) throw new Error("CONVEX_URL is required for integration sync");
  const client = new ConvexHttpClient(process.env.CONVEX_URL, { auth: convexToken });
  const integration = await client.query(getIntegrationByProvider, { provider });
  if (!integration?.connected || !integration.accessToken) throw new Error(`${provider} is not connected`);
  return integration.accessToken;
}

export async function insertSleepFromIntegration(convexToken: string, session: {
  date: string;
  source: "whoop" | "oura" | "garmin";
  totalSleepMin?: number;
  remMin?: number;
  deepMin?: number;
  lightMin?: number;
  awakeMin?: number;
  sleepScore?: number;
  hrvMs?: number;
  avgHr?: number;
  respiratoryRate?: number;
}) {
  if (!process.env.CONVEX_URL) throw new Error("CONVEX_URL is required for integration sync");
  const client = new ConvexHttpClient(process.env.CONVEX_URL, { auth: convexToken });
  return await client.mutation(addSleepSession, session);
}

export function normalizeHistory(history: unknown): ChatMessage[] {
  if (!Array.isArray(history)) return [];
  return history.filter((item): item is ChatMessage => item && typeof item === "object" && (item as ChatMessage).role !== undefined && typeof (item as ChatMessage).content === "string");
}
