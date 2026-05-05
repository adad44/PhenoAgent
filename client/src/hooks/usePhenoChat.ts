import { useAuthToken } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { useEffect, useState } from "react";
import { isConvexConfigured } from "../lib/convex";

export type PhenoMessage = {
  role: "user" | "assistant";
  content: string;
};

const demoReply = "In demo mode, the strongest signal is sleep consistency versus training load. With live Convex auth and an Anthropic key configured, Pheno streams against your current health snapshot.";
const getChatHistory = makeFunctionReference<"query", Record<string, never>, PhenoMessage[]>("pheno:getChatHistory");

export function usePhenoChat(initialMessages: PhenoMessage[]) {
  const token = isConvexConfigured ? useAuthToken() : null;
  const liveHistory = isConvexConfigured ? useQuery(getChatHistory, token ? {} : "skip") : undefined;
  const [messages, setMessages] = useState<PhenoMessage[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;

  useEffect(() => {
    if (!isStreaming && liveHistory?.length) setMessages(liveHistory);
  }, [isStreaming, liveHistory]);

  async function sendMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed || isStreaming) return;
    setError("");
    const history = messages;
    setMessages((items) => [...items, { role: "user", content: trimmed }, { role: "assistant", content: "" }]);

    if (!isConvexConfigured || !token || !apiBase) {
      setMessages((items) => replaceLastAssistant(items, demoReply));
      return;
    }

    setIsStreaming(true);
    try {
      const response = await fetch(`${apiBase}/api/pheno/chat`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: trimmed, history }),
      });
      if (!response.ok || !response.body) throw new Error(`Pheno stream failed: ${response.status}`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) handleSsePart(part);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Pheno stream failed";
      setError(message);
      setMessages((items) => replaceLastAssistant(items, message));
    } finally {
      setIsStreaming(false);
    }
  }

  function handleSsePart(part: string) {
    const event = part.split("\n").find((line) => line.startsWith("event: "))?.slice("event: ".length);
    const dataLine = part.split("\n").find((line) => line.startsWith("data: "));
    if (!dataLine || event === "done") return;
    const data = JSON.parse(dataLine.slice("data: ".length)) as { token?: string; error?: string };
    if (event === "error") {
      setError(data.error ?? "Pheno stream failed");
      return;
    }
    const tokenPart = data.token;
    if (tokenPart) {
      setMessages((items) => appendLastAssistant(items, tokenPart));
    }
  }

  return { messages, sendMessage, isStreaming, error };
}

function appendLastAssistant(messages: PhenoMessage[], token: string) {
  return messages.map((message, index) => index === messages.length - 1 && message.role === "assistant" ? { ...message, content: message.content + token } : message);
}

function replaceLastAssistant(messages: PhenoMessage[], content: string) {
  return messages.map((message, index) => index === messages.length - 1 && message.role === "assistant" ? { ...message, content } : message);
}
