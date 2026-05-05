import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { Card } from "../ui/Card";
import { cn } from "../../lib/utils";

export function MetricCard({ label, value, detail, tone = "good", icon, sparkline }: { label: string; value: string; detail: string; tone?: "good" | "caution" | "alert" | "ai" | "info"; icon: ReactNode; sparkline?: Array<{ value: number }> }) {
  return (
    <Card className="animate-enter-up">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-secondary">{label}</p>
          <p className="number mt-3 text-3xl text-primary"><CountedValue value={value} /></p>
        </div>
        <div className={cn("rounded-md border border-lineAccent bg-elevated p-2", tone === "ai" && "text-ai", tone === "good" && "text-good", tone === "caution" && "text-caution", tone === "alert" && "text-alert", tone === "info" && "text-info")}>{icon}</div>
      </div>
      {sparkline?.length ? (
        <div className="mt-4 h-12">
          <ResponsiveContainer>
            <LineChart data={sparkline}>
              <Line type="monotone" dataKey="value" stroke="#00E5A0" strokeWidth={2} dot={false} isAnimationActive />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}
      <p className="mt-4 text-sm text-secondary">{detail}</p>
    </Card>
  );
}

function CountedValue({ value }: { value: string }) {
  const parsed = useMemo(() => parseMetricValue(value), [value]);
  const [current, setCurrent] = useState(parsed?.from ?? value);

  useEffect(() => {
    if (!parsed) {
      setCurrent(value);
      return;
    }
    let frame = 0;
    let start: number | null = null;
    const duration = 650;
    const tick = (time: number) => {
      start ??= time;
      const progress = Math.min(1, (time - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(parsed.to * eased);
      setCurrent(`${next}${parsed.suffix}`);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [parsed, value]);

  return <>{current}</>;
}

function parseMetricValue(value: string) {
  const match = value.match(/^(\d+)(.*)$/);
  if (!match) return null;
  return { from: `0${match[2]}`, to: Number(match[1]), suffix: match[2] };
}
