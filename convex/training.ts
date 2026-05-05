import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserId } from "./lib";

const setValidator = v.object({ exercise: v.string(), setNum: v.number(), weightLbs: v.optional(v.number()), reps: v.optional(v.number()), rpe: v.optional(v.number()) });

export const getSessions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const userId = await requireUserId(ctx);
    return await ctx.db.query("trainingSessions").withIndex("by_user", (q) => q.eq("userId", userId)).order("desc").take(limit ?? 20);
  },
});

export const getWeekSummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const sessions = await ctx.db.query("trainingSessions").withIndex("by_user_time", (q) => q.eq("userId", userId).gte("performedAt", since)).collect();
    return { count: sessions.length, lastSession: sessions.at(-1)?.name ?? "No session logged", durationMin: sessions.reduce((sum, s) => sum + (s.durationMin ?? 0), 0) };
  },
});

export const getPersonalRecords = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const sessions = await ctx.db.query("trainingSessions").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    const records = new Map<string, { exercise: string; estimatedOneRm: number; performedAt: number }>();
    for (const session of sessions) for (const set of session.sets ?? []) {
      if (!set.weightLbs || !set.reps) continue;
      const estimatedOneRm = Math.round(set.weightLbs * (1 + set.reps / 30));
      const current = records.get(set.exercise);
      if (!current || estimatedOneRm > current.estimatedOneRm) records.set(set.exercise, { exercise: set.exercise, estimatedOneRm, performedAt: session.performedAt });
    }
    return [...records.values()].sort((a, b) => b.estimatedOneRm - a.estimatedOneRm);
  },
});

export const addSession = mutation({
  args: { performedAt: v.number(), name: v.optional(v.string()), sport: v.optional(v.string()), durationMin: v.optional(v.number()), sets: v.optional(v.array(setValidator)), source: v.optional(v.string()) },
  handler: async (ctx, args) => ctx.db.insert("trainingSessions", { userId: await requireUserId(ctx), ...args }),
});
