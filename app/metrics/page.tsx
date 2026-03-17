import { Activity } from "lucide-react";
import { UsageMetricsPanel } from "@/ui/components/usage-metrics-panel";

export default function MetricsPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1200px] flex-col px-4 py-6 md:px-6">
      <section className="animate-rise rounded-2xl border border-cyan-400/25 bg-panel/90 p-5 shadow-glow backdrop-blur-xl">
        <div className="mb-5 flex items-start gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
            <Activity className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-cyan-200">Usage Metrics</h1>
            <p className="mt-1 text-sm text-slate-400">
              Dedicated metrics view for operational visibility. Access restrictions can be added here later.
            </p>
          </div>
        </div>

        <UsageMetricsPanel refreshToken={0} />
      </section>
    </main>
  );
}
