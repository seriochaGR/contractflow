import { convertInput } from "@/application/engine";
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
    const result = convertInput(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Conversion failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
