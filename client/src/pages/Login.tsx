import { Activity } from "lucide-react";
import { FormEvent, useState } from "react";
import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { Navigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { isConvexConfigured } from "../lib/convex";

export function Login() {
  if (!isConvexConfigured) return <Navigate to="/dashboard" replace />;
  return <ConvexLogin />;
}

function ConvexLogin() {
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState("");

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    form.set("flow", mode);
    try {
      await signIn("password", form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-base p-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2 font-mono text-xl"><Activity className="h-5 w-5 text-good" /> PhenoAgent</div>
        <form onSubmit={handleSubmit}>
          <input name="email" className="mb-3 h-10 w-full rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" placeholder="Email" type="email" required />
          <input name="password" className="mb-4 h-10 w-full rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-good" placeholder="Password" type="password" required />
          {error ? <p className="mb-3 text-sm text-alert">{error}</p> : null}
          <Button className="w-full" type="submit">{mode === "signIn" ? "Sign in" : "Create account"}</Button>
        </form>
        <Button variant="ghost" className="mt-3 w-full" onClick={() => setMode(mode === "signIn" ? "signUp" : "signIn")}>
          {mode === "signIn" ? "Create an account" : "Use existing account"}
        </Button>
      </Card>
    </div>
  );
}
