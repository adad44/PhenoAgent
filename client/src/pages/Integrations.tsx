import { useAuthToken } from "@convex-dev/auth/react";
import { useAction, useMutation, useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { Link2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/Button";
import { Card, SectionTitle } from "../components/ui/Card";
import { isConvexConfigured } from "../lib/convex";

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
const getIntegrations = makeFunctionReference<"query", Record<string, never>, Array<{
  provider: "whoop" | "oura" | "garmin";
  connected: boolean;
  connectedAt: number;
}>>("integrations:getAll");
const generateUploadUrl = makeFunctionReference<"mutation", Record<string, never>, string>("files:generateUploadUrl");
const importAppleHealthCsvUpload = makeFunctionReference<"action", { storageId: string }, { inserted: number }>("integrations:importAppleHealthCsvUpload");

const providers = [
  { key: "whoop", name: "WHOOP", scopes: "sleep, recovery, workout, profile" },
  { key: "oura", name: "Oura Ring", scopes: "daily, sleep, workout" },
  { key: "garmin", name: "Garmin", scopes: "wellness sleep and activity" },
  { key: "apple", name: "Apple Health CSV", scopes: "device export import" },
];

export function Integrations() {
  const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const token = isConvexConfigured ? useAuthToken() : null;
  const integrations = isConvexConfigured ? useQuery(getIntegrations, token ? {} : "skip") : undefined;
  const addLiveSleep = isConvexConfigured ? useMutation(addSleepSession) : null;
  const generateLiveUploadUrl = isConvexConfigured ? useMutation(generateUploadUrl) : null;
  const importLiveAppleCsv = isConvexConfigured ? useAction(importAppleHealthCsvUpload) : null;
  const [error, setError] = useState("");
  const [syncStatus, setSyncStatus] = useState("");

  async function connect(providerKey: string) {
    setError("");
    if (providerKey === "apple") return;
    if (providerKey === "garmin") {
      setError("Garmin requires approved Garmin Health API credentials before OAuth can be enabled.");
      return;
    }
    if (!isConvexConfigured || !token || !apiBase) {
      setError("Live OAuth requires Convex sign-in and VITE_API_BASE_URL pointing at the deployed Express API.");
      return;
    }
    const response = await fetch(`${apiBase}/api/integrations/${providerKey}/auth`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });
    const data = await response.json() as { redirectUrl?: string; error?: string };
    if (!response.ok || !data.redirectUrl) {
      setError(data.error ?? `Unable to start ${providerKey} OAuth`);
      return;
    }
    window.location.href = data.redirectUrl;
  }

  async function sync(providerKey: string) {
    setError("");
    setSyncStatus("");
    if (!token) {
      setError("Sign in before syncing integration data.");
      return;
    }
    if (!apiBase) {
      setError("Set VITE_API_BASE_URL to the deployed Express API before syncing integrations.");
      return;
    }
    const response = await fetch(`${apiBase}/api/integrations/${providerKey}/sync`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });
    const data = await response.json() as { inserted?: number; error?: string };
    if (!response.ok) {
      setError(data.error ?? `${providerKey} sync failed`);
      return;
    }
    setSyncStatus(`${providerKey.toUpperCase()} sync imported ${data.inserted ?? 0} sleep sessions.`);
  }

  async function importAppleCsv(file: File | null) {
    if (!file) return;
    setError("");
    setSyncStatus("");
    if (isConvexConfigured && token && generateLiveUploadUrl && importLiveAppleCsv) {
      const uploadUrl = await generateLiveUploadUrl({});
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "content-type": file.type || "text/csv" },
        body: file,
      });
      if (!uploadResponse.ok) {
        setError(`Apple Health CSV upload failed: ${uploadResponse.status}`);
        return;
      }
      const { storageId } = await uploadResponse.json() as { storageId: string };
      const result = await importLiveAppleCsv({ storageId });
      setSyncStatus(`Apple Health CSV imported ${result.inserted} sleep sessions.`);
      return;
    }
    const text = await file.text();
    const rows = parseAppleSleepCsv(text);
    if (!rows.length) {
      setError("No sleep rows found. Expected CSV columns include date,totalSleepMin,remMin,deepMin,lightMin,awakeMin.");
      return;
    }
    if (isConvexConfigured && token && addLiveSleep) {
      for (const row of rows) await addLiveSleep(row);
      setSyncStatus(`Apple Health CSV imported ${rows.length} sleep sessions.`);
    } else {
      setSyncStatus(`Apple Health CSV parsed ${rows.length} sleep sessions. Sign in with Convex configured to save them.`);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-mono text-2xl">Integrations</h1>
      {error ? <div className="rounded-lg border border-alert/40 bg-alert/10 p-3 text-sm text-alert">{error}</div> : null}
      {syncStatus ? <div className="rounded-lg border border-good/40 bg-good/10 p-3 text-sm text-good">{syncStatus}</div> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {providers.map((provider) => {
          const connected = integrations?.find((item) => item.provider === provider.key)?.connected ?? false;
          return <Card key={provider.key}><SectionTitle label={provider.name} value={connected ? "connected" : "not connected"} /><p className="mb-4 text-sm text-secondary">{provider.scopes}</p><div className="flex flex-wrap gap-2">{provider.key === "apple" ? <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-line bg-transparent px-4 text-sm font-medium text-primary transition hover:border-lineAccent hover:bg-elevated"><Link2 className="h-4 w-4" /> CSV Import<input type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => importAppleCsv(event.target.files?.[0] ?? null)} /></label> : <Button variant="outline" onClick={() => connect(provider.key)}><Link2 className="h-4 w-4" /> {connected ? "Reconnect" : "Connect"}</Button>}{provider.key === "whoop" || provider.key === "oura" ? <Button variant="ghost" onClick={() => sync(provider.key)}>Sync</Button> : null}</div></Card>;
        })}
      </div>
    </div>
  );
}

function parseAppleSleepCsv(text: string) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift()?.split(",").map((header) => header.trim()) ?? [];
  const index = (name: string) => headers.findIndex((header) => header.toLowerCase() === name.toLowerCase());
  const dateIndex = index("date");
  const totalIndex = index("totalSleepMin");
  if (dateIndex < 0 || totalIndex < 0) return [];
  return lines.map((line) => {
    const cells = line.split(",").map((cell) => cell.trim());
    return {
      date: cells[dateIndex],
      source: "manual" as const,
      totalSleepMin: numberAt(cells, totalIndex),
      remMin: numberAt(cells, index("remMin")),
      deepMin: numberAt(cells, index("deepMin")),
      lightMin: numberAt(cells, index("lightMin")),
      awakeMin: numberAt(cells, index("awakeMin")),
      sleepScore: numberAt(cells, index("sleepScore")),
      hrvMs: numberAt(cells, index("hrvMs")),
      avgHr: numberAt(cells, index("avgHr")),
      respiratoryRate: numberAt(cells, index("respiratoryRate")),
    };
  }).filter((row) => row.date && row.totalSleepMin !== undefined);
}

function numberAt(cells: string[], index: number) {
  if (index < 0 || cells[index] === "") return undefined;
  return Number(cells[index]);
}
