import { ModelSpec } from "@/domain/types";
import { splitTopLevel } from "@/domain/naming";

export function generateJsonMocks(models: ModelSpec[]): string {
  const map = new Map<string, ModelSpec>(models.map((model) => [model.name, model]));
  const output: Record<string, unknown[]> = {};

  for (const model of models) {
    output[model.name] = [sampleForModel(model.name, map, new Set<string>())];
  }

  return JSON.stringify(output, null, 2);
}

function sampleForModel(name: string, map: Map<string, ModelSpec>, trail: Set<string>): Record<string, unknown> {
  const model = map.get(name);
  if (!model || trail.has(name)) {
    return {};
  }

  const nextTrail = new Set(trail);
  nextTrail.add(name);

  const record: Record<string, unknown> = {};
  for (const property of model.properties) {
    record[property.name] = sampleForType(property.type, map, nextTrail);
  }
  return record;
}

function sampleForType(type: string, map: Map<string, ModelSpec>, trail: Set<string>): unknown {
  const unionParts = splitTopLevel(type, "|").map((part) => part.trim()).filter(Boolean);
  const withoutNull = unionParts.filter((part) => part !== "null");
  const effectiveType = withoutNull[0] ?? unionParts[0] ?? "unknown";

  if (effectiveType.endsWith("[]")) {
    const inner = effectiveType.slice(0, -2).replace(/^\((.*)\)$/, "$1");
    return [sampleForType(inner, map, trail)];
  }
  if (effectiveType === "string") return "example";
  if (effectiveType === "number") return 0;
  if (effectiveType === "boolean") return true;
  if (effectiveType === "Date") return "2026-01-01T00:00:00.000Z";
  if (effectiveType.startsWith("Record<")) return {};
  if (map.has(effectiveType)) return sampleForModel(effectiveType, map, trail);

  return null;
}
