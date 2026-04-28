import {MessageCircle, PlayCircle} from "lucide-react";
import RiskCard from "../components/RiskCard";
import InsightPanel from "../components/InsightPanel";
import TrendChart from "../components/TrendChart";
import type {InferenceResult} from "../lib/api";
import {runInference} from "../lib/api";
import {demoResult, demoTrend} from "../lib/demo";
import {useState} from "react";

export default function Dashboard({result, onResult, onAsk}: {result: InferenceResult | null; onResult: (result: InferenceResult) => void; onAsk: () => void}) {
  const [latest, setLatest] = useState(result);
  const [busy, setBusy] = useState(false);

  async function runDemo() {
    setBusy(true);
    try {
      let next: InferenceResult;
      try {
        next = await runInference();
      } catch {
        next = demoResult;
      }
      setLatest(next);
      onResult(next);
      localStorage.setItem("phenoagent:latest-result", JSON.stringify(next));
    } finally {
      setBusy(false);
    }
  }

  if (!latest) {
    return (
      <section className="rounded-md border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-xl font-semibold">No analysis yet</h2>
        <p className="mx-auto mt-2 max-w-xl text-slate-600">
          Run the demo analysis or upload data first. The demo uses the sample lab fixture from the MVP spec.
        </p>
        <button onClick={runDemo} className="mt-5 inline-flex items-center gap-2 rounded bg-clinical px-4 py-2 font-medium text-white">
          <PlayCircle size={18} />
          {busy ? "Running..." : "Run demo analysis"}
        </button>
      </section>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Dashboard</h2>
          <p className="text-sm text-slate-500">Latest analysis created {new Date(latest.created_at).toLocaleString()}</p>
        </div>
        <button onClick={onAsk} className="inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium">
          <MessageCircle size={16} />
          Ask a question
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <RiskCard title="Metabolic" posterior={latest.bbn_posteriors.metabolic} interval={latest.confidence_intervals.metabolic} />
        <RiskCard title="Cardiovascular" posterior={latest.bbn_posteriors.cardiovascular} interval={latest.confidence_intervals.cardiovascular} />
        <RiskCard title="Sleep" posterior={latest.bbn_posteriors.sleep} interval={latest.confidence_intervals.sleep} />
      </div>

      <div className="mt-6">
        <InsightPanel result={latest} />
      </div>
      <TrendChart data={demoTrend} />
    </div>
  );
}
