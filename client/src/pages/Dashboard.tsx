import { useConvexAuth } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { Activity, Droplet, Dumbbell, Moon, Scale, Utensils } from "lucide-react";
import { useEffect, useState } from "react";
import { MetricCard } from "../components/dashboard/MetricCard";
import { LineMetric } from "../components/charts/LineMetric";
import { Card, SectionTitle } from "../components/ui/Card";
import { useDailyBriefAction } from "../hooks/useDailyBrief";
import { useHealthData } from "../hooks/useHealthData";
import { isConvexConfigured } from "../lib/convex";
import { formatSleep, percent } from "../lib/utils";
import type { Biomarker, SleepSession } from "../types/health";

const dashboardApi = {
  latestSleep: makeFunctionReference<"query", Record<string, never>, Partial<SleepSession> | null>("sleep:getLatest"),
  nutritionSummary: makeFunctionReference<"query", Record<string, never>, { calories: number; proteinG: number; carbsG: number; fatG: number; fiberG: number }>("nutrition:getTodaySummary"),
  trainingSummary: makeFunctionReference<"query", Record<string, never>, { count: number; lastSession: string; durationMin: number }>("training:getWeekSummary"),
  optimalCount: makeFunctionReference<"query", Record<string, never>, { optimal: number; total: number }>("bloodwork:getOptimalCount"),
  latestWeight: makeFunctionReference<"query", Record<string, never>, { latest?: Biomarker; delta: number }>("bloodwork:getLatestWeight"),
  readiness: makeFunctionReference<"query", Record<string, never>, number>("pheno:getReadinessScore"),
};

export function Dashboard() {
  const { sleep, todayNutrition, nutritionTargets, training, biomarkers, journal } = useHealthData();
  const auth = isConvexConfigured ? useConvexAuth() : { isAuthenticated: false };
  const useLive = isConvexConfigured && auth.isAuthenticated;
  const liveLatestSleep = isConvexConfigured ? useQuery(dashboardApi.latestSleep, useLive ? {} : "skip") : undefined;
  const liveNutrition = isConvexConfigured ? useQuery(dashboardApi.nutritionSummary, useLive ? {} : "skip") : undefined;
  const liveTraining = isConvexConfigured ? useQuery(dashboardApi.trainingSummary, useLive ? {} : "skip") : undefined;
  const liveOptimal = isConvexConfigured ? useQuery(dashboardApi.optimalCount, useLive ? {} : "skip") : undefined;
  const liveWeight = isConvexConfigured ? useQuery(dashboardApi.latestWeight, useLive ? {} : "skip") : undefined;
  const liveReadiness = isConvexConfigured ? useQuery(dashboardApi.readiness, useLive ? {} : "skip") : undefined;
  const [brief, setBrief] = useState("Sleep score and HRV support a moderate training day. Nutrition is protein-forward, but total calories are still under target.");
  const getDailyBrief = useDailyBriefAction();
  const demoLatestSleep = sleep.at(-1);
  const latestJournal = journal.at(-1);
  const latestSleep = liveLatestSleep ?? demoLatestSleep;
  const nutrition = liveNutrition ?? todayNutrition;
  const optimal = liveOptimal?.optimal ?? biomarkers.filter((m) => (m.optimalLow === undefined || m.value >= m.optimalLow) && (m.optimalHigh === undefined || m.value <= m.optimalHigh)).length;
  const markerTotal = liveOptimal?.total ?? biomarkers.length;
  const weights = biomarkers.filter((m) => m.name === "Weight");
  const fallbackReadiness = demoLatestSleep && latestJournal ? Math.round(demoLatestSleep.sleepScore * 0.45 + demoLatestSleep.hrvMs * 0.7 + latestJournal.energyScore * 2) : null;
  const readiness = liveReadiness ?? fallbackReadiness;
  const latestWeight = liveWeight?.latest ?? weights[0];
  const weightDelta = liveWeight?.latest ? `${liveWeight.delta.toFixed(1)} lb over 10 days` : weights.length > 1 ? `${(weights[0].value - weights[1].value).toFixed(1)} lb over 10 days` : "Add another weight marker for delta";
  const trainingCount = liveTraining?.count ?? training.length;
  const lastSession = liveTraining?.lastSession ?? (training[0] ? `${training[0].name} was last logged` : "Log a workout to start trends");
  const sleepSparkline = sleep.slice(-7).map((session) => ({ value: session.sleepScore }));

  useEffect(() => {
    let cancelled = false;
    const key = `pheno_brief_${new Date().toISOString().slice(0, 10)}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      setBrief(cached);
      return;
    }
    getDailyBrief().then((liveBrief) => {
      if (cancelled) return;
      const nextBrief = liveBrief ?? brief;
      localStorage.setItem(key, nextBrief);
      setBrief(nextBrief);
    }).catch(() => {
      localStorage.setItem(key, brief);
    });
    return () => {
      cancelled = true;
    };
  }, [brief, getDailyBrief]);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-ai/40 bg-ai/10 p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="font-mono text-sm text-ai">Today's Status</p>
            <h1 className="mt-2 font-mono text-2xl text-primary">Recovery is stable, but not max output.</h1>
          </div>
          <p className="max-w-2xl text-sm text-secondary">{brief}</p>
        </div>
      </section>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Sleep" value={latestSleep?.totalSleepMin ? formatSleep(latestSleep.totalSleepMin) : "No data"} detail={latestSleep ? `${latestSleep.hrvMs ?? 0} ms HRV / ${latestSleep.sleepScore ?? 0} score` : "Add sleep manually or sync a wearable"} icon={<Moon className="h-5 w-5" />} sparkline={sleepSparkline} />
        <MetricCard label="Nutrition" value={`${nutrition.calories}`} detail={`${percent(nutrition.calories, nutritionTargets.calories)}% calories / ${nutrition.proteinG}g protein`} icon={<Utensils className="h-5 w-5" />} tone="info" />
        <MetricCard label="Training" value={`${trainingCount}`} detail={lastSession} icon={<Dumbbell className="h-5 w-5" />} tone="caution" />
        <MetricCard label="Bloodwork" value={`${optimal}/${markerTotal}`} detail="Markers inside optimal range" icon={<Droplet className="h-5 w-5" />} />
        <MetricCard label="Weight" value={latestWeight ? `${latestWeight.value} ${latestWeight.unit}` : "No data"} detail={weightDelta} icon={<Scale className="h-5 w-5" />} tone="info" />
        <MetricCard label="Readiness" value={readiness === null ? "No data" : `${readiness}`} detail="Composite sleep, HRV, energy score" icon={<Activity className="h-5 w-5" />} tone="ai" />
      </section>
      <Card>
        <SectionTitle label="HRV Trend" value="14 days" />
        <LineMetric data={sleep} dataKey="hrvMs" />
      </Card>
    </div>
  );
}
