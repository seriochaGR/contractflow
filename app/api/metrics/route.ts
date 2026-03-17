import { getUsageMetricsSnapshot, trackUsageMetric } from "@/application/usage-metrics";
import { usageMetricEventSchema } from "@/infrastructure/schemas";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(getUsageMetricsSnapshot());
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = usageMetricEventSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  trackUsageMetric(parsed.data);
  return NextResponse.json({ ok: true });
}
