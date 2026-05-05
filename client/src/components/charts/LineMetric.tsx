import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function LineMetric({ data, dataKey, color = "#00E5A0" }: { data: unknown[]; dataKey: string; color?: string }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: -24, right: 8, top: 8, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fill: "#8A95A3", fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: "#8A95A3", fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ background: "#161B24", border: "1px solid #2A3545", borderRadius: 8 }} labelStyle={{ color: "#E8EDF5" }} />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
