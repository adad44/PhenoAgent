import { useConvexAuth } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { Plus } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Button } from "../components/ui/Button";
import { Card, SectionTitle } from "../components/ui/Card";
import { useHealthData } from "../hooks/useHealthData";
import { isConvexConfigured } from "../lib/convex";
import type { Supplement } from "../types/health";

const addSupplement = makeFunctionReference<"mutation", { name: string; doseMg?: number; frequency?: string; timing?: string }, unknown>("supplements:add");
const getActiveSupplements = makeFunctionReference<"query", Record<string, never>, Supplement[]>("supplements:getActive");
const toggleSupplement = makeFunctionReference<"mutation", { id: string }, unknown>("supplements:toggleActive");

export function Supplements() {
  const { supplements } = useHealthData();
  const auth = isConvexConfigured ? useConvexAuth() : { isAuthenticated: false };
  const liveActiveSupplements = isConvexConfigured ? useQuery(getActiveSupplements, auth.isAuthenticated ? {} : "skip") : undefined;
  const addLiveSupplement = isConvexConfigured ? useMutation(addSupplement) : null;
  const toggleLiveSupplement = isConvexConfigured ? useMutation(toggleSupplement) : null;
  const [addOpen, setAddOpen] = useState(false);
  const [localSupplements, setLocalSupplements] = useState<Supplement[]>([]);
  const [status, setStatus] = useState("");
  const allSupplements = useMemo(() => [...supplements, ...localSupplements], [supplements, localSupplements]);
  const activeStack = useMemo(() => [...(liveActiveSupplements ?? supplements.filter((item) => item.active)), ...localSupplements.filter((item) => item.active)], [liveActiveSupplements, localSupplements, supplements]);
  const pausedStack = useMemo(() => allSupplements.filter((item) => !item.active), [allSupplements]);

  async function submitSupplement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const supplement = {
      name: String(form.get("name") || "Supplement"),
      doseMg: Number(form.get("doseMg") || 0),
      frequency: String(form.get("frequency") || ""),
      timing: String(form.get("timing") || ""),
    };
    if (isConvexConfigured && auth.isAuthenticated && addLiveSupplement) {
      await addLiveSupplement(supplement);
      setStatus("Supplement saved to Convex.");
    } else {
      setLocalSupplements((items) => [...items, { ...supplement, active: true }]);
      setStatus("Supplement added to this demo view.");
    }
    setAddOpen(false);
  }

  async function toggle(item: Supplement, index: number) {
    if (isConvexConfigured && auth.isAuthenticated && toggleLiveSupplement && "_id" in item && typeof item._id === "string") {
      await toggleLiveSupplement({ id: item._id });
      setStatus("Supplement updated in Convex.");
      return;
    }
    setLocalSupplements((items) => items.map((local) => local === item ? { ...local, active: !local.active } : local));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3"><h1 className="font-mono text-2xl">Supplements</h1><Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add</Button></div>
      {status ? <div className="rounded-lg border border-good/40 bg-good/10 p-3 text-sm text-good">{status}</div> : null}
      {addOpen ? (
        <Card>
          <SectionTitle label="Add Supplement" />
          <form onSubmit={submitSupplement} className="grid gap-3 md:grid-cols-4">
            <input name="name" placeholder="Name" required className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <input name="doseMg" type="number" placeholder="Dose mg" className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <input name="frequency" placeholder="Frequency" className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <input name="timing" placeholder="Timing" className="h-10 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" />
            <div className="flex gap-2 md:col-span-4"><Button type="submit">Save</Button><Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button></div>
          </form>
        </Card>
      ) : null}
      <Card>
        <SectionTitle label="Active Stack" value={`${activeStack.length} active`} />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {activeStack.map((item, index) => <SupplementCard key={`${item.name}-${index}`} item={item} index={index} onToggle={toggle} />)}
        </div>
      </Card>
      {pausedStack.length ? (
        <Card>
          <SectionTitle label="Paused" value={`${pausedStack.length} off`} />
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {pausedStack.map((item, index) => <SupplementCard key={`${item.name}-${index}`} item={item} index={index} onToggle={toggle} />)}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function SupplementCard({ item, index, onToggle }: { item: Supplement; index: number; onToggle: (item: Supplement, index: number) => void }) {
  return (
    <div className="rounded-lg border border-line bg-elevated p-4">
      <div className="flex justify-between">
        <p>{item.name}</p>
        <button className={item.active ? "text-good" : "text-muted"} onClick={() => onToggle(item, index)}>{item.active ? "active" : "off"}</button>
      </div>
      <p className="mt-2 text-sm text-secondary">{item.doseMg} mg / {item.frequency} / {item.timing}</p>
    </div>
  );
}
