import { useConvexAuth } from "@convex-dev/auth/react";
import { useAction } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { useCallback } from "react";
import { isConvexConfigured } from "../lib/convex";

const getDailyBrief = makeFunctionReference<"action", Record<string, never>, string>("pheno:getDailyBrief");

export function useDailyBriefAction() {
  const auth = isConvexConfigured ? useConvexAuth() : { isAuthenticated: false };
  const action = isConvexConfigured ? useAction(getDailyBrief) : null;

  return useCallback(async () => {
    if (!isConvexConfigured || !auth.isAuthenticated || !action) return null;
    return await action({});
  }, [action, auth.isAuthenticated]);
}
