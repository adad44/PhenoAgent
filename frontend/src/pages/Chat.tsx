import {Send} from "lucide-react";
import {useState} from "react";
import type {InferenceResult} from "../lib/api";
import {sendChat} from "../lib/api";
import {demoChatReply} from "../lib/demo";

type Message = {role: "user" | "assistant"; content: string};

export default function Chat({result}: {result: InferenceResult | null}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const suggestions = result?.openai_interpretation.follow_up_questions || [
    "Which risk area should I focus on first?",
    "What should I ask my clinician?",
    "What data should I upload next?"
  ];

  async function submit(text = input) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setInput("");
    setMessages((old) => [...old, {role: "user", content: trimmed}, {role: "assistant", content: ""}]);
    setBusy(true);
    try {
      await sendChat(trimmed, (chunk) => {
        setMessages((old) => {
          const next = [...old];
          next[next.length - 1] = {role: "assistant", content: next[next.length - 1].content + chunk};
          return next;
        });
      });
    } catch {
      const fallback = demoChatReply(trimmed);
      setMessages((old) => {
        const next = [...old];
        next[next.length - 1] = {role: "assistant", content: fallback};
        return next;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_280px]">
      <section className="min-h-[560px] rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-xl font-semibold">Chat</h2>
        </div>
        <div className="h-[420px] space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && <p className="text-sm text-slate-500">Ask about your model output, risk drivers, or follow-up questions.</p>}
          {messages.map((message, index) => (
            <div key={index} className={`max-w-[84%] rounded-md p-3 text-sm ${message.role === "user" ? "ml-auto bg-clinical text-white" : "bg-slate-100 text-slate-800"}`}>
              {message.content || "Thinking..."}
            </div>
          ))}
        </div>
        <form
          className="flex gap-2 border-t border-slate-200 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="min-w-0 flex-1 rounded border border-slate-300 px-3 py-2"
            placeholder="Ask about your analysis"
          />
          <button disabled={busy} className="inline-flex items-center gap-2 rounded bg-clinical px-4 py-2 font-medium text-white disabled:opacity-60">
            <Send size={16} />
            Send
          </button>
        </form>
      </section>

      <aside className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="font-semibold">Suggestions</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button key={suggestion} onClick={() => submit(suggestion)} className="rounded border border-slate-200 px-3 py-2 text-left text-sm hover:border-clinical">
              {suggestion}
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
