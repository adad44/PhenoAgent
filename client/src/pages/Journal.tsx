import { useConvexAuth } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { Save } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Button } from "../components/ui/Button";
import { Card, SectionTitle } from "../components/ui/Card";
import { useHealthData } from "../hooks/useHealthData";
import { isConvexConfigured } from "../lib/convex";
import type { JournalEntry } from "../types/health";

const upsertJournalEntry = makeFunctionReference<"mutation", { date: string; moodScore?: number; energyScore?: number; notes?: string }, unknown>("journal:upsertEntry");

export function Journal() {
  const { journal } = useHealthData();
  const auth = isConvexConfigured ? useConvexAuth() : { isAuthenticated: false };
  const upsertLiveJournal = isConvexConfigured ? useMutation(upsertJournalEntry) : null;
  const [localEntries, setLocalEntries] = useState<JournalEntry[]>([]);
  const [status, setStatus] = useState("");
  const entries = useMemo(() => [...journal, ...localEntries], [journal, localEntries]);
  const month = new Date().toISOString().slice(0, 7);
  const calendar = useMemo(() => buildMonth(month), [month]);
  const entryByDate = useMemo(() => new Map(entries.map((entry) => [entry.date, entry])), [entries]);
  const latest = entries.at(-1);

  async function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const entry = {
      date: String(form.get("date") || new Date().toISOString().slice(0, 10)),
      moodScore: Number(form.get("moodScore") || 0),
      energyScore: Number(form.get("energyScore") || 0),
      notes: String(form.get("notes") || ""),
    };
    if (isConvexConfigured && auth.isAuthenticated && upsertLiveJournal) {
      await upsertLiveJournal(entry);
      setStatus("Journal entry saved to Convex.");
    } else {
      setLocalEntries((items) => [...items.filter((item) => item.date !== entry.date), entry]);
      setStatus("Journal entry saved to this demo view.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3"><h1 className="font-mono text-2xl">Journal</h1></div>
      {status ? <div className="rounded-lg border border-good/40 bg-good/10 p-3 text-sm text-good">{status}</div> : null}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <SectionTitle label={new Date(`${month}-01T00:00:00`).toLocaleDateString([], { month: "long", year: "numeric" })} />
          <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs text-secondary">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day}>{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendar.map((date, index) => {
              const entry = date ? entryByDate.get(date) : undefined;
              return (
                <div
                  key={date ?? `blank-${index}`}
                  className="aspect-square rounded-md border border-line p-2"
                  style={{ backgroundColor: entry ? `rgba(0, 229, 160, ${entry.moodScore / 18})` : "rgba(22, 27, 36, 0.45)" }}
                >
                  {date ? <span className="number text-xs text-primary">{date.slice(-2)}</span> : null}
                  {entry ? <p className="mt-2 hidden text-xs text-secondary sm:block">{entry.energyScore}/10 energy</p> : null}
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <SectionTitle label="Entry" value={latest?.date} />
          <form onSubmit={submitEntry}>
            <input name="date" type="date" defaultValue={latest?.date ?? new Date().toISOString().slice(0, 10)} className="mb-3 h-10 w-full rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <label className="mb-3 block text-sm text-secondary">Mood <input name="moodScore" type="range" min="1" max="10" defaultValue={latest?.moodScore} className="mt-2 w-full" /></label>
            <label className="mb-3 block text-sm text-secondary">Energy <input name="energyScore" type="range" min="1" max="10" defaultValue={latest?.energyScore} className="mt-2 w-full" /></label>
            <textarea name="notes" className="h-32 w-full rounded-md border border-line bg-base p-3 text-sm outline-none focus:border-good" defaultValue={latest?.notes} />
            <Button type="submit" className="mt-3"><Save className="h-4 w-4" /> Save</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

function buildMonth(month: string) {
  const first = new Date(`${month}-01T00:00:00`);
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: Array<string | null> = Array.from({ length: first.getDay() }, () => null);
  for (let day = 1; day <= days; day += 1) {
    cells.push(`${month}-${String(day).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
