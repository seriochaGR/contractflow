import { SourceType } from "@/domain/types";

export type UsageMetricEventName =
  | "generation_succeeded"
  | "generation_failed"
  | "output_selected"
  | "settings_opened"
  | "output_copied"
  | "input_uploaded";

export type UsageMetricOutputKey = "typescript" | "service" | "serviceDependencies" | "serviceMock" | "components" | "mocks";

export interface UsageMetricEvent {
  name: UsageMetricEventName;
  at: string;
  sourceType?: SourceType;
  output?: UsageMetricOutputKey;
}

export interface UsageMetricsSnapshot {
  sessionStartedAt: string;
  lastEventAt: string | null;
  totals: {
    generationSucceeded: number;
    generationFailed: number;
    outputSelected: number;
    settingsOpened: number;
    outputCopied: number;
    inputUploaded: number;
  };
  sourceTypes: Record<SourceType, number>;
  outputs: Record<UsageMetricOutputKey, number>;
  recentEvents: UsageMetricEvent[];
}
