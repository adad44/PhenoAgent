import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  sleepSessions: defineTable({
    userId: v.id("users"),
    source: v.union(v.literal("whoop"), v.literal("oura"), v.literal("garmin"), v.literal("manual")),
    date: v.string(),
    totalSleepMin: v.optional(v.number()),
    remMin: v.optional(v.number()),
    deepMin: v.optional(v.number()),
    lightMin: v.optional(v.number()),
    awakeMin: v.optional(v.number()),
    sleepScore: v.optional(v.number()),
    hrvMs: v.optional(v.number()),
    avgHr: v.optional(v.number()),
    respiratoryRate: v.optional(v.number()),
    rawData: v.optional(v.any()),
  }).index("by_user", ["userId"]).index("by_user_date", ["userId", "date"]),

  nutritionLogs: defineTable({
    userId: v.id("users"),
    loggedAt: v.number(),
    mealName: v.optional(v.string()),
    calories: v.optional(v.number()),
    proteinG: v.optional(v.number()),
    carbsG: v.optional(v.number()),
    fatG: v.optional(v.number()),
    fiberG: v.optional(v.number()),
    source: v.union(v.literal("manual"), v.literal("ai_scan"), v.literal("mfp"), v.literal("cronometer")),
    rawData: v.optional(v.any()),
  }).index("by_user", ["userId"]).index("by_user_time", ["userId", "loggedAt"]),

  nutritionTargets: defineTable({
    userId: v.id("users"),
    calories: v.optional(v.number()),
    proteinG: v.optional(v.number()),
    carbsG: v.optional(v.number()),
    fatG: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  trainingSessions: defineTable({
    userId: v.id("users"),
    performedAt: v.number(),
    name: v.optional(v.string()),
    sport: v.optional(v.string()),
    durationMin: v.optional(v.number()),
    sets: v.optional(v.array(v.object({
      exercise: v.string(),
      setNum: v.number(),
      weightLbs: v.optional(v.number()),
      reps: v.optional(v.number()),
      rpe: v.optional(v.number()),
    }))),
    source: v.optional(v.string()),
    rawData: v.optional(v.any()),
  }).index("by_user", ["userId"]).index("by_user_time", ["userId", "performedAt"]),

  biomarkers: defineTable({
    userId: v.id("users"),
    testedOn: v.string(),
    name: v.string(),
    value: v.number(),
    unit: v.string(),
    labRangeLow: v.optional(v.number()),
    labRangeHigh: v.optional(v.number()),
    optimalLow: v.optional(v.number()),
    optimalHigh: v.optional(v.number()),
    source: v.union(v.literal("manual"), v.literal("pdf_upload")),
    notes: v.optional(v.string()),
  }).index("by_user", ["userId"]).index("by_user_name", ["userId", "name"]),

  supplements: defineTable({
    userId: v.id("users"),
    name: v.string(),
    doseMg: v.optional(v.number()),
    frequency: v.optional(v.string()),
    timing: v.optional(v.string()),
    active: v.boolean(),
  }).index("by_user", ["userId"]),

  journalEntries: defineTable({
    userId: v.id("users"),
    date: v.string(),
    moodScore: v.optional(v.number()),
    energyScore: v.optional(v.number()),
    notes: v.optional(v.string()),
  }).index("by_user", ["userId"]).index("by_user_date", ["userId", "date"]),

  integrations: defineTable({
    userId: v.id("users"),
    provider: v.union(v.literal("whoop"), v.literal("oura"), v.literal("garmin")),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.number()),
    connected: v.boolean(),
    connectedAt: v.number(),
  }).index("by_user", ["userId"]).index("by_user_provider", ["userId", "provider"]),

  oauthStates: defineTable({
    provider: v.union(v.literal("whoop"), v.literal("oura")),
    state: v.string(),
    userId: v.id("users"),
    expiresAt: v.number(),
    consumedAt: v.optional(v.number()),
  }).index("by_provider_state", ["provider", "state"]),

  phenoMessages: defineTable({
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  }).index("by_user", ["userId"]),
});
