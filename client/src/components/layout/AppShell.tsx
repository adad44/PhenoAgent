import { Outlet } from "react-router-dom";
import { PhenoSidebar } from "../pheno/PhenoSidebar";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-base text-primary">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <Topbar />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
          <Outlet />
        </main>
      </div>
      <PhenoSidebar />
    </div>
  );
}
