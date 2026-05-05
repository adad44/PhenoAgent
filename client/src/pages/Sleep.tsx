import { useConvexAuth } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { Plus } from "lucide-react";
import { FormEvent, useState } from "react";
import { LineMetric } from "../components/charts/LineMetric";
import { StackedSleep } from "../components/charts/StackedSleep";
import { Button } from "../components/ui/Button";
import { Card, SectionTitle } from "../components/ui/Card";
import { useHealthData } from "../hooks/useHealthData";
import { isConvexConfigured } from "../lib/convex";
import { formatSleep } from "../lib/utils";
import type { SleepSession } from "../types/health";

const addSleepSession = makeFunctionReference<"mutation", {
  date: string;
  source: "manual";
  totalSleepMin?: number;
  remMin?: number;
  deepMin?: number;
  lightMin?: number;
  awakeMin?: number;
  sleepScore?: number;
  hrvMs?: number;
  avgHr?: number;
  respiratoryRate?: number;
}, unknown>("sleep:addSleepSession");

export function Sleep() {
  const { sleep } = useHealthData();
  const auth = isConvexConfigured ? useConvexAuth() : { isAuthenticated: false };
  const addLiveSleep = isConvexConfigured ? useMutation(addSleepSession) : null;
  const [manualOpen, setManualOpen] = useState(false);
  const [localEntries, setLocalEntries] = useState<SleepSession[]>([]);
  const [sort, setSort] = useState<{ key: keyof SleepSession; direction: "asc" | "desc" }>({ key: "date", direction: "desc" });
  const [status, setStatus] = useState("");
  const rows = [...sleep, ...localEntries];
  const sortedRows = rows.slice().sort((a, b) => {
    const left = a[sort.key];
    const right = b[sort.key];
    const result = typeof left === "number" && typeof right === "number"
      ? left - right
      : String(left).localeCompare(String(right));
    return sort.direction === "asc" ? result : -result;
  });

  function toggleSort(key: keyof SleepSession) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  }

  async function submitManualEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const entry = {
      date: String(form.get("date")),
      source: "manual" as const,
      totalSleepMin: Number(form.get("totalSleepMin") || 0),
      remMin: Number(form.get("remMin") || 0),
      deepMin: Number(form.get("deepMin") || 0),
      lightMin: Number(form.get("lightMin") || 0),
      awakeMin: Number(form.get("awakeMin") || 0),
      sleepScore: Number(form.get("sleepScore") || 0),
      hrvMs: Number(form.get("hrvMs") || 0),
      avgHr: Number(form.get("avgHr") || 0),
    };
    if (isConvexConfigured && auth.isAuthenticated && addLiveSleep) {
      await addLiveSleep(entry);
      setStatus("Sleep session saved to Convex.");
    } else {
      setLocalEntries((items) => [...items, entry]);
      setStatus("Sleep session added to this demo view.");
    }
    setManualOpen(false);
    event.currentTarget.reset();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3"><h1 className="font-mono text-2xl">Sleep</h1><Button onClick={() => setManualOpen(true)}><Plus className="h-4 w-4" /> Manual Entry</Button></div>
      {status ? <div className="rounded-lg border border-good/40 bg-good/10 p-3 text-sm text-good">{status}</div> : null}
      {manualOpen ? (
        <Card>
          <SectionTitle label="Manual Sleep Entry" />
          <form onSubmit={submitManualEntry} className="grid gap-3 md:grid-cols-4">
            <input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <input name="totalSleepMin" type="number" placeholder="Total min" required className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <input name="remMin" type="number" placeholder="REM min" className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <input name="deepMin" type="number" placeholder="Deep min" className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <input name="lightMin" type="number" placeholder="Light min" className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <input name="awakeMin" type="number" placeholder="Awake min" className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <input name="sleepScore" type="number" placeholder="Score" className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <input name="hrvMs" type="number" placeholder="HRV ms" className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <input name="avgHr" type="number" placeholder="Avg HR" className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <div className="flex gap-2 md:col-span-4">
              <Button type="submit">Save</Button>
              <Button type="button" variant="ghost" onClick={() => setManualOpen(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><SectionTitle label="HRV" value="30 days" /><LineMetric data={rows} dataKey="hrvMs" /></Card>
        <Card><SectionTitle label="Stages" value="minutes" /><StackedSleep data={rows} /></Card>
      </div>
      <Card>
        <SectionTitle label="Sessions" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-secondary">
              <tr>
                <SortableHeader label="Date" active={sort.key === "date"} direction={sort.direction} onClick={() => toggleSort("date")} />
                <SortableHeader label="Total" active={sort.key === "totalSleepMin"} direction={sort.direction} onClick={() => toggleSort("totalSleepMin")} />
                <SortableHeader label="REM" active={sort.key === "remMin"} direction={sort.direction} onClick={() => toggleSort("remMin")} />
                <SortableHeader label="Deep" active={sort.key === "deepMin"} direction={sort.direction} onClick={() => toggleSort("deepMin")} />
                <SortableHeader label="Score" active={sort.key === "sleepScore"} direction={sort.direction} onClick={() => toggleSort("sleepScore")} />
                <SortableHeader label="HRV" active={sort.key === "hrvMs"} direction={sort.direction} onClick={() => toggleSort("hrvMs")} />
                <SortableHeader label="Avg HR" active={sort.key === "avgHr"} direction={sort.direction} onClick={() => toggleSort("avgHr")} />
              </tr>
            </thead>
            <tbody>{sortedRows.map((row) => <tr key={row.date} className="border-t border-line"><td className="py-3 number">{row.date}</td><td>{formatSleep(row.totalSleepMin)}</td><td>{row.remMin}m</td><td>{row.deepMin}m</td><td>{row.sleepScore}</td><td>{row.hrvMs} ms</td><td>{row.avgHr}</td></tr>)}</tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function SortableHeader({ label, active, direction, onClick }: { label: string; active: boolean; direction: "asc" | "desc"; onClick: () => void }) {
  return (
    <th className="py-2">
      <button type="button" onClick={onClick} className="flex items-center gap-1 text-left hover:text-primary">
        {label}
        <span className="text-[10px] text-muted">{active ? (direction === "asc" ? "ASC" : "DESC") : ""}</span>
      </button>
    </th>
  );
}
