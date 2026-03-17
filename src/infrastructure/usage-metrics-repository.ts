import { UsageMetricEvent, UsageMetricEventName, UsageMetricsSnapshot } from "@/domain/usage-metrics";

const MAX_RECENT_EVENTS = 8;

function createInitialSnapshot(): UsageMetricsSnapshot {
  return {
    sessionStartedAt: new Date().toISOString(),
    lastEventAt: null,
    totals: {
      generationSucceeded: 0,
      generationFailed: 0,
      outputSelected: 0,
      settingsOpened: 0,
      outputCopied: 0,
      inputUploaded: 0
    },
    sourceTypes: {
      csharp: 0,
      json: 0
    },
    outputs: {
      typescript: 0,
      service: 0,
      serviceDependencies: 0,
      serviceMock: 0,
      mocks: 0
    },
    recentEvents: []
  };
}

class InMemoryUsageMetricsRepository {
  private snapshot = createInitialSnapshot();

  track(event: Omit<UsageMetricEvent, "at"> & { at?: string }) {
    const timestamp = event.at ?? new Date().toISOString();
    const nextEvent: UsageMetricEvent = { ...event, at: timestamp };

    this.snapshot.lastEventAt = timestamp;

    switch (event.name) {
      case "generation_succeeded":
        this.snapshot.totals.generationSucceeded += 1;
        break;
      case "generation_failed":
        this.snapshot.totals.generationFailed += 1;
        break;
      case "output_selected":
        this.snapshot.totals.outputSelected += 1;
        break;
      case "settings_opened":
        this.snapshot.totals.settingsOpened += 1;
        break;
      case "output_copied":
        this.snapshot.totals.outputCopied += 1;
        break;
      case "input_uploaded":
        this.snapshot.totals.inputUploaded += 1;
        break;
      default:
        assertNever(event.name);
    }

    if (event.sourceType) {
      this.snapshot.sourceTypes[event.sourceType] += 1;
    }

    if (event.output) {
      this.snapshot.outputs[event.output] += 1;
    }

    this.snapshot.recentEvents = [nextEvent, ...this.snapshot.recentEvents].slice(0, MAX_RECENT_EVENTS);
  }

  getSnapshot(): UsageMetricsSnapshot {
    return structuredClone(this.snapshot);
  }
}

function assertNever(_: never) {
  return _;
}

export const usageMetricsRepository = new InMemoryUsageMetricsRepository();
export type { UsageMetricEventName };
