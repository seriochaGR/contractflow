import { UsageMetricEvent, UsageMetricEventName, UsageMetricsSnapshot } from "@/domain/usage-metrics";
import { usageMetricsRepository } from "@/infrastructure/usage-metrics-repository";

export function trackUsageMetric(event: Omit<UsageMetricEvent, "at"> & { name: UsageMetricEventName }) {
  usageMetricsRepository.track(event);
}

export function getUsageMetricsSnapshot(): UsageMetricsSnapshot {
  return usageMetricsRepository.getSnapshot();
}
