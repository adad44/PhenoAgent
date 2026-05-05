import { Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/Button";
import { Card, SectionTitle } from "../components/ui/Card";
import { usePhenoChat } from "../hooks/usePhenoChat";

export function Pheno() {
  const [draft, setDraft] = useState("");
  const { messages, sendMessage, isStreaming, error } = usePhenoChat([
    { role: "assistant", content: "Your sleep score is holding above baseline, HRV is climbing, and yesterday's lower session was heavy enough to justify controlled volume today. Keep protein on pace and avoid stacking another maximal session until the next sleep reading." },
  ]);

  async function send() {
    if (!draft.trim()) return;
    await sendMessage(draft);
    setDraft("");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><Sparkles className="h-6 w-6 text-ai" /><h1 className="font-mono text-2xl">Pheno AI</h1></div>
      <Card className="min-h-[560px]">
        <SectionTitle label="Health Assistant" />
        <div className="mb-4 space-y-3">
          {messages.map((message, index) => (
            <div key={index} className={message.role === "assistant" ? "max-w-3xl rounded-lg border border-line bg-elevated p-4 text-sm" : "ml-auto max-w-3xl rounded-lg bg-ai/20 p-4 text-sm"}>
              {message.content || "Thinking..."}
            </div>
          ))}
          {error ? <p className="text-sm text-alert">{error}</p> : null}
        </div>
        <div className="mt-auto flex gap-2">
          <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && send()} className="min-w-0 flex-1 rounded-md border border-line bg-base px-3 text-sm outline-none focus:border-ai" placeholder="Ask about recovery, nutrition, training, bloodwork" />
          <Button onClick={send} disabled={isStreaming}><Send className="h-4 w-4" /></Button>
        </div>
      </Card>
    </div>
  );
}
