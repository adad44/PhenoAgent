import {Activity, ArrowRight, BrainCircuit, FileUp, LockKeyhole, MessageCircle, ShieldCheck} from "lucide-react";
import TrendChart from "../components/TrendChart";
import type {InferenceResult} from "../lib/api";
import {demoResult, demoTrend} from "../lib/demo";

export default function Home({onDemo}: {onDemo: (result: InferenceResult) => void}) {
  return (
    <div className="space-y-10">
      <section className="grid gap-8 py-8 lg:grid-cols-[1fr_460px] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase text-clinical">AI health intelligence demo</p>
          <h2 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-ink md:text-5xl">
            PhenoAgent turns labs and wearable signals into clear follow-up questions.
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Upload lab reports and wearable exports, run a Bayesian risk model, and get an OpenAI-generated explanation that avoids raw health records and personal identifiers.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button onClick={() => onDemo(demoResult)} className="inline-flex items-center gap-2 rounded bg-clinical px-5 py-3 font-semibold text-white shadow-sm">
              Try the live demo
              <ArrowRight size={18} />
            </button>
            <a href="#demo" className="inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700">
              View demo signals
            </a>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <p className="text-sm font-semibold text-slate-500">Demo profile</p>
              <p className="text-lg font-semibold">Borderline metabolic markers</p>
            </div>
            <ShieldCheck className="text-clinical" size={28} />
          </div>
          <div className="mt-4 grid gap-3">
            <div className="rounded border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase text-slate-500">Metabolic</p>
                  <p className="mt-1 text-2xl font-semibold">Normal 39%</p>
                </div>
                <p className="text-sm text-slate-500">High/Critical 40%</p>
              </div>
              <div className="mt-3 h-2 rounded bg-slate-100">
                <div className="h-2 w-[40%] rounded bg-amberRisk" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded border border-slate-200 p-3">
                <p className="font-semibold">AI payload</p>
                <p className="mt-1 text-slate-500">Posteriors and flags only</p>
              </div>
              <div className="rounded border border-slate-200 p-3">
                <p className="font-semibold">Raw records</p>
                <p className="mt-1 text-slate-500">Never sent to AI</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="demo" className="grid gap-4 md:grid-cols-4">
        {[
          {icon: FileUp, title: "Parse", text: "Lab PDFs, wearable CSV/XML, and optional 23andMe files."},
          {icon: Activity, title: "Model", text: "Bayesian-style posteriors for metabolic, cardiovascular, and sleep domains."},
          {icon: BrainCircuit, title: "Explain", text: "OpenAI turns de-identified model output into plain English."},
          {icon: LockKeyhole, title: "Protect", text: "No names, DOB, exact dates, raw files, or raw values in AI prompts."}
        ].map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <Icon className="text-clinical" size={24} />
              <h3 className="mt-3 font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <TrendChart data={demoTrend} />
        <div className="mt-6 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <MessageCircle className="text-clinical" size={20} />
            <h3 className="text-lg font-semibold">Demo insight</h3>
          </div>
          <p className="mt-3 text-slate-700">{demoResult.openai_interpretation.summary}</p>
          <button onClick={() => onDemo(demoResult)} className="mt-5 inline-flex items-center gap-2 rounded bg-ink px-4 py-2 font-medium text-white">
            Open dashboard demo
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
