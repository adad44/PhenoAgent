import type {RiskPosterior} from "../lib/api";

type Props = {
  title: string;
  posterior: RiskPosterior;
  interval: [number, number];
};

const labelMap: Record<keyof RiskPosterior, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  critical: "Critical"
};

export default function RiskCard({title, posterior, interval}: Props) {
  const entries = Object.entries(posterior) as Array<[keyof RiskPosterior, number]>;
  const [state, probability] = entries.reduce((best, item) => item[1] > best[1] ? item : best);
  const riskProbability = posterior.high + posterior.critical;
  const color = riskProbability > 0.6 ? "bg-redRisk" : riskProbability >= 0.3 ? "bg-amberRisk" : "bg-clinical";

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase text-slate-500">{title}</h2>
          <p className="mt-2 text-2xl font-semibold">{labelMap[state]}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold">{Math.round(probability * 100)}%</p>
          <p className="text-xs text-slate-500">top state</p>
        </div>
      </div>
      <div className="mt-4 h-2 rounded bg-slate-100">
        <div className={`h-2 rounded ${color}`} style={{width: `${Math.round(riskProbability * 100)}%`}} />
      </div>
      <p className="mt-3 text-sm text-slate-600">
        High or critical confidence interval: {Math.round(interval[0] * 100)}-{Math.round(interval[1] * 100)}%
      </p>
    </section>
  );
}
