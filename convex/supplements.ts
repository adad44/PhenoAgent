import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserId } from "./lib";

export const getAll = query({ args: {}, handler: async (ctx) => {
  const userId = await requireUserId(ctx);
  return ctx.db.query("supplements").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
} });
export const getActive = query({ args: {}, handler: async (ctx) => {
  const userId = await requireUserId(ctx);
  return (await ctx.db.query("supplements").withIndex("by_user", (q) => q.eq("userId", userId)).collect()).filter((s) => s.active);
} });
export const add = mutation({ args: { name: v.string(), doseMg: v.optional(v.number()), frequency: v.optional(v.string()), timing: v.optional(v.string()) }, handler: async (ctx, args) => ctx.db.insert("supplements", { userId: await requireUserId(ctx), active: true, ...args }) });
export const toggleActive = mutation({ args: { id: v.id("supplements") }, handler: async (ctx, { id }) => { const userId = await requireUserId(ctx); const doc = await ctx.db.get(id); if (!doc || doc.userId !== userId) throw new Error("Supplement not found"); await ctx.db.patch(id, { active: !doc.active }); } });
export const deleteSupplement = mutation({ args: { id: v.id("supplements") }, handler: async (ctx, { id }) => { const userId = await requireUserId(ctx); const doc = await ctx.db.get(id); if (!doc || doc.userId !== userId) throw new Error("Supplement not found"); await ctx.db.delete(id); } });
export { deleteSupplement as delete };
