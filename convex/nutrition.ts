import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserId, todayIso } from "./lib";

export const getLogs = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const userId = await requireUserId(ctx);
    const start = new Date(`${date}T00:00:00`).getTime();
    const end = start + 24 * 60 * 60 * 1000;
    return await ctx.db.query("nutritionLogs")
      .withIndex("by_user_time", (q) => q.eq("userId", userId).gte("loggedAt", start).lt("loggedAt", end))
      .collect();
  },
});

export const getTodaySummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const date = todayIso();
    const start = new Date(`${date}T00:00:00`).getTime();
    const end = start + 24 * 60 * 60 * 1000;
    const logs = await ctx.db.query("nutritionLogs").withIndex("by_user_time", (q) => q.eq("userId", userId).gte("loggedAt", start).lt("loggedAt", end)).collect();
    const targets = await ctx.db.query("nutritionTargets").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    return logs.reduce((acc, log) => ({
      calories: acc.calories + (log.calories ?? 0),
      proteinG: acc.proteinG + (log.proteinG ?? 0),
      carbsG: acc.carbsG + (log.carbsG ?? 0),
      fatG: acc.fatG + (log.fatG ?? 0),
      fiberG: acc.fiberG + (log.fiberG ?? 0),
      targets,
    }), { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, targets });
  },
});

export const addLog = mutation({
  args: {
    loggedAt: v.number(),
    mealName: v.optional(v.string()),
    calories: v.optional(v.number()),
    proteinG: v.optional(v.number()),
    carbsG: v.optional(v.number()),
    fatG: v.optional(v.number()),
    fiberG: v.optional(v.number()),
    source: v.union(v.literal("manual"), v.literal("ai_scan"), v.literal("mfp"), v.literal("cronometer")),
  },
  handler: async (ctx, args) => ctx.db.insert("nutritionLogs", { userId: await requireUserId(ctx), ...args }),
});

export const getTargets = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return ctx.db.query("nutritionTargets").withIndex("by_user", (q) => q.eq("userId", userId)).first();
  },
});

export const upsertTargets = mutation({
  args: { calories: v.optional(v.number()), proteinG: v.optional(v.number()), carbsG: v.optional(v.number()), fatG: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.query("nutritionTargets").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    if (existing) return ctx.db.patch(existing._id, args);
    return ctx.db.insert("nutritionTargets", { userId, ...args });
  },
});

export const aiScanMacros = action({
  args: { text: v.string() },
  handler: async (ctx, { text }) => {
    await requireUserId(ctx);
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required for AI macro scanning");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        messages: [{ role: "user", content: `Return JSON only { "mealName": string, "calories": number, "proteinG": number, "carbsG": number, "fatG": number, "fiberG": number } for: ${text}` }],
      }),
    });
    const data = await response.json();
    const raw = String(data.content?.[0]?.text ?? "").replace(/```json|```/g, "").trim();
    return JSON.parse(raw);
  },
});
