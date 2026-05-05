import { useConvexAuth } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { subDays } from "date-fns";
import { isConvexConfigured } from "../lib/convex";
import type { Biomarker, JournalEntry, NutritionLog, SleepSession, Supplement, TrainingSession } from "../types/health";

const iso = (offset: number) => subDays(new Date(), offset).toISOString().slice(0, 10);

type NutritionTargets = { calories: number; proteinG: number; carbsG: number; fatG: number };
type NutritionSummary = NutritionTargets & { fiberG: number };
type HealthData = {
  live: boolean;
  sleep: SleepSession[];
  nutrition: NutritionLog[];
  nutritionTargets: NutritionTargets;
  todayNutrition: NutritionSummary;
  training: TrainingSession[];
  biomarkers: Biomarker[];
  supplements: Supplement[];
  journal: JournalEntry[];
};

type LiveSleep = Partial<SleepSession> & { date: string };
type LiveNutrition = Partial<NutritionLog> & { loggedAt: number };
type LiveTraining = Partial<TrainingSession> & { performedAt: number; sets?: Array<Partial<TrainingSession["sets"][number]> & { exercise: string; setNum: number }> };
type LiveBiomarker = Biomarker;
type LiveSupplement = Supplement & { _id?: string };
type LiveJournal = Partial<JournalEntry> & { date: string };

const convexApi = {
  sleep: makeFunctionReference<"query", { days?: number }, LiveSleep[]>("sleep:getSleepSessions"),
  nutritionLogs: makeFunctionReference<"query", { date: string }, LiveNutrition[]>("nutrition:getLogs"),
  nutritionSummary: makeFunctionReference<"query", Record<string, never>, NutritionSummary>("nutrition:getTodaySummary"),
  nutritionTargets: makeFunctionReference<"query", Record<string, never>, Partial<NutritionTargets> | null>("nutrition:getTargets"),
  training: makeFunctionReference<"query", { limit?: number }, LiveTraining[]>("training:getSessions"),
  biomarkers: makeFunctionReference<"query", { markerName?: string }, LiveBiomarker[]>("bloodwork:getBiomarkers"),
  supplements: makeFunctionReference<"query", Record<string, never>, LiveSupplement[]>("supplements:getAll"),
  journal: makeFunctionReference<"query", { month: string }, LiveJournal[]>("journal:getMonth"),
};

export function useHealthData(): HealthData {
  const auth = isConvexConfigured ? useConvexAuth() : { isAuthenticated: false };
  const useLive = isConvexConfigured && auth.isAuthenticated;
  const liveSleep = isConvexConfigured ? useQuery(convexApi.sleep, useLive ? { days: 30 } : "skip") : undefined;
  const liveNutrition = isConvexConfigured ? useQuery(convexApi.nutritionLogs, useLive ? { date: new Date().toISOString().slice(0, 10) } : "skip") : undefined;
  const liveNutritionSummary = isConvexConfigured ? useQuery(convexApi.nutritionSummary, useLive ? {} : "skip") : undefined;
  const liveTargets = isConvexConfigured ? useQuery(convexApi.nutritionTargets, useLive ? {} : "skip") : undefined;
  const liveTraining = isConvexConfigured ? useQuery(convexApi.training, useLive ? { limit: 20 } : "skip") : undefined;
  const liveBiomarkers = isConvexConfigured ? useQuery(convexApi.biomarkers, useLive ? {} : "skip") : undefined;
  const liveSupplements = isConvexConfigured ? useQuery(convexApi.supplements, useLive ? {} : "skip") : undefined;
  const liveJournal = isConvexConfigured ? useQuery(convexApi.journal, useLive ? { month: new Date().toISOString().slice(0, 7) } : "skip") : undefined;

  const sleep: SleepSession[] = Array.from({ length: 14 }, (_, index) => ({
    date: iso(13 - index),
    totalSleepMin: 405 + ((index * 19) % 90),
    remMin: 78 + ((index * 7) % 28),
    deepMin: 52 + ((index * 5) % 26),
    lightMin: 230 + ((index * 11) % 55),
    sleepScore: 72 + ((index * 4) % 21),
    hrvMs: 49 + ((index * 3) % 22),
    avgHr: 56 + (index % 7),
  }));

  const nutrition: NutritionLog[] = [
    { loggedAt: Date.now() - 7 * 60 * 60 * 1000, mealName: "Greek yogurt, berries, oats", calories: 520, proteinG: 42, carbsG: 56, fatG: 14, fiberG: 9 },
    { loggedAt: Date.now() - 3 * 60 * 60 * 1000, mealName: "Chicken rice bowl", calories: 760, proteinG: 58, carbsG: 82, fatG: 21, fiberG: 11 },
    { loggedAt: Date.now() - 60 * 60 * 1000, mealName: "Protein shake", calories: 240, proteinG: 32, carbsG: 14, fatG: 5, fiberG: 3 },
  ];

  const training: TrainingSession[] = [
    { performedAt: Date.now() - 36 * 60 * 60 * 1000, name: "Lower Strength", sport: "strength", durationMin: 68, sets: [{ exercise: "Back Squat", setNum: 1, weightLbs: 275, reps: 5, rpe: 8 }, { exercise: "Romanian Deadlift", setNum: 1, weightLbs: 225, reps: 8, rpe: 7 }] },
    { performedAt: Date.now() - 4 * 24 * 60 * 60 * 1000, name: "Zone 2 Bike", sport: "cycling", durationMin: 45, sets: [] },
    { performedAt: Date.now() - 6 * 24 * 60 * 60 * 1000, name: "Upper Strength", sport: "strength", durationMin: 61, sets: [{ exercise: "Bench Press", setNum: 1, weightLbs: 205, reps: 6, rpe: 8 }] },
  ];

  const biomarkers: Biomarker[] = [
    { testedOn: "2026-04-19", name: "ApoB", value: 82, unit: "mg/dL", labRangeLow: 0, labRangeHigh: 100, optimalLow: 0, optimalHigh: 80 },
    { testedOn: "2026-04-19", name: "HbA1c", value: 5.2, unit: "%", labRangeLow: 4, labRangeHigh: 5.6, optimalLow: 4.6, optimalHigh: 5.3 },
    { testedOn: "2026-04-19", name: "Ferritin", value: 72, unit: "ng/mL", labRangeLow: 30, labRangeHigh: 300, optimalLow: 50, optimalHigh: 120 },
    { testedOn: "2026-04-19", name: "Vitamin D", value: 42, unit: "ng/mL", labRangeLow: 30, labRangeHigh: 100, optimalLow: 40, optimalHigh: 70 },
    { testedOn: iso(1), name: "Weight", value: 184.6, unit: "lb" },
    { testedOn: iso(11), name: "Weight", value: 186.1, unit: "lb" },
  ];

  const supplements: Supplement[] = [
    { name: "Creatine", doseMg: 5000, frequency: "daily", timing: "post-training", active: true },
    { name: "Vitamin D3", doseMg: 2000, frequency: "daily", timing: "breakfast", active: true },
    { name: "Magnesium glycinate", doseMg: 300, frequency: "nightly", timing: "bed", active: true },
  ];

  const journal: JournalEntry[] = Array.from({ length: 30 }, (_, index) => ({
    date: iso(29 - index),
    moodScore: 6 + (index % 5),
    energyScore: 5 + ((index * 2) % 5),
    notes: index === 29 ? "Felt sharp after lower caffeine and earlier meal cutoff." : "",
  }));

  const nutritionTargets = { calories: 2600, proteinG: 190, carbsG: 275, fatG: 80 };
  const todayNutrition = nutrition.reduce((acc, log) => ({
    calories: acc.calories + log.calories,
    proteinG: acc.proteinG + log.proteinG,
    carbsG: acc.carbsG + log.carbsG,
    fatG: acc.fatG + log.fatG,
    fiberG: acc.fiberG + log.fiberG,
  }), { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 });

  if (useLive && liveSleep && liveNutrition && liveTraining && liveBiomarkers && liveSupplements && liveJournal) {
    const liveNutritionTargets = {
      calories: liveTargets?.calories ?? nutritionTargets.calories,
      proteinG: liveTargets?.proteinG ?? nutritionTargets.proteinG,
      carbsG: liveTargets?.carbsG ?? nutritionTargets.carbsG,
      fatG: liveTargets?.fatG ?? nutritionTargets.fatG,
    };
    const liveTodayNutrition = liveNutritionSummary
      ? {
          calories: liveNutritionSummary.calories,
          proteinG: liveNutritionSummary.proteinG,
          carbsG: liveNutritionSummary.carbsG,
          fatG: liveNutritionSummary.fatG,
          fiberG: liveNutritionSummary.fiberG,
        }
      : todayNutrition;

    return {
      live: true,
      sleep: liveSleep.map((row) => ({
        date: row.date,
        totalSleepMin: row.totalSleepMin ?? 0,
        remMin: row.remMin ?? 0,
        deepMin: row.deepMin ?? 0,
        lightMin: row.lightMin ?? 0,
        sleepScore: row.sleepScore ?? 0,
        hrvMs: row.hrvMs ?? 0,
        avgHr: row.avgHr ?? 0,
      })),
      nutrition: liveNutrition.map((row) => ({
        loggedAt: row.loggedAt,
        mealName: row.mealName ?? "Meal",
        calories: row.calories ?? 0,
        proteinG: row.proteinG ?? 0,
        carbsG: row.carbsG ?? 0,
        fatG: row.fatG ?? 0,
        fiberG: row.fiberG ?? 0,
      })),
      nutritionTargets: liveNutritionTargets,
      todayNutrition: liveTodayNutrition,
      training: liveTraining.map((row) => ({
        performedAt: row.performedAt,
        name: row.name ?? "Workout",
        sport: row.sport ?? "training",
        durationMin: row.durationMin ?? 0,
        sets: (row.sets ?? []).map((set) => ({
          exercise: set.exercise,
          setNum: set.setNum,
          weightLbs: set.weightLbs ?? 0,
          reps: set.reps ?? 0,
          rpe: set.rpe ?? 0,
        })),
      })),
      biomarkers: liveBiomarkers.map((row) => ({
        testedOn: row.testedOn,
        name: row.name,
        value: row.value,
        unit: row.unit,
        labRangeLow: row.labRangeLow,
        labRangeHigh: row.labRangeHigh,
        optimalLow: row.optimalLow,
        optimalHigh: row.optimalHigh,
      })),
      supplements: liveSupplements.map((row) => ({
        _id: row._id,
        name: row.name,
        doseMg: row.doseMg,
        frequency: row.frequency,
        timing: row.timing,
        active: row.active,
      })),
      journal: liveJournal.map((row) => ({
        date: row.date,
        moodScore: row.moodScore ?? 0,
        energyScore: row.energyScore ?? 0,
        notes: row.notes ?? "",
      })),
    };
  }

  return { live: false, sleep, nutrition, nutritionTargets, todayNutrition, training, biomarkers, supplements, journal };
}
