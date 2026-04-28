import type {InferenceResult} from "./api";

export const demoResult: InferenceResult = {
  user_id: "demo-user",
  created_at: new Date("2026-04-28T12:00:00.000Z").toISOString(),
  bbn_posteriors: {
    metabolic: {
      low: 0.21,
      normal: 0.39,
      high: 0.37,
      critical: 0.03
    },
    cardiovascular: {
      low: 0.28,
      normal: 0.42,
      high: 0.27,
      critical: 0.03
    },
    sleep: {
      low: 0.38,
      normal: 0.38,
      high: 0.19,
      critical: 0.05
    }
  },
  confidence_intervals: {
    metabolic: [0.35, 0.45],
    cardiovascular: [0.22, 0.38],
    sleep: [0.04, 0.44]
  },
  openai_interpretation: {
    summary:
      "The demo profile shows a metabolic pattern worth watching, with glucose, A1c, triglycerides, LDL, and HDL contributing most of the signal. This is not a diagnosis; it is a model-based way to organize follow-up questions.",
    key_findings: [
      "Metabolic risk is the most active domain in this demo because several related biomarkers are outside the reference band.",
      "Cardiovascular risk is mixed: LDL and HDL add signal, while CRP remains within the demo reference range.",
      "Sleep risk is lower-confidence because wearable data is simulated and would need more days of HRV and resting heart rate history."
    ],
    recommendations: [
      "Bring the flagged metabolic markers to a healthcare provider and ask whether repeat labs or additional testing are appropriate.",
      "Track sleep timing, resting heart rate, HRV, and step consistency for at least 30 days before treating trends as meaningful.",
      "Use the model output to prepare better clinical questions, not to self-diagnose or change medication."
    ],
    follow_up_questions: [
      "Which biomarkers drive the metabolic score?",
      "What should I ask my clinician first?",
      "What data would improve confidence?"
    ],
    disclaimer: "For informational purposes only. Consult a healthcare provider for medical decisions."
  },
  status: "complete"
};

export const demoTrend = Array.from({length: 90}).map((_, index) => {
  const day = index + 1;
  return {
    date: `D-${90 - day}`,
    hrv_ms: Math.round(43 + Math.sin(index / 5) * 5 + index * 0.025),
    resting_hr: Math.round(69 - Math.cos(index / 7) * 3 - index * 0.015)
  };
});

export function demoChatReply(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("biomarker") || lower.includes("metabolic")) {
    return "In the demo, glucose, A1c, triglycerides, LDL, and HDL are the main metabolic drivers. The useful next step is to ask a clinician whether repeat labs, fasting status, family history, or medication context changes the interpretation. " + demoResult.openai_interpretation.disclaimer;
  }
  if (lower.includes("clinician") || lower.includes("ask")) {
    return "A practical clinician question would be: do these metabolic markers suggest repeat testing, lifestyle intervention, or a more complete cardiovascular risk review? Bring the trend view and avoid treating this as a diagnosis. " + demoResult.openai_interpretation.disclaimer;
  }
  if (lower.includes("confidence") || lower.includes("data")) {
    return "Confidence improves with repeat labs, 30 to 90 days of wearable data, medication context, and clinician-verified history. The demo intentionally avoids names, DOB, exact dates, and raw records. " + demoResult.openai_interpretation.disclaimer;
  }
  return "This demo can explain model drivers, wearable trend context, and follow-up questions. It uses synthetic data and keeps the AI payload de-identified. " + demoResult.openai_interpretation.disclaimer;
}
