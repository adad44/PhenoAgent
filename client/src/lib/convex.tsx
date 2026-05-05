import { ReactNode, useMemo } from "react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";

export const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
export const isConvexConfigured = Boolean(convexUrl);

export function ConvexShell({ children }: { children: ReactNode }) {
  const client = useMemo(() => convexUrl ? new ConvexReactClient(convexUrl) : null, [convexUrl]);
  if (!client) return <>{children}</>;
  return <ConvexAuthProvider client={client}>{children}</ConvexAuthProvider>;
}
