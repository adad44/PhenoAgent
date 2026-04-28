import {Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend} from "recharts";

type TrendRow = {
  date: string;
  hrv_ms?: number | null;
  resting_hr?: number | null;
};

export default function TrendChart({data}: {data: TrendRow[]}) {
  const fallback = Array.from({length: 14}).map((_, index) => ({
    date: `D-${13 - index}`,
    hrv_ms: 42 + Math.sin(index / 2) * 5,
    resting_hr: 68 - Math.cos(index / 2) * 3
  }));
  const chartData = data.length ? data : fallback;

  return (
    <section className="mt-6 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">90-day wearable trends</h2>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{fontSize: 12}} minTickGap={28} />
            <YAxis tick={{fontSize: 12}} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="hrv_ms" name="HRV" stroke="#0f766e" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="resting_hr" name="Resting HR" stroke="#7c3aed" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
