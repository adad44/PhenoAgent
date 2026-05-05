import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { requireUserId } from "./lib";

const provider = v.union(v.literal("whoop"), v.literal("oura"), v.literal("garmin"));
const oauthProvider = v.union(v.literal("whoop"), v.literal("oura"));

export const getAll = query({ args: {}, handler: async (ctx) => {
  const userId = await requireUserId(ctx);
  return ctx.db.query("integrations").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
} });

export const getByProvider = query({
  args: { provider },
  handler: async (ctx, { provider }) => {
    const userId = await requireUserId(ctx);
    return ctx.db.query("integrations").withIndex("by_user_provider", (q) => q.eq("userId", userId).eq("provider", provider)).first();
  },
});

export const upsert = mutation({
  args: { provider, accessToken: v.optional(v.string()), refreshToken: v.optional(v.string()), tokenExpiresAt: v.optional(v.number()), connected: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.query("integrations").withIndex("by_user_provider", (q) => q.eq("userId", userId).eq("provider", args.provider)).first();
    const payload = { ...args, connectedAt: Date.now() };
    if (existing) return ctx.db.patch(existing._id, payload);
    return ctx.db.insert("integrations", { userId, ...payload });
  },
});

export const disconnect = mutation({
  args: { provider },
  handler: async (ctx, { provider }) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.query("integrations").withIndex("by_user_provider", (q) => q.eq("userId", userId).eq("provider", provider)).first();
    if (existing) await ctx.db.patch(existing._id, { connected: false, accessToken: undefined, refreshToken: undefined });
  },
});

export const createOAuthState = mutation({
  args: { provider: oauthProvider, state: v.string(), expiresAt: v.number() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    return ctx.db.insert("oauthStates", { ...args, userId });
  },
});

export const completeOAuthIntegration = mutation({
  args: { provider: oauthProvider, state: v.string(), accessToken: v.optional(v.string()), refreshToken: v.optional(v.string()), tokenExpiresAt: v.optional(v.number()) },
  handler: async (ctx, { provider, state, accessToken, refreshToken, tokenExpiresAt }) => {
    const existing = await ctx.db.query("oauthStates").withIndex("by_provider_state", (q) => q.eq("provider", provider).eq("state", state)).first();
    if (!existing || existing.consumedAt || existing.expiresAt < Date.now()) throw new Error("Invalid OAuth state");
    await ctx.db.patch(existing._id, { consumedAt: Date.now() });
    const integration = await ctx.db.query("integrations").withIndex("by_user_provider", (q) => q.eq("userId", existing.userId).eq("provider", provider)).first();
    const payload = { provider, accessToken, refreshToken, tokenExpiresAt, connected: true, connectedAt: Date.now() };
    if (integration) return ctx.db.patch(integration._id, payload);
    return ctx.db.insert("integrations", { userId: existing.userId, ...payload });
  },
});

export const importAppleHealthCsvUpload = action({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const blob = await ctx.storage.get(storageId);
    if (!blob) throw new Error("Apple Health CSV not found in Convex Storage");
    const rows = parseAppleSleepCsv(await blob.text());
    for (const row of rows) await ctx.runMutation(api.sleep.addSleepSession, row);
    return { inserted: rows.length };
  },
});

function parseAppleSleepCsv(text: string) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift()?.split(",").map((header) => header.trim()) ?? [];
  const index = (name: string) => headers.findIndex((header) => header.toLowerCase() === name.toLowerCase());
  const dateIndex = index("date");
  const totalIndex = index("totalSleepMin");
  if (dateIndex < 0 || totalIndex < 0) return [];
  return lines.map((line) => {
    const cells = line.split(",").map((cell) => cell.trim());
    return {
      date: cells[dateIndex],
      source: "manual" as const,
      totalSleepMin: numberAt(cells, totalIndex),
      remMin: numberAt(cells, index("remMin")),
      deepMin: numberAt(cells, index("deepMin")),
      lightMin: numberAt(cells, index("lightMin")),
      awakeMin: numberAt(cells, index("awakeMin")),
      sleepScore: numberAt(cells, index("sleepScore")),
      hrvMs: numberAt(cells, index("hrvMs")),
      avgHr: numberAt(cells, index("avgHr")),
      respiratoryRate: numberAt(cells, index("respiratoryRate")),
    };
  }).filter((row) => row.date && row.totalSleepMin !== undefined);
}

function numberAt(cells: string[], index: number) {
  if (index < 0 || cells[index] === "") return undefined;
  return Number(cells[index]);
}
