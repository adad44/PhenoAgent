import { useConvexAuth } from "@convex-dev/auth/react";
import { useAction, useMutation, useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { ScanLine, Target } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Button } from "../components/ui/Button";
import { Card, SectionTitle } from "../components/ui/Card";
import { useHealthData } from "../hooks/useHealthData";
import { isConvexConfigured } from "../lib/convex";
import { percent } from "../lib/utils";
import type { NutritionLog } from "../types/health";

const addNutritionLog = makeFunctionReference<"mutation", {
  loggedAt: number;
  mealName?: string;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  fiberG?: number;
  source: "manual" | "ai_scan";
}, unknown>("nutrition:addLog");
const upsertTargets = makeFunctionReference<"mutation", { calories?: number; proteinG?: number; carbsG?: number; fatG?: number }, unknown>("nutrition:upsertTargets");
const getNutritionLogs = makeFunctionReference<"query", { date: string }, NutritionLog[]>("nutrition:getLogs");
const aiScanMacros = makeFunctionReference<"action", { text: string }, Partial<NutritionLog>>("nutrition:aiScanMacros");

const emptyMealDraft = {
  mealName: "",
  calories: "",
  proteinG: "",
  carbsG: "",
  fatG: "",
  fiberG: "",
};

function Ring({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = percent(value, target);
  const stroke = 2 * Math.PI * 34;
  return (
    <div className="flex items-center gap-4 rounded-lg border border-line bg-elevated p-4">
      <div className="relative h-20 w-20">
        <svg viewBox="0 0 80 80" className="-rotate-90">
          <circle cx="40" cy="40" r="34" fill="none" stroke="#080A0F" strokeWidth="8" />
          <circle cx="40" cy="40" r="34" fill="none" stroke={color} strokeDasharray={stroke} strokeDashoffset={stroke - (stroke * pct) / 100} strokeLinecap="round" strokeWidth="8" />
        </svg>
        <span className="number absolute inset-0 grid place-items-center text-xs text-primary">{pct}%</span>
      </div>
      <div>
        <p className="text-sm text-secondary">{label}</p>
        <p className="number mt-1 text-lg text-primary">{value}/{target}</p>
      </div>
    </div>
  );
}

export function Nutrition() {
  const { nutrition, todayNutrition, nutritionTargets } = useHealthData();
  const auth = isConvexConfigured ? useConvexAuth() : { isAuthenticated: false };
  const addLiveLog = isConvexConfigured ? useMutation(addNutritionLog) : null;
  const upsertLiveTargets = isConvexConfigured ? useMutation(upsertTargets) : null;
  const scanLiveMacros = isConvexConfigured ? useAction(aiScanMacros) : null;
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const liveSelectedMeals = isConvexConfigured ? useQuery(getNutritionLogs, auth.isAuthenticated ? { date: selectedDate } : "skip") : undefined;
  const [mealOpen, setMealOpen] = useState(false);
  const [targetsOpen, setTargetsOpen] = useState(false);
  const [scanText, setScanText] = useState("");
  const [mealDraft, setMealDraft] = useState(emptyMealDraft);
  const [localMeals, setLocalMeals] = useState<NutritionLog[]>([]);
  const [localTargets, setLocalTargets] = useState(nutritionTargets);
  const [status, setStatus] = useState("");
  const fallbackMeals = useMemo(() => nutrition.filter((meal) => new Date(meal.loggedAt).toISOString().slice(0, 10) === selectedDate), [nutrition, selectedDate]);
  const selectedLocalMeals = useMemo(() => localMeals.filter((meal) => new Date(meal.loggedAt).toISOString().slice(0, 10) === selectedDate), [localMeals, selectedDate]);
  const meals = useMemo(() => [...(liveSelectedMeals ?? fallbackMeals), ...selectedLocalMeals], [fallbackMeals, liveSelectedMeals, selectedLocalMeals]);
  const totals = useMemo(() => meals.reduce((acc, meal) => ({
    calories: acc.calories + meal.calories,
    proteinG: acc.proteinG + meal.proteinG,
    carbsG: acc.carbsG + meal.carbsG,
    fatG: acc.fatG + meal.fatG,
    fiberG: acc.fiberG + meal.fiberG,
  }), { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 }), [meals]);

  async function submitMeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const meal = {
      loggedAt: selectedDate === new Date().toISOString().slice(0, 10) ? Date.now() : new Date(`${selectedDate}T12:00:00`).getTime(),
      mealName: mealDraft.mealName || String(form.get("mealName") || "Meal"),
      calories: Number(mealDraft.calories || form.get("calories") || 0),
      proteinG: Number(mealDraft.proteinG || form.get("proteinG") || 0),
      carbsG: Number(mealDraft.carbsG || form.get("carbsG") || 0),
      fatG: Number(mealDraft.fatG || form.get("fatG") || 0),
      fiberG: Number(mealDraft.fiberG || form.get("fiberG") || 0),
      source: "manual" as const,
    };
    if (isConvexConfigured && auth.isAuthenticated && addLiveLog) {
      await addLiveLog(meal);
      setStatus("Meal saved to Convex.");
    } else {
      setLocalMeals((items) => [...items, meal]);
      setStatus("Meal added to this demo view.");
    }
    setMealOpen(false);
    setMealDraft(emptyMealDraft);
    event.currentTarget.reset();
  }

  async function scanMacros() {
    if (!scanText.trim()) return;
    if (isConvexConfigured && auth.isAuthenticated && scanLiveMacros && addLiveLog) {
      const parsed = await scanLiveMacros({ text: scanText });
      setMealDraft({
        mealName: parsed.mealName ?? "AI scanned meal",
        calories: String(parsed.calories ?? 0),
        proteinG: String(parsed.proteinG ?? 0),
        carbsG: String(parsed.carbsG ?? 0),
        fatG: String(parsed.fatG ?? 0),
        fiberG: String(parsed.fiberG ?? 0),
      });
      setStatus("AI scan filled the meal form. Review it, then save.");
    } else {
      setMealDraft({ mealName: scanText.slice(0, 42), calories: "500", proteinG: "35", carbsG: "50", fatG: "18", fiberG: "8" });
      setStatus("AI scan demo estimate filled the meal form.");
    }
    setScanText("");
  }

  async function submitTargets(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = {
      calories: Number(form.get("calories") || 0),
      proteinG: Number(form.get("proteinG") || 0),
      carbsG: Number(form.get("carbsG") || 0),
      fatG: Number(form.get("fatG") || 0),
    };
    if (isConvexConfigured && auth.isAuthenticated && upsertLiveTargets) {
      await upsertLiveTargets(next);
      setStatus("Targets saved to Convex.");
    } else {
      setLocalTargets(next);
      setStatus("Targets updated for this demo view.");
    }
    setTargetsOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <h1 className="font-mono text-2xl">Nutrition</h1>
        <div className="flex flex-wrap gap-2">
          <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
          <Button variant="outline" onClick={() => setTargetsOpen(true)}><Target className="h-4 w-4" /> Targets</Button>
          <Button onClick={() => setMealOpen(true)}><ScanLine className="h-4 w-4" /> Add Meal</Button>
        </div>
      </div>
      {status ? <div className="rounded-lg border border-good/40 bg-good/10 p-3 text-sm text-good">{status}</div> : null}
      {mealOpen ? (
        <Card>
          <SectionTitle label="Add Meal" />
          <div className="mb-4 flex gap-2">
            <input value={scanText} onChange={(event) => setScanText(event.target.value)} className="min-w-0 flex-1 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" placeholder="Paste food description for AI scan" />
            <Button type="button" variant="outline" onClick={scanMacros}>AI Scan</Button>
          </div>
          <form onSubmit={submitMeal} className="grid gap-3 md:grid-cols-3">
            <input name="mealName" value={mealDraft.mealName} onChange={(event) => setMealDraft((draft) => ({ ...draft, mealName: event.target.value }))} placeholder="Meal name" className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <input name="calories" value={mealDraft.calories} onChange={(event) => setMealDraft((draft) => ({ ...draft, calories: event.target.value }))} type="number" placeholder="Calories" required className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <input name="proteinG" value={mealDraft.proteinG} onChange={(event) => setMealDraft((draft) => ({ ...draft, proteinG: event.target.value }))} type="number" placeholder="Protein g" className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <input name="carbsG" value={mealDraft.carbsG} onChange={(event) => setMealDraft((draft) => ({ ...draft, carbsG: event.target.value }))} type="number" placeholder="Carbs g" className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <input name="fatG" value={mealDraft.fatG} onChange={(event) => setMealDraft((draft) => ({ ...draft, fatG: event.target.value }))} type="number" placeholder="Fat g" className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <input name="fiberG" value={mealDraft.fiberG} onChange={(event) => setMealDraft((draft) => ({ ...draft, fiberG: event.target.value }))} type="number" placeholder="Fiber g" className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <div className="flex gap-2 md:col-span-3"><Button type="submit">Save Meal</Button><Button type="button" variant="ghost" onClick={() => { setMealOpen(false); setMealDraft(emptyMealDraft); }}>Cancel</Button></div>
          </form>
        </Card>
      ) : null}
      {targetsOpen ? (
        <Card>
          <SectionTitle label="Nutrition Targets" />
          <form onSubmit={submitTargets} className="grid gap-3 md:grid-cols-4">
            <input name="calories" type="number" defaultValue={localTargets.calories} className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <input name="proteinG" type="number" defaultValue={localTargets.proteinG} className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <input name="carbsG" type="number" defaultValue={localTargets.carbsG} className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <input name="fatG" type="number" defaultValue={localTargets.fatG} className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <div className="flex gap-2 md:col-span-4"><Button type="submit">Save Targets</Button><Button type="button" variant="ghost" onClick={() => setTargetsOpen(false)}>Cancel</Button></div>
          </form>
        </Card>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Ring label="Calories" value={totals.calories} target={localTargets.calories} color="#00E5A0" />
        <Ring label="Protein" value={totals.proteinG} target={localTargets.proteinG} color="#3B82F6" />
        <Ring label="Carbs" value={totals.carbsG} target={localTargets.carbsG} color="#F59E0B" />
        <Ring label="Fat" value={totals.fatG} target={localTargets.fatG} color="#8B5CF6" />
      </div>
      <Card>
        <SectionTitle label="Meal Timeline" value={selectedDate} />
        <div className="space-y-3">{meals.map((meal) => <div key={meal.loggedAt} className="flex flex-col justify-between gap-2 rounded-lg border border-line bg-elevated p-4 md:flex-row md:items-center"><div><p className="text-primary">{meal.mealName}</p><p className="text-sm text-secondary">{new Date(meal.loggedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></div><p className="number text-sm">{meal.calories} cal / {meal.proteinG}p {meal.carbsG}c {meal.fatG}f</p></div>)}</div>
      </Card>
    </div>
  );
}
