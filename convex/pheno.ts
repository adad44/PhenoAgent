import { action, mutation, query, type ActionCtx } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { requireUserId } from "./lib";

export const getChatHistory = query({ args: {}, handler: async (ctx) => {
  const userId = await requireUserId(ctx);
  return ctx.db.query("phenoMessages").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
} });
export const addMessage = mutation({ args: { role: v.union(v.literal("user"), v.literal("assistant")), content: v.string() }, handler: async (ctx, args) => ctx.db.insert("phenoMessages", { userId: await requireUserId(ctx), ...args }) });

export const getReadinessScore = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const latestSleep = await ctx.db.query("sleepSessions").withIndex("by_user", (q) => q.eq("userId", userId)).order("desc").first();
    const latestJournal = await ctx.db.query("journalEntries").withIndex("by_user", (q) => q.eq("userId", userId)).order("desc").first();
    const sleep = latestSleep?.sleepScore ?? 75;
    const hrv = Math.min(100, Math.max(0, ((latestSleep?.hrvMs ?? 55) / 80) * 100));
    const energy = ((latestJournal?.energyScore ?? 7) / 10) * 100;
    return Math.round(sleep * 0.45 + hrv * 0.35 + energy * 0.2);
  },
});

async function buildSnapshotText(ctx: ActionCtx): Promise<string> {
  await requireUserId(ctx);
  const [sleep, nutrition, training, biomarkers, supplements, journal] = await Promise.all([
    ctx.runQuery(api.sleep.getSleepSessions, { days: 14 }),
    ctx.runQuery(api.nutrition.getLogs, { date: new Date().toISOString().slice(0, 10) }),
    ctx.runQuery(api.training.getSessions, { limit: 5 }),
    ctx.runQuery(api.bloodwork.getBiomarkers, {}),
    ctx.runQuery(api.supplements.getActive, {}),
    ctx.runQuery(api.journal.getMonth, { month: new Date().toISOString().slice(0, 7) }),
  ]);
  return [
    "USER HEALTH SNAPSHOT",
    `Sleep sessions: ${JSON.stringify(sleep)}`,
    `Nutrition today: ${JSON.stringify(nutrition)}`,
    `Training recent: ${JSON.stringify(training)}`,
    `Biomarkers: ${JSON.stringify(biomarkers)}`,
    `Active supplements: ${JSON.stringify(supplements)}`,
    `Journal this month: ${JSON.stringify(journal.slice(-3))}`,
  ].join("\n");
}

export const buildSnapshot = action({
  args: {},
  handler: async (ctx): Promise<string> => buildSnapshotText(ctx),
});

export const getDailyBrief = action({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    const snapshot = await buildSnapshotText(ctx);
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return "Readiness is available once Anthropic is configured. Your current demo snapshot is loaded and ready for personalized analysis.";
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        system: "You are Pheno, an AI health advisor. Cite the user's own data, flag concerns without diagnosing, and recommend consulting a physician for clinical decisions.",
        messages: [{ role: "user", content: `${snapshot}\n\nGive a 2-sentence readiness assessment for today. Be direct. No fluff.` }],
      }),
    });
    const data = await response.json();
    return data.content?.[0]?.text ?? "No brief returned.";
  },
});
