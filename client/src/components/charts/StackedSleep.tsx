import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function StackedSleep({ data }: { data: unknown[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: -24, right: 8, top: 8, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fill: "#8A95A3", fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: "#8A95A3", fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ background: "#161B24", border: "1px solid #2A3545", borderRadius: 8 }} />
          <Bar dataKey="deepMin" stackId="a" fill="#3B82F6" radius={[0, 0, 4, 4]} />
          <Bar dataKey="remMin" stackId="a" fill="#8B5CF6" />
          <Bar dataKey="lightMin" stackId="a" fill="#00E5A0" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
