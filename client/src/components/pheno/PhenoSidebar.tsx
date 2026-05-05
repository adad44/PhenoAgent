import { Send, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { usePhenoChat } from "../../hooks/usePhenoChat";
import { usePhenoStore } from "../../hooks/usePhenoStore";
import { Button } from "../ui/Button";

export function PhenoSidebar() {
  const { open, setOpen } = usePhenoStore();
  const { messages, sendMessage, isStreaming, error } = usePhenoChat([
    { role: "assistant", content: "HRV is rebounding while sleep debt is still present. Keep intensity moderate until tonight's sleep score confirms recovery." },
  ]);
  const [draft, setDraft] = useState("");

  if (!open) return null;

  async function send() {
    if (!draft.trim()) return;
    await sendMessage(draft);
    setDraft("");
  }

  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md animate-slide-in-right flex-col border-l border-line bg-surface/95 backdrop-blur md:w-96">
      <div className="flex items-center justify-between border-b border-line p-4">
        <div className="flex items-center gap-2 font-mono text-primary"><Sparkles className="h-4 w-4 text-ai" /> Pheno</div>
        <Button variant="ghost" className="h-8 w-8 px-0" onClick={() => setOpen(false)} aria-label="Close Pheno"><X className="h-4 w-4" /></Button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div key={index} className={message.role === "assistant" ? "rounded-lg border border-line bg-elevated p-3 text-sm text-primary" : "ml-8 rounded-lg bg-ai/20 p-3 text-sm text-primary"}>
            {message.content || "Thinking..."}
          </div>
        ))}
        {error ? <p className="text-xs text-alert">{error}</p> : null}
      </div>
      <div className="border-t border-line p-4">
        <div className="flex gap-2">
          <input className="min-w-0 flex-1 rounded-md border border-line bg-base px-3 text-sm text-primary outline-none focus:border-ai" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && send()} placeholder="Ask Pheno" />
          <Button onClick={send} disabled={isStreaming} className="h-10 w-10 px-0" aria-label="Send"><Send className="h-4 w-4" /></Button>
        </div>
      </div>
    </aside>
  );
}
