"use node";

import pdf from "pdf-parse";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";

export const extractText = internalAction({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    const blob = await ctx.storage.get(storageId);
    if (!blob) throw new Error("PDF not found in Convex Storage");

    const buffer = Buffer.from(await blob.arrayBuffer());
    const result = await pdf(buffer);
    return result.text.trim();
  },
});
