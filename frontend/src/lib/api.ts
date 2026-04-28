export type RiskPosterior = {
  low: number;
  normal: number;
  high: number;
  critical: number;
};

export type InferenceResult = {
  user_id: string;
  created_at: string;
  bbn_posteriors: Record<"metabolic" | "cardiovascular" | "sleep", RiskPosterior>;
  confidence_intervals: Record<"metabolic" | "cardiovascular" | "sleep", [number, number]>;
  openai_interpretation: {
    summary: string;
    key_findings: string[];
    recommendations: string[];
    follow_up_questions: string[];
    disclaimer: string;
  };
  status: string;
};

export type LabResult = {
  name: string;
  value: number;
  unit?: string;
  ref_low?: number;
  ref_high?: number;
  flag: "L" | "H" | "N";
};

export type WearableSummary = {
  source: string;
  daily: Array<Record<string, number | string | null>>;
  features: Record<string, Record<string, number | null>>;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const AUTH_TOKEN = import.meta.env.VITE_DEMO_AUTH_TOKEN || "demo";

async function apiFetch(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      ...(init.headers || {})
    }
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response;
}

export async function uploadFile(kind: "labs" | "wearables" | "genome", file: File) {
  const form = new FormData();
  form.append("file", file);
  const response = await apiFetch(`/upload/${kind}`, {
    method: "POST",
    body: form
  });
  return response.json();
}

export async function runInference(userId = "demo-user"): Promise<InferenceResult> {
  const response = await apiFetch("/inference/run", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({user_id: userId})
  });
  return response.json();
}

export async function latestInference(userId = "demo-user"): Promise<InferenceResult> {
  const response = await apiFetch(`/inference/results/${userId}`);
  return response.json();
}

export async function sendChat(message: string, onChunk: (chunk: string) => void, userId = "demo-user") {
  const response = await apiFetch("/chat", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({user_id: userId, message})
  });
  if (!response.body) {
    onChunk(await response.text());
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, {stream: true}));
  }
}
