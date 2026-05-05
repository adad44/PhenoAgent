import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { makeFunctionReference } from "convex/server";
import type { Id } from "./_generated/dataModel";
import { requireUserId } from "./lib";

const markerArgs = { testedOn: v.string(), name: v.string(), value: v.number(), unit: v.string(), labRangeLow: v.optional(v.number()), labRangeHigh: v.optional(v.number()), optimalLow: v.optional(v.number()), optimalHigh: v.optional(v.number()), notes: v.optional(v.string()) };
const extractPdfText = makeFunctionReference<"action", { storageId: Id<"_storage"> }, string>("bloodworkPdf:extractText");

export const getBiomarkers = query({
  args: { markerName: v.optional(v.string()) },
  handler: async (ctx, { markerName }) => {
    const userId = await requireUserId(ctx);
    if (markerName) return ctx.db.query("biomarkers").withIndex("by_user_name", (q) => q.eq("userId", userId).eq("name", markerName)).collect();
    return ctx.db.query("biomarkers").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
  },
});

export const getOptimalCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const markers = await ctx.db.query("biomarkers").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    const optimal = markers.filter((m) => (m.optimalLow === undefined || m.value >= m.optimalLow) && (m.optimalHigh === undefined || m.value <= m.optimalHigh)).length;
    return { optimal, total: markers.length };
  },
});

export const getLatestWeight = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const weights = await ctx.db.query("biomarkers").withIndex("by_user_name", (q) => q.eq("userId", userId).eq("name", "Weight")).order("desc").take(2);
    return { latest: weights[0], delta: weights.length > 1 ? weights[0].value - weights[1].value : 0 };
  },
});

export const addBiomarker = mutation({
  args: markerArgs,
  handler: async (ctx, args) => ctx.db.insert("biomarkers", { userId: await requireUserId(ctx), source: "manual", ...args }),
});

export const bulkInsertBiomarkers = mutation({
  args: { markers: v.array(v.object(markerArgs)) },
  handler: async (ctx, { markers }) => {
    const userId = await requireUserId(ctx);
    return Promise.all(markers.map((marker) => ctx.db.insert("biomarkers", { userId, source: "pdf_upload", ...marker })));
  },
});

export const deleteBiomarker = mutation({
  args: { id: v.id("biomarkers") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== userId) throw new Error("Biomarker not found");
    await ctx.db.delete(id);
  },
});

export const parsePdfUpload = action({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required for PDF biomarker extraction");
    const labText = await ctx.runAction(extractPdfText, { storageId });
    if (!labText) throw new Error("No text could be extracted from the PDF");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1200,
        messages: [{
          role: "user",
          content: `You are a medical lab result parser. Extract all biomarkers from this text. Return ONLY a JSON array: [{ "name": string, "value": number, "unit": string, "labRangeLow": number | null, "labRangeHigh": number | null }]. No explanation. No markdown. Raw JSON only.\n\nLAB TEXT:\n${labText}`,
        }],
      }),
    });
    const data = await response.json();
    const raw = String(data.content?.[0]?.text ?? "").replace(/```json|```/g, "").trim();
    return JSON.parse(raw).map((marker: { labRangeLow?: number | null; labRangeHigh?: number | null }) => ({
      ...marker,
      labRangeLow: marker.labRangeLow ?? undefined,
      labRangeHigh: marker.labRangeHigh ?? undefined,
    }));
  },
});
