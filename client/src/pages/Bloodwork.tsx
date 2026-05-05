import { useConvexAuth } from "@convex-dev/auth/react";
import { useAction, useMutation } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { Minus, TrendingDown, TrendingUp, Upload } from "lucide-react";
import { Fragment, FormEvent, useMemo, useState } from "react";
import { Button } from "../components/ui/Button";
import { Card, SectionTitle } from "../components/ui/Card";
import { useHealthData } from "../hooks/useHealthData";
import { isConvexConfigured } from "../lib/convex";
import type { Biomarker } from "../types/health";

const addBiomarker = makeFunctionReference<"mutation", {
  testedOn: string;
  name: string;
  value: number;
  unit: string;
  labRangeLow?: number;
  labRangeHigh?: number;
  optimalLow?: number;
  optimalHigh?: number;
  notes?: string;
}, unknown>("bloodwork:addBiomarker");
const bulkInsertBiomarkers = makeFunctionReference<"mutation", { markers: Array<{
  testedOn: string;
  name: string;
  value: number;
  unit: string;
  labRangeLow?: number;
  labRangeHigh?: number;
  optimalLow?: number;
  optimalHigh?: number;
  notes?: string;
}> }, unknown>("bloodwork:bulkInsertBiomarkers");
const parsePdfUpload = makeFunctionReference<"action", { storageId: string }, Array<{
  name: string;
  value: number;
  unit: string;
  labRangeLow?: number;
  labRangeHigh?: number;
}> >("bloodwork:parsePdfUpload");
const generateUploadUrl = makeFunctionReference<"mutation", Record<string, never>, string>("files:generateUploadUrl");

function category(name: string) {
  const normalized = name.toLowerCase();
  if (["apob", "ldl", "hdl", "triglycerides", "total cholesterol"].some((marker) => normalized.includes(marker))) return "Lipids";
  if (["hba1c", "glucose", "insulin", "weight"].some((marker) => normalized.includes(marker))) return "Metabolic";
  if (["testosterone", "estradiol", "cortisol", "tsh", "t3", "t4"].some((marker) => normalized.includes(marker))) return "Hormones";
  if (["vitamin d", "ferritin", "b12", "magnesium"].some((marker) => normalized.includes(marker))) return "Nutrients";
  if (["wbc", "rbc", "hemoglobin", "hematocrit", "platelet"].some((marker) => normalized.includes(marker))) return "CBC";
  return "Other";
}

export function Bloodwork() {
  const { biomarkers } = useHealthData();
  const auth = isConvexConfigured ? useConvexAuth() : { isAuthenticated: false };
  const addLiveBiomarker = isConvexConfigured ? useMutation(addBiomarker) : null;
  const bulkInsertLiveBiomarkers = isConvexConfigured ? useMutation(bulkInsertBiomarkers) : null;
  const generateLiveUploadUrl = isConvexConfigured ? useMutation(generateUploadUrl) : null;
  const parseLivePdf = isConvexConfigured ? useAction(parsePdfUpload) : null;
  const [manualOpen, setManualOpen] = useState(false);
  const [localMarkers, setLocalMarkers] = useState<Biomarker[]>([]);
  const [parsedPdfMarkers, setParsedPdfMarkers] = useState<Biomarker[]>([]);
  const [status, setStatus] = useState("");
  const markers = useMemo(() => [...biomarkers, ...localMarkers], [biomarkers, localMarkers]);
  const groupedMarkers = useMemo(() => {
    const groups = new Map<string, Biomarker[]>();
    for (const marker of markers) {
      const group = category(marker.name);
      groups.set(group, [...(groups.get(group) ?? []), marker]);
    }
    return ["Lipids", "Metabolic", "Hormones", "Nutrients", "CBC", "Other"]
      .map((group) => ({ group, rows: groups.get(group) ?? [] }))
      .filter((group) => group.rows.length);
  }, [markers]);
  const previousByMarker = useMemo(() => {
    const map = new Map<string, Biomarker[]>();
    for (const marker of markers) {
      map.set(marker.name, [...(map.get(marker.name) ?? []), marker].sort((a, b) => b.testedOn.localeCompare(a.testedOn)));
    }
    return map;
  }, [markers]);

  async function submitMarker(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const marker = {
      testedOn: String(form.get("testedOn") || new Date().toISOString().slice(0, 10)),
      name: String(form.get("name") || "Marker"),
      value: Number(form.get("value") || 0),
      unit: String(form.get("unit") || ""),
      labRangeLow: optionalNumber(form.get("labRangeLow")),
      labRangeHigh: optionalNumber(form.get("labRangeHigh")),
      optimalLow: optionalNumber(form.get("optimalLow")),
      optimalHigh: optionalNumber(form.get("optimalHigh")),
    };
    if (isConvexConfigured && auth.isAuthenticated && addLiveBiomarker) {
      await addLiveBiomarker(marker);
      setStatus("Biomarker saved to Convex.");
    } else {
      setLocalMarkers((items) => [...items, marker]);
      setStatus("Biomarker added to this demo view.");
    }
    setManualOpen(false);
  }

  async function uploadPdf(file: File | null) {
    if (!file) return;
    setStatus("");
    if (!isConvexConfigured || !auth.isAuthenticated || !generateLiveUploadUrl || !parseLivePdf) {
      setStatus("PDF upload requires a signed-in Convex deployment. Manual add is available in demo mode.");
      return;
    }
    const uploadUrl = await generateLiveUploadUrl({});
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: { "content-type": file.type || "application/pdf" },
      body: file,
    });
    if (!uploadResponse.ok) throw new Error(`PDF upload failed: ${uploadResponse.status}`);
    const { storageId } = await uploadResponse.json() as { storageId: string };
    const parsed = await parseLivePdf({ storageId });
    const testedOn = new Date().toISOString().slice(0, 10);
    setParsedPdfMarkers(parsed.map((marker) => ({
      testedOn,
      name: marker.name,
      value: marker.value,
      unit: marker.unit,
      labRangeLow: marker.labRangeLow,
      labRangeHigh: marker.labRangeHigh,
    })));
    setStatus("PDF parsed. Review markers below, then confirm import.");
  }

  async function confirmPdfMarkers() {
    if (!parsedPdfMarkers.length) return;
    if (isConvexConfigured && auth.isAuthenticated && bulkInsertLiveBiomarkers) {
      await bulkInsertLiveBiomarkers({ markers: parsedPdfMarkers.map(({ testedOn, name, value, unit, labRangeLow, labRangeHigh, optimalLow, optimalHigh }) => ({ testedOn, name, value, unit, labRangeLow, labRangeHigh, optimalLow, optimalHigh })) });
      setStatus("PDF biomarkers saved to Convex.");
    } else {
      setLocalMarkers((items) => [...items, ...parsedPdfMarkers]);
      setStatus("PDF biomarkers added to this demo view.");
    }
    setParsedPdfMarkers([]);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3"><h1 className="font-mono text-2xl">Bloodwork</h1><div className="flex gap-2"><Button variant="outline" onClick={() => setManualOpen(true)}>Manual Add</Button><label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-good px-4 text-sm font-medium text-[#04110d] transition hover:bg-good/90"><Upload className="h-4 w-4" /> PDF Upload<input type="file" accept="application/pdf" className="hidden" onChange={(event) => uploadPdf(event.target.files?.[0] ?? null)} /></label></div></div>
      {status ? <div className="rounded-lg border border-good/40 bg-good/10 p-3 text-sm text-good">{status}</div> : null}
      {parsedPdfMarkers.length ? (
        <Card>
          <SectionTitle label="Review PDF Markers" value={`${parsedPdfMarkers.length} parsed`} />
          <div className="mb-4 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {parsedPdfMarkers.map((marker) => <div key={`${marker.name}-${marker.value}`} className="rounded-md border border-line bg-elevated p-3 text-sm"><p>{marker.name}</p><p className="number text-secondary">{marker.value} {marker.unit}</p></div>)}
          </div>
          <Button onClick={confirmPdfMarkers}>Confirm Import</Button>
        </Card>
      ) : null}
      {manualOpen ? (
        <Card>
          <SectionTitle label="Manual Biomarker" />
          <form onSubmit={submitMarker} className="grid gap-3 md:grid-cols-4">
            <input name="testedOn" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <input name="name" placeholder="Marker" required className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <input name="value" type="number" step="any" placeholder="Value" required className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <input name="unit" placeholder="Unit" required className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <input name="labRangeLow" type="number" step="any" placeholder="Lab low" className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <input name="labRangeHigh" type="number" step="any" placeholder="Lab high" className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <input name="optimalLow" type="number" step="any" placeholder="Optimal low" className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <input name="optimalHigh" type="number" step="any" placeholder="Optimal high" className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <div className="flex gap-2 md:col-span-4"><Button type="submit">Save Marker</Button><Button type="button" variant="ghost" onClick={() => setManualOpen(false)}>Cancel</Button></div>
          </form>
        </Card>
      ) : null}
      <Card>
        <SectionTitle label="Biomarkers" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-secondary"><tr><th className="py-2">Name</th><th>Value</th><th>Lab Range</th><th>Optimal</th><th>Trend</th><th>Tested</th></tr></thead>
            <tbody>
              {groupedMarkers.map(({ group, rows }) => (
                <Fragment key={group}>
                  <tr className="border-t border-line bg-elevated/70"><td colSpan={6} className="py-2 font-mono text-xs uppercase text-secondary">{group}</td></tr>
                  {rows.map((marker) => <tr key={`${marker.name}-${marker.testedOn}`} className="border-t border-line"><td className="py-3">{marker.name}</td><td className="number">{marker.value} {marker.unit}</td><td><RangeBar marker={marker} low={marker.labRangeLow} high={marker.labRangeHigh} /></td><td><RangeBar marker={marker} low={marker.optimalLow} high={marker.optimalHigh} accent /></td><td><Trend marker={marker} history={previousByMarker.get(marker.name) ?? []} /></td><td className="number">{marker.testedOn}</td></tr>)}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function optionalNumber(value: FormDataEntryValue | null) {
  if (value === null || value === "") return undefined;
  return Number(value);
}

function RangeBar({ marker, low, high, accent = false }: { marker: Biomarker; low?: number; high?: number; accent?: boolean }) {
  if (low === undefined || high === undefined || high <= low) return <span className="text-secondary">-</span>;
  const position = Math.max(0, Math.min(100, ((marker.value - low) / (high - low)) * 100));
  const inRange = marker.value >= low && marker.value <= high;
  return (
    <div className="min-w-[150px]">
      <div className="mb-1 flex justify-between text-xs text-secondary"><span>{low}</span><span>{high}</span></div>
      <div className="relative h-2 rounded-full bg-base">
        <div className={`h-2 rounded-full ${accent ? "bg-good/70" : "bg-info/70"}`} />
        <div className={`absolute top-1/2 h-3 w-1 -translate-y-1/2 rounded-full ${inRange ? "bg-good" : "bg-alert"}`} style={{ left: `${position}%` }} />
      </div>
    </div>
  );
}

function Trend({ marker, history }: { marker: Biomarker; history: Biomarker[] }) {
  const previous = history.find((item) => item.testedOn < marker.testedOn);
  if (!previous) return <Minus className="h-4 w-4 text-muted" />;
  const delta = marker.value - previous.value;
  if (delta === 0) return <Minus className="h-4 w-4 text-muted" />;
  const Icon = delta > 0 ? TrendingUp : TrendingDown;
  return <span className="inline-flex items-center gap-1 text-xs text-secondary"><Icon className={delta > 0 ? "h-4 w-4 text-caution" : "h-4 w-4 text-good"} />{Math.abs(delta).toFixed(1)}</span>;
}
