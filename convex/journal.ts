import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserId } from "./lib";

export const getMonth = query({
  args: { month: v.string() },
  handler: async (ctx, { month }) => {
    const userId = await requireUserId(ctx);
    return (await ctx.db.query("journalEntries").withIndex("by_user", (q) => q.eq("userId", userId)).collect()).filter((entry) => entry.date.startsWith(month));
  },
});

export const getEntry = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const userId = await requireUserId(ctx);
    return ctx.db.query("journalEntries").withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date)).first();
  },
});

export const upsertEntry = mutation({
  args: { date: v.string(), moodScore: v.optional(v.number()), energyScore: v.optional(v.number()), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db.query("journalEntries").withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", args.date)).first();
    if (existing) return ctx.db.patch(existing._id, args);
    return ctx.db.insert("journalEntries", { userId, ...args });
  },
});
