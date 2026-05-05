import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { CheckCircle2, CircleAlert, LogOut } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card, SectionTitle } from "../components/ui/Card";
import { isConvexConfigured } from "../lib/convex";

const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;

export function Settings() {
  if (!isConvexConfigured) return <DemoSettings />;
  return <LiveSettings />;
}

function LiveSettings() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  return (
    <SettingsShell>
      <ReadinessRow label="Convex client" ready detail="VITE_CONVEX_URL is configured." />
      <ReadinessRow label="Convex auth" ready={isAuthenticated} detail={isAuthenticated ? "Signed in and protected routes are active." : "Sign in to activate protected data calls."} />
      <ReadinessRow label="Express API" ready={Boolean(apiBase)} detail={apiBase ? `Client points to ${apiBase}.` : "Set VITE_API_BASE_URL to enable OAuth and Pheno streaming."} />
      <ReadinessRow label="Provider secrets" ready={false} detail="WHOOP, Oura, Garmin, and Anthropic secrets are server-side and must be configured in deployment env." />
      <Button variant="outline" onClick={() => void signOut()}><LogOut className="h-4 w-4" /> Sign out</Button>
    </SettingsShell>
  );
}

function DemoSettings() {
  return (
    <SettingsShell>
      <ReadinessRow label="Netlify demo" ready detail="Public static demo is live without requiring secrets." />
      <ReadinessRow label="Convex client" ready={false} detail="Set VITE_CONVEX_URL to enable live auth and data subscriptions." />
      <ReadinessRow label="Express API" ready={false} detail="Set VITE_API_BASE_URL when the server is deployed." />
      <ReadinessRow label="AI and integrations" ready={false} detail="ANTHROPIC_API_KEY and provider credentials are required for live external calls." />
    </SettingsShell>
  );
}

function SettingsShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <h1 className="font-mono text-2xl">Settings</h1>
      <Card>
        <SectionTitle label="Runtime Readiness" />
        <div className="space-y-3">{children}</div>
      </Card>
    </div>
  );
}

function ReadinessRow({ label, ready, detail }: { label: string; ready: boolean; detail: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-line bg-elevated p-4">
      {ready ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-good" /> : <CircleAlert className="mt-0.5 h-5 w-5 text-caution" />}
      <div>
        <p className="text-primary">{label}</p>
        <p className="mt-1 text-sm text-secondary">{detail}</p>
      </div>
    </div>
  );
}
