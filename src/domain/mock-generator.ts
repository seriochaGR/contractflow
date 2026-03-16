import { ModelSpec } from "@/domain/types";
import { splitTopLevel } from "@/domain/naming";

type MockStrategy = () => unknown;

const randomInt = (max: number): number => Math.floor(Math.random() * max);

const pickOne = <T>(items: T[]): T => items[randomInt(items.length)];

const mockStrategies: Record<string, MockStrategy> = {
  email: () => `user_${randomInt(1000)}@consultora.com`,
  id: () => crypto.randomUUID(),
  name: () => pickOne(["Ana Garcia", "Carlos Perez", "Lucia Martin", "Marc Font"]),
  date: () => new Date(Date.now() - randomInt(10_000_000_000)).toISOString(),
  phone: () => `+34 ${600000000 + randomInt(99_999_999)}`,
  role: () => pickOne(["admin", "manager", "reviewer", "user"]),
  status: () => pickOne(["active", "pending", "archived"])
};

const contextualStrategies: Array<{ matches: (key: string) => boolean; generate: MockStrategy }> = [
  { matches: (key) => key.includes("email"), generate: mockStrategies.email },
  { matches: (key) => key === "id" || key.endsWith("id") || key.includes("_id"), generate: mockStrategies.id },
  {
    matches: (key) => key.includes("fullname") || key.includes("full_name") || key === "name" || key.endsWith("name"),
    generate: mockStrategies.name
  },
  {
    matches: (key) => key.includes("date") || key.endsWith("at") || key.includes("_at") || key.includes("timestamp"),
    generate: mockStrategies.date
  },
  { matches: (key) => key.includes("phone") || key.includes("mobile"), generate: mockStrategies.phone },
  { matches: (key) => key.includes("role"), generate: mockStrategies.role },
  { matches: (key) => key.includes("status") || key.includes("state"), generate: mockStrategies.status }
];

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
    record[property.name] = sampleForType(property.name, property.type, map, nextTrail);
  }
  return record;
}

export function getMockValue(key: string, type: string): unknown {
  const normalizedKey = normalizeKey(key);
  const contextMatch = contextualStrategies.find((strategy) => strategy.matches(normalizedKey));

  if (contextMatch) {
    return contextMatch.generate();
  }

  const literalOptions = extractStringLiteralOptions(type);
  if (literalOptions.length > 0) {
    return pickOne(literalOptions);
  }

  switch (normalizeType(type)) {
    case "number":
      return randomInt(100);
    case "boolean":
      return Math.random() > 0.5;
    case "Date":
      return mockStrategies.date();
    case "string":
      return "Lorem Ipsum";
    default:
      return null;
  }
}

function sampleForType(key: string, type: string, map: Map<string, ModelSpec>, trail: Set<string>): unknown {
  const unionParts = splitTopLevel(type, "|").map((part) => part.trim()).filter(Boolean);
  const withoutNull = unionParts.filter((part) => part !== "null");
  const effectiveType = withoutNull[0] ?? unionParts[0] ?? "unknown";

  if (effectiveType.endsWith("[]")) {
    const inner = effectiveType.slice(0, -2).replace(/^\((.*)\)$/, "$1");
    return [sampleForType(key, inner, map, trail)];
  }
  if (effectiveType.startsWith("Record<")) return {};
  if (map.has(effectiveType)) return sampleForModel(effectiveType, map, trail);

  return getMockValue(key, effectiveType);
}

function normalizeKey(key: string): string {
  return key.replace(/[\s-]/g, "_").replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}

function normalizeType(type: string): string {
  return splitTopLevel(type, "|")
    .map((part) => part.trim())
    .filter((part) => part && part !== "null" && part !== "undefined")[0] ?? type;
}

function extractStringLiteralOptions(type: string): string[] {
  return splitTopLevel(type, "|")
    .map((part) => part.trim())
    .filter((part) => /^(['"]).*\1$/.test(part))
    .map((part) => part.slice(1, -1));
}



