import { generateMocks } from "@/application/engine";
import { serviceSchema } from "@/infrastructure/schemas";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = serviceSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  return NextResponse.json({ mocks: generateMocks(parsed.data.models) });
}
