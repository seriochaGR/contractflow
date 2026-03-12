import { ModelSpec } from "@/domain/types";
import { EngineConfig } from "@/domain/types";
import { splitTopLevel, toPascalCase } from "@/domain/naming";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(?:T[\d:.+-Z]+)?$/;

export function parseJsonModels(input: string, rootModelName: string, config: EngineConfig): ModelSpec[] {
  const parsed = JSON.parse(input) as unknown;
  const modelMap = new Map<string, ModelSpec>();

  const rootType = inferType(parsed, toPascalCase(rootModelName), modelMap, config);
  if (rootType !== toPascalCase(rootModelName)) {
    modelMap.set(toPascalCase(rootModelName), {
      name: toPascalCase(rootModelName),
      properties: [{ name: "value", type: rootType, nullable: false, optional: false }]
    });
  }

  return Array.from(modelMap.values());
}

function inferType(value: unknown, modelName: string, modelMap: Map<string, ModelSpec>, config: EngineConfig): string {
  if (value === null) {
    return "unknown | null";
  }

  if (typeof value === "string") {
    if (ISO_DATE_REGEX.test(value)) {
      return config.dateMapping;
    }
    return "string";
  }
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";

  if (Array.isArray(value)) {
    if (value.length === 0) return "unknown[]";
    const elementTypes = Array.from(
      new Set(
        value.map((item) =>
          inferType(item, `${modelName}Item`, modelMap, config)
            .split("|")
            .map((part) => part.trim())
            .join(" | ")
        )
      )
    );
    const unionType = elementTypes.join(" | ");
    return elementTypes.length > 1 ? `(${unionType})[]` : `${unionType}[]`;
  }

  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    const props = Object.entries(objectValue).map(([key, propValue]) => {
      const propType = inferType(propValue, `${modelName}${toPascalCase(key)}`, modelMap, config);
      const normalized = normalizeNullableUnion(propType);
      return {
        name: key,
        type: normalized.type,
        nullable: normalized.nullable,
        optional: false
      };
    });
    modelMap.set(modelName, { name: modelName, properties: props });
    return modelName;
  }

  return "unknown";
}

function normalizeNullableUnion(type: string): { type: string; nullable: boolean } {
  const parts = splitTopLevel(type, "|").map((part) => part.trim());
  if (!parts.includes("null")) {
    return { type, nullable: false };
  }
  const withoutNull = parts.filter((part) => part !== "null");
  if (withoutNull.length === 0) {
    return { type: "unknown | null", nullable: true };
  }
  return {
    type: `${withoutNull.join(" | ")} | null`,
    nullable: true
  };
}
