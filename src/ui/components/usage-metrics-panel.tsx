"use client";

import { ReactNode, useEffect, useState } from "react";
import { Activity, Copy, MousePointerClick, RefreshCw, Settings2, Upload } from "lucide-react";
import type { UsageMetricsSnapshot } from "@/domain/usage-metrics";

interface UsageMetricsPanelProps {
  refreshToken: number;
}

export function UsageMetricsPanel({ refreshToken }: UsageMetricsPanelProps) {
  const [metrics, setMetrics] = useState<UsageMetricsSnapshot | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadMetrics() {
      setIsRefreshing(true);
      const response = await fetch("/api/metrics", { cache: "no-store" });
      if (!response.ok) {
        if (!cancelled) setIsRefreshing(false);
        return;
      }
      const payload = (await response.json()) as UsageMetricsSnapshot;
      if (!cancelled) {
        setMetrics(payload);
        setIsRefreshing(false);
      }
    }

    void loadMetrics();
    return () => {
      cancelled = true;
    };
  }, [refreshToken, reloadKey]);

  if (!metrics) {
    return null;
  }

  const generationTotal = metrics.totals.generationSucceeded + metrics.totals.generationFailed;

  return (
    <div className="w-full rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-[0_20px_50px_rgba(15,23,42,0.38)] backdrop-blur-xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-cyan-200">
            <Activity className="h-4 w-4" /> Session Metrics
          </h2>
          <p className="text-sm text-slate-400">Basic in-memory usage counters for this running session.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {metrics.lastEventAt ? `Last event ${new Date(metrics.lastEventAt).toLocaleTimeString()}` : "No events yet"}
          </span>
          <button
            type="button"
            onClick={() => setReloadKey((prev) => prev + 1)}
            className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-600 hover:text-slate-100"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Generations" value={generationTotal} icon={<Activity className="h-4 w-4" />} />
        <MetricCard label="Copies" value={metrics.totals.outputCopied} icon={<Copy className="h-4 w-4" />} />
        <MetricCard label="Uploads" value={metrics.totals.inputUploaded} icon={<Upload className="h-4 w-4" />} />
        <MetricCard label="Output Selects" value={metrics.totals.outputSelected} icon={<MousePointerClick className="h-4 w-4" />} />
        <MetricCard label="Settings Opens" value={metrics.totals.settingsOpened} icon={<Settings2 className="h-4 w-4" />} />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <MiniSummary
          title="Source Types"
          items={[
            { label: "C#", value: metrics.sourceTypes.csharp },
            { label: "JSON", value: metrics.sourceTypes.json }
          ]}
        />
        <MiniSummary
          title="Output Interest"
          items={[
            { label: "Contracts", value: metrics.outputs.typescript },
            { label: "Service", value: metrics.outputs.service },
            { label: "Dependencies", value: metrics.outputs.serviceDependencies },
            { label: "Mock Service", value: metrics.outputs.serviceMock },
            { label: "JSON Mocks", value: metrics.outputs.mocks }
          ]}
        />
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-panel/70 px-3 py-2">
      <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-500">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-semibold text-slate-100">{value}</div>
    </div>
  );
}

function MiniSummary({
  title,
  items
}: {
  title: string;
  items: Array<{ label: string; value: number }>;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-panel/70 p-3">
      <h3 className="mb-2 text-xs uppercase tracking-[0.14em] text-slate-500">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item.label}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs text-slate-300"
          >
            <span>{item.label}</span>
            <span className="font-semibold text-cyan-200">{item.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
