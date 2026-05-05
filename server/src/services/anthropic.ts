export type ChatMessage = { role: "user" | "assistant"; content: string };

export async function streamClaude({ snapshot, message, history, onToken }: { snapshot: string; message: string; history: ChatMessage[]; onToken: (token: string) => void }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    onToken("ANTHROPIC_API_KEY is not configured. Pheno can stream once the server secret is set.");
    return;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 900,
      stream: true,
      system: `You are Pheno, an AI health advisor with access to the user's complete health data. Cite user data, do not diagnose, and recommend consulting a physician for clinical decisions.\n\n${snapshot}`,
      messages: [...history, { role: "user", content: message }],
    }),
  });

  if (!response.ok || !response.body) throw new Error(`Anthropic stream failed: ${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const eventBlock of events) {
      for (const line of eventBlock.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") continue;
        try {
          const event = JSON.parse(data);
          const text = event.delta?.text;
          if (text) onToken(text);
        } catch {
          continue;
        }
      }
    }
  }
  if (buffer.trim()) {
    for (const line of buffer.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") continue;
      try {
        const event = JSON.parse(data);
        const text = event.delta?.text;
        if (text) onToken(text);
      } catch {
        continue;
      }
    }
  }
}
