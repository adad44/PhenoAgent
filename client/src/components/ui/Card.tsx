import { cn } from "../../lib/utils";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-line bg-surface p-5 transition hover:border-lineAccent", className)} {...props} />;
}

export function SectionTitle({ label, value }: { label: string; value?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <h2 className="font-mono text-lg text-primary">{label}</h2>
      {value ? <span className="number text-sm text-secondary">{value}</span> : null}
    </div>
  );
}
