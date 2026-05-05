import { useConvexAuth } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { Plus, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "../components/ui/Button";
import { Card, SectionTitle } from "../components/ui/Card";
import { useHealthData } from "../hooks/useHealthData";
import { isConvexConfigured } from "../lib/convex";
import type { TrainingSession } from "../types/health";

const addTrainingSession = makeFunctionReference<"mutation", {
  performedAt: number;
  name?: string;
  sport?: string;
  durationMin?: number;
  sets?: Array<{ exercise: string; setNum: number; weightLbs?: number; reps?: number; rpe?: number }>;
  source?: string;
}, unknown>("training:addSession");
const getPersonalRecords = makeFunctionReference<"query", Record<string, never>, Array<{ exercise: string; estimatedOneRm: number; performedAt: number }>>("training:getPersonalRecords");

export function Training() {
  const { training } = useHealthData();
  const auth = isConvexConfigured ? useConvexAuth() : { isAuthenticated: false };
  const addLiveTraining = isConvexConfigured ? useMutation(addTrainingSession) : null;
  const livePrs = isConvexConfigured ? useQuery(getPersonalRecords, auth.isAuthenticated ? {} : "skip") : undefined;
  const [loggerOpen, setLoggerOpen] = useState(false);
  const [localSessions, setLocalSessions] = useState<TrainingSession[]>([]);
  const [setDrafts, setSetDrafts] = useState([{ exercise: "", weightLbs: "", reps: "", rpe: "" }]);
  const [selectedExercise, setSelectedExercise] = useState("");
  const [status, setStatus] = useState("");
  const sessions = useMemo(() => [...localSessions, ...training], [localSessions, training]);
  const fallbackPrs = useMemo(() => buildPersonalRecords(sessions), [sessions]);
  const prs = livePrs ?? fallbackPrs;
  const trend = useMemo(() => buildOneRmTrend(sessions, selectedExercise || prs[0]?.exercise), [prs, selectedExercise, sessions]);

  useEffect(() => {
    if (!selectedExercise && prs[0]) setSelectedExercise(prs[0].exercise);
  }, [prs, selectedExercise]);

  async function submitWorkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const sets = setDrafts
      .filter((set) => set.exercise.trim())
      .map((set, index) => ({
        exercise: set.exercise.trim(),
        setNum: index + 1,
        weightLbs: Number(set.weightLbs || 0),
        reps: Number(set.reps || 0),
        rpe: Number(set.rpe || 0),
      }));
    const session = {
      performedAt: Date.now(),
      name: String(form.get("name") || "Workout"),
      sport: String(form.get("sport") || "strength"),
      durationMin: Number(form.get("durationMin") || 0),
      sets: sets.length ? sets : [{ exercise: "Exercise", setNum: 1, weightLbs: 0, reps: 0, rpe: 0 }],
      source: "manual",
    };
    if (isConvexConfigured && auth.isAuthenticated && addLiveTraining) {
      await addLiveTraining(session);
      setStatus("Workout saved to Convex.");
    } else {
      setLocalSessions((items) => [session, ...items]);
      setStatus("Workout added to this demo view.");
    }
    setLoggerOpen(false);
    setSetDrafts([{ exercise: "", weightLbs: "", reps: "", rpe: "" }]);
    event.currentTarget.reset();
  }

  function updateSet(index: number, key: keyof typeof setDrafts[number], value: string) {
    setSetDrafts((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3"><h1 className="font-mono text-2xl">Training</h1><Button onClick={() => setLoggerOpen(true)}><Plus className="h-4 w-4" /> Workout</Button></div>
      {status ? <div className="rounded-lg border border-good/40 bg-good/10 p-3 text-sm text-good">{status}</div> : null}
      {loggerOpen ? (
        <Card>
          <SectionTitle label="Add Workout" />
          <form onSubmit={submitWorkout} className="grid gap-3 md:grid-cols-4">
            <input name="name" placeholder="Session name" className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <input name="sport" placeholder="Sport" defaultValue="strength" className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <input name="durationMin" type="number" placeholder="Duration min" className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <div className="space-y-2 md:col-span-4">
              {setDrafts.map((set, index) => (
                <div key={index} className="grid gap-2 rounded-md border border-line bg-elevated p-3 md:grid-cols-[1fr_120px_100px_100px_40px]">
                  <input value={set.exercise} onChange={(event) => updateSet(index, "exercise", event.target.value)} placeholder="Exercise" required={index === 0} className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
                  <input value={set.weightLbs} onChange={(event) => updateSet(index, "weightLbs", event.target.value)} type="number" placeholder="Weight lb" className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
                  <input value={set.reps} onChange={(event) => updateSet(index, "reps", event.target.value)} type="number" placeholder="Reps" className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
                  <input value={set.rpe} onChange={(event) => updateSet(index, "rpe", event.target.value)} type="number" placeholder="RPE" className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
                  <Button type="button" variant="ghost" className="h-10 px-0" onClick={() => setSetDrafts((items) => items.length === 1 ? items : items.filter((_, itemIndex) => itemIndex !== index))} aria-label="Remove set"><X className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => setSetDrafts((items) => [...items, { exercise: "", weightLbs: "", reps: "", rpe: "" }])}><Plus className="h-4 w-4" /> Add Set</Button>
            </div>
            <div className="flex gap-2 md:col-span-4"><Button type="submit">Save Workout</Button><Button type="button" variant="ghost" onClick={() => setLoggerOpen(false)}>Cancel</Button></div>
          </form>
        </Card>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <SectionTitle label="1RM Trend" value={selectedExercise || "No sets"} />
            <select value={selectedExercise} onChange={(event) => setSelectedExercise(event.target.value)} className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good">
              {prs.map((record) => <option key={record.exercise} value={record.exercise}>{record.exercise}</option>)}
            </select>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={trend}>
                <XAxis dataKey="date" tick={{ fill: "#8A95A3", fontSize: 11 }} />
                <YAxis tick={{ fill: "#8A95A3", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#161B24", border: "1px solid #2A3545" }} />
                <Line type="monotone" dataKey="estimatedOneRm" stroke="#00E5A0" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <SectionTitle label="Personal Records" value="Epley" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="text-secondary"><tr><th className="py-2">Exercise</th><th>Est. 1RM</th><th>Date</th></tr></thead>
              <tbody>{prs.map((record) => <tr key={record.exercise} className="border-t border-line"><td className="py-3">{record.exercise}</td><td className="number">{record.estimatedOneRm} lb</td><td className="number">{new Date(record.performedAt).toLocaleDateString()}</td></tr>)}</tbody>
            </table>
          </div>
        </Card>
      </div>
      <Card>
        <SectionTitle label="Recent Sessions" />
        <div className="space-y-3">{sessions.map((session) => <div key={session.performedAt} className="rounded-lg border border-line bg-elevated p-4"><div className="flex justify-between"><p>{session.name}</p><span className="number text-sm text-secondary">{session.durationMin}m</span></div><p className="mt-2 text-sm text-secondary">{session.sport} / {session.sets.length || 1} blocks</p></div>)}</div>
      </Card>
    </div>
  );
}

function buildPersonalRecords(sessions: TrainingSession[]) {
  const records = new Map<string, { exercise: string; estimatedOneRm: number; performedAt: number }>();
  for (const session of sessions) {
    for (const set of session.sets) {
      if (!set.weightLbs || !set.reps) continue;
      const estimatedOneRm = Math.round(set.weightLbs * (1 + set.reps / 30));
      const current = records.get(set.exercise);
      if (!current || estimatedOneRm > current.estimatedOneRm) records.set(set.exercise, { exercise: set.exercise, estimatedOneRm, performedAt: session.performedAt });
    }
  }
  return [...records.values()].sort((a, b) => b.estimatedOneRm - a.estimatedOneRm);
}

function buildOneRmTrend(sessions: TrainingSession[], exercise?: string) {
  if (!exercise) return [];
  return sessions
    .flatMap((session) => session.sets
      .filter((set) => set.exercise === exercise && set.weightLbs && set.reps)
      .map((set) => ({
        date: new Date(session.performedAt).toLocaleDateString([], { month: "short", day: "numeric" }),
        performedAt: session.performedAt,
        estimatedOneRm: Math.round(set.weightLbs * (1 + set.reps / 30)),
      })))
    .sort((a, b) => a.performedAt - b.performedAt);
}
