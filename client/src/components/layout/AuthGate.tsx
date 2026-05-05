import { useConvexAuth } from "@convex-dev/auth/react";
import { Navigate, Outlet } from "react-router-dom";
import { isConvexConfigured } from "../../lib/convex";

export function AuthGate() {
  if (!isConvexConfigured) return <Outlet />;
  return <ConvexAuthGate />;
}

function ConvexAuthGate() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-base text-secondary">
        <div className="rounded-lg border border-line bg-surface p-5 font-mono text-sm">Loading secure workspace</div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}
