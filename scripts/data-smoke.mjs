import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

const convexUrl = process.env.VITE_CONVEX_URL ?? "https://nautical-seahorse-122.convex.cloud";
const timestamp = Date.now();
const email = `data-smoke+${timestamp}@phenoagent.local`;
const password = `Verify-${timestamp}-pass`;
const today = new Date().toISOString().slice(0, 10);
const month = today.slice(0, 7);

const ref = (name) => makeFunctionReference(name);

async function createAuthenticatedClient() {
  const unauthenticatedClient = new ConvexHttpClient(convexUrl, { logger: false });
  const result = await unauthenticatedClient.action(ref("auth:signIn"), {
    provider: "password",
    params: { email, password, flow: "signUp" },
  });
  const token = result?.tokens?.token;
  if (!token) throw new Error("Password sign-up did not return an auth token.");
  return new ConvexHttpClient(convexUrl, { logger: false, auth: token });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const client = await createAuthenticatedClient();

async function step(label, fn) {
  try {
    return await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${label} failed: ${message}`);
  }
}

await step("sleep:addSleepSession", () => client.mutation(ref("sleep:addSleepSession"), {
  date: today,
  source: "manual",
  totalSleepMin: 455,
  remMin: 92,
  deepMin: 68,
  lightMin: 270,
  awakeMin: 22,
  sleepScore: 88,
  hrvMs: 64,
  avgHr: 56,
}));
await step("nutrition:upsertTargets", () => client.mutation(ref("nutrition:upsertTargets"), {
  calories: 2600,
  proteinG: 180,
  carbsG: 280,
  fatG: 80,
}));
await step("nutrition:addLog", () => client.mutation(ref("nutrition:addLog"), {
  loggedAt: Date.now(),
  mealName: "Smoke test meal",
  calories: 610,
  proteinG: 45,
  carbsG: 70,
  fatG: 18,
  fiberG: 9,
  source: "manual",
}));
await step("training:addSession", () => client.mutation(ref("training:addSession"), {
  performedAt: Date.now(),
  name: "Smoke Test Strength",
  sport: "strength",
  durationMin: 42,
  sets: [{ exercise: "Bench Press", setNum: 1, weightLbs: 185, reps: 5, rpe: 7 }],
  source: "manual",
}));
await step("bloodwork:addBiomarker", () => client.mutation(ref("bloodwork:addBiomarker"), {
  testedOn: today,
  name: "Smoke Test Marker",
  value: 42,
  unit: "units",
  labRangeLow: 10,
  labRangeHigh: 90,
  optimalLow: 30,
  optimalHigh: 60,
}));
await step("supplements:add", () => client.mutation(ref("supplements:add"), {
  name: "Smoke Test Supplement",
  doseMg: 500,
  frequency: "daily",
  timing: "morning",
}));
await step("journal:upsertEntry", () => client.mutation(ref("journal:upsertEntry"), {
  date: today,
  moodScore: 8,
  energyScore: 7,
  notes: "Production data smoke test.",
}));
await step("integrations:upsert", () => client.mutation(ref("integrations:upsert"), {
  provider: "garmin",
  connected: false,
}));

const [
  latestSleep,
  nutritionSummary,
  trainingSummary,
  markerCount,
  supplements,
  journalEntry,
  integrations,
  readinessScore,
  dailyBrief,
] = await step("readback", () => Promise.all([
  client.query(ref("sleep:getLatest"), {}),
  client.query(ref("nutrition:getTodaySummary"), {}),
  client.query(ref("training:getWeekSummary"), {}),
  client.query(ref("bloodwork:getOptimalCount"), {}),
  client.query(ref("supplements:getAll"), {}),
  client.query(ref("journal:getEntry"), { date: today }),
  client.query(ref("integrations:getAll"), {}),
  client.query(ref("pheno:getReadinessScore"), {}),
  client.action(ref("pheno:getDailyBrief"), {}),
]));

assert(latestSleep?.sleepScore === 88, "Sleep write/read failed.");
assert(nutritionSummary.calories >= 610, "Nutrition write/read failed.");
assert(trainingSummary.count >= 1, "Training write/read failed.");
assert(markerCount.total >= 1, "Bloodwork write/read failed.");
assert(supplements.some((item) => item.name === "Smoke Test Supplement"), "Supplement write/read failed.");
assert(journalEntry?.energyScore === 7, "Journal write/read failed.");
assert(integrations.some((item) => item.provider === "garmin"), "Integration write/read failed.");
assert(typeof readinessScore === "number", "Readiness query failed.");
assert(typeof dailyBrief === "string" && dailyBrief.length > 0, "Daily brief action failed.");

console.log(JSON.stringify({
  convexUrl,
  testAccount: "data-smoke+<timestamp>@phenoagent.local",
  sleepScore: latestSleep.sleepScore,
  calories: nutritionSummary.calories,
  trainingCount: trainingSummary.count,
  markerTotal: markerCount.total,
  supplements: supplements.length,
  integrations: integrations.length,
  readinessScore,
  dailyBrief: "ok",
}));
