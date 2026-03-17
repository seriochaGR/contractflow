import { generateArtifacts } from "@/application/engine";
import { trackUsageMetric } from "@/application/usage-metrics";
import { convertSchema } from "@/infrastructure/schemas";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = convertSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = generateArtifacts(parsed.data);
    trackUsageMetric({ name: "generation_succeeded", sourceType: parsed.data.sourceType });
    return NextResponse.json(result);
  } catch (error) {
    trackUsageMetric({ name: "generation_failed", sourceType: parsed.data.sourceType });
    const message = error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
