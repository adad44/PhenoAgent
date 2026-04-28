import {Activity, Home as HomeIcon, MessageCircle, UploadCloud} from "lucide-react";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Chat from "./pages/Chat";
import type {InferenceResult} from "./lib/api";
import {useState} from "react";

type Page = "home" | "upload" | "dashboard" | "chat";

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [result, setResult] = useState<InferenceResult | null>(() => {
    const saved = localStorage.getItem("phenoagent:latest-result");
    return saved ? JSON.parse(saved) : null;
  });

  function updateResult(next: InferenceResult) {
    setResult(next);
    localStorage.setItem("phenoagent:latest-result", JSON.stringify(next));
  }

  const nav = [
    {id: "home" as const, label: "Home", icon: HomeIcon},
    {id: "upload" as const, label: "Upload", icon: UploadCloud},
    {id: "dashboard" as const, label: "Dashboard", icon: Activity},
    {id: "chat" as const, label: "Chat", icon: MessageCircle}
  ];

  return (
    <div className="min-h-screen bg-[#f6f8f9] text-ink">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-xl font-semibold tracking-normal">PhenoAgent</h1>
            <p className="text-sm text-slate-500">Personal health intelligence MVP</p>
          </div>
          <nav className="flex gap-1 rounded-md border border-slate-200 bg-slate-50 p-1">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setPage(item.id)}
                  className={`flex items-center gap-2 rounded px-3 py-2 text-sm font-medium ${
                    page === item.id ? "bg-white text-clinical shadow-sm" : "text-slate-600 hover:text-ink"
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {page === "home" && <Home onDemo={(next) => { updateResult(next); setPage("dashboard"); }} />}
        {page === "upload" && <Upload onResult={(next) => { updateResult(next); setPage("dashboard"); }} />}
        {page === "dashboard" && <Dashboard result={result} onResult={updateResult} onAsk={() => setPage("chat")} />}
        {page === "chat" && <Chat result={result} />}
      </main>
    </div>
  );
}
