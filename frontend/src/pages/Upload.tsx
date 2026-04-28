import {Activity, Dna, FileText, UploadCloud} from "lucide-react";
import type {ReactNode} from "react";
import {useState} from "react";
import type {InferenceResult, LabResult, WearableSummary} from "../lib/api";
import {runInference, uploadFile} from "../lib/api";
import {demoResult} from "../lib/demo";

type Preview = {
  labs?: {results: LabResult[]; failed_values: string[]};
  wearables?: WearableSummary;
  genome?: {snp_count: number; notable_snps: Record<string, string>};
};

function UploadZone({
  label,
  accept,
  icon,
  onFile
}: {
  label: string;
  accept: string;
  icon: ReactNode;
  onFile: (file: File) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  async function handle(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      await onFile(file);
    } finally {
      setBusy(false);
    }
  }
  return (
    <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-white p-4 text-center hover:border-clinical">
      <input className="hidden" type="file" accept={accept} onChange={(event) => handle(event.target.files?.[0])} />
      <div className="mb-3 rounded bg-slate-100 p-3 text-clinical">{icon}</div>
      <span className="font-medium">{label}</span>
      <span className="mt-1 text-sm text-slate-500">{busy ? "Uploading..." : "Drag-and-drop or click"}</span>
    </label>
  );
}

export default function Upload({onResult}: {onResult: (result: InferenceResult) => void}) {
  const [preview, setPreview] = useState<Preview>({});
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function handleRun() {
    setRunning(true);
    setError(null);
    try {
      onResult(await runInference());
    } catch (err) {
      onResult(demoResult);
      setError(err instanceof Error ? `Backend unavailable, opened the built-in demo instead. ${err.message}` : "Backend unavailable, opened the built-in demo instead.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-semibold">Upload data</h2>
        <p className="text-sm text-slate-500">Lab PDFs, wearable exports, and optional 23andMe raw files feed the analysis.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <UploadZone
          label="Lab PDF"
          accept="application/pdf"
          icon={<FileText size={24} />}
          onFile={async (file) => {
            const labs = await uploadFile("labs", file);
            setPreview((old) => ({...old, labs}));
          }}
        />
        <UploadZone
          label="Wearable export"
          accept=".csv,.xml,text/xml,text/csv"
          icon={<Activity size={24} />}
          onFile={async (file) => {
            const wearables = await uploadFile("wearables", file);
            setPreview((old) => ({...old, wearables}));
          }}
        />
        <UploadZone
          label="Genome file"
          accept=".txt,.csv"
          icon={<Dna size={24} />}
          onFile={async (file) => {
            const genome = await uploadFile("genome", file);
            setPreview((old) => ({...old, genome}));
          }}
        />
      </div>

      <section className="mt-6 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold">Parse preview</h3>
          <button onClick={handleRun} className="inline-flex items-center gap-2 rounded bg-clinical px-4 py-2 font-medium text-white">
            <UploadCloud size={18} />
            {running ? "Running..." : "Run analysis"}
          </button>
        </div>
        {error && <p className="mt-3 rounded bg-red-50 p-3 text-sm text-redRisk">{error}</p>}
        {preview.labs && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-slate-500">
                <tr><th className="py-2">Lab</th><th>Value</th><th>Unit</th><th>Flag</th></tr>
              </thead>
              <tbody>
                {preview.labs.results.map((lab) => (
                  <tr key={lab.name} className="border-b last:border-0">
                    <td className="py-2 font-medium">{lab.name}</td><td>{lab.value}</td><td>{lab.unit || "-"}</td><td>{lab.flag}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {preview.wearables && (
          <p className="mt-4 text-sm text-slate-700">
            Parsed {preview.wearables.daily.length} daily wearable rows from {preview.wearables.source}.
          </p>
        )}
        {preview.genome && (
          <p className="mt-4 text-sm text-slate-700">
            Parsed {preview.genome.snp_count.toLocaleString()} SNPs with {Object.keys(preview.genome.notable_snps).length} tracked SNPs.
          </p>
        )}
        {!preview.labs && !preview.wearables && !preview.genome && (
          <p className="mt-4 text-sm text-slate-500">No files uploaded yet. On the live site, running analysis opens the built-in synthetic demo.</p>
        )}
      </section>
    </div>
  );
}
