import { Activity, ArrowRight, BarChart3, Bot, Database, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { LineMetric } from "../components/charts/LineMetric";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useHealthData } from "../hooks/useHealthData";
import { formatSleep, percent } from "../lib/utils";

export function Landing() {
  const { sleep, todayNutrition, nutritionTargets, biomarkers, training } = useHealthData();
  const latestSleep = sleep.at(-1);
  const optimal = biomarkers.filter((marker) => (marker.optimalLow === undefined || marker.value >= marker.optimalLow) && (marker.optimalHigh === undefined || marker.value <= marker.optimalHigh)).length;

  return (
    <main className="min-h-screen bg-base text-primary">
      <section className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)]">
        <div className="flex flex-col justify-between px-5 py-6 md:px-10">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-lg"><Activity className="h-5 w-5 text-good" /> PhenoAgent</div>
            <Link to="/demo" className="text-sm text-secondary hover:text-primary">Demo</Link>
          </nav>
          <div className="max-w-2xl py-16">
            <p className="font-mono text-sm text-good">Unified Health Intelligence Platform</p>
            <h1 className="mt-5 font-mono text-4xl leading-tight text-primary md:text-6xl">PhenoAgent</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-secondary">
              Connect sleep, nutrition, training, supplements, journal notes, and bloodwork into one clinical-grade dashboard with an AI health assistant that reads the full picture.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button className="h-11" onClick={() => { window.location.href = "/demo"; }}>
                Open Demo <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="h-11" onClick={() => { window.location.href = "/pheno"; }}>
                Ask Pheno <Bot className="h-4 w-4 text-ai" />
              </Button>
            </div>
          </div>
          <div className="grid gap-3 text-sm text-secondary md:grid-cols-3">
            <div className="flex items-center gap-2"><Database className="h-4 w-4 text-info" /> Convex data layer</div>
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-good" /> Secret-safe backend</div>
            <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-caution" /> Live biometric trends</div>
          </div>
        </div>
        <div className="border-t border-line bg-surface p-5 lg:border-l lg:border-t-0 lg:p-8">
          <div className="grid h-full content-center gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <p className="text-sm text-secondary">Sleep</p>
                <p className="number mt-3 text-3xl">{latestSleep ? formatSleep(latestSleep.totalSleepMin) : "No data"}</p>
                <p className="mt-3 text-sm text-secondary">{latestSleep ? `${latestSleep.hrvMs} ms HRV` : "Ready for sync"}</p>
              </Card>
              <Card>
                <p className="text-sm text-secondary">Nutrition</p>
                <p className="number mt-3 text-3xl">{percent(todayNutrition.calories, nutritionTargets.calories)}%</p>
                <p className="mt-3 text-sm text-secondary">{todayNutrition.proteinG}g protein</p>
              </Card>
              <Card>
                <p className="text-sm text-secondary">Training</p>
                <p className="number mt-3 text-3xl">{training.length}</p>
                <p className="mt-3 text-sm text-secondary">sessions this week</p>
              </Card>
              <Card>
                <p className="text-sm text-secondary">Bloodwork</p>
                <p className="number mt-3 text-3xl">{optimal}/{biomarkers.length}</p>
                <p className="mt-3 text-sm text-secondary">optimal markers</p>
              </Card>
            </div>
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <p className="font-mono">Demo HRV Trend</p>
                <span className="number text-sm text-secondary">14 days</span>
              </div>
              <LineMetric data={sleep} dataKey="hrvMs" />
            </Card>
            <div className="rounded-lg border border-ai/40 bg-ai/10 p-4 text-sm text-secondary">
              <span className="font-mono text-ai">Pheno:</span> HRV is rebounding, but sleep debt is still visible. Keep intensity moderate until tonight's sleep score confirms recovery.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
