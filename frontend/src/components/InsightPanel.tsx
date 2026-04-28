import type {InferenceResult} from "../lib/api";

export default function InsightPanel({result}: {result: InferenceResult}) {
  const insight = result.openai_interpretation;
  return (
    <section className="border-y border-slate-200 bg-white py-5">
      <h2 className="text-lg font-semibold">Insight</h2>
      <p className="mt-2 max-w-3xl text-slate-700">{insight.summary}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold uppercase text-slate-500">Key findings</h3>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {insight.key_findings.map((finding) => <li key={finding}>{finding}</li>)}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase text-slate-500">Recommendations</h3>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {insight.recommendations.map((recommendation) => <li key={recommendation}>{recommendation}</li>)}
          </ul>
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-500">{insight.disclaimer}</p>
    </section>
  );
}
