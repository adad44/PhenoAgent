import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserId } from "./lib";

export const getSleepSessions = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const since = Date.now() - (args.days ?? 30) * 24 * 60 * 60 * 1000;
    return await ctx.db.query("sleepSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.gte(q.field("_creationTime"), since))
      .order("desc")
      .collect();
  },
});

export const getLatest = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.db.query("sleepSessions").withIndex("by_user", (q) => q.eq("userId", userId)).order("desc").first();
  },
});

export const addSleepSession = mutation({
  args: {
    date: v.string(),
    source: v.union(v.literal("whoop"), v.literal("oura"), v.literal("garmin"), v.literal("manual")),
    totalSleepMin: v.optional(v.number()),
    remMin: v.optional(v.number()),
    deepMin: v.optional(v.number()),
    lightMin: v.optional(v.number()),
    awakeMin: v.optional(v.number()),
    sleepScore: v.optional(v.number()),
    hrvMs: v.optional(v.number()),
    avgHr: v.optional(v.number()),
    respiratoryRate: v.optional(v.number()),
  },
  handler: async (ctx, args) => ctx.db.insert("sleepSessions", { userId: await requireUserId(ctx), ...args }),
});

export const deleteSleepSession = mutation({
  args: { id: v.id("sleepSessions") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== userId) throw new Error("Sleep session not found");
    await ctx.db.delete(id);
  },
});
