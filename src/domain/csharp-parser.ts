import { ModelSpec } from "@/domain/types";
import { EngineConfig } from "@/domain/types";
import { splitTopLevel, toPascalCase } from "@/domain/naming";

const PRIMITIVE_MAP: Record<string, "string" | "number" | "boolean" | "unknown"> = {
  string: "string",
  char: "string",
  guid: "string",
  int: "number",
  long: "number",
  short: "number",
  byte: "number",
  uint: "number",
  ulong: "number",
  ushort: "number",
  float: "number",
  double: "number",
  decimal: "number",
  bool: "boolean",
  boolean: "boolean",
  object: "unknown"
};

interface ResolvedType {
  type: string;
  nullable: boolean;
}

export function parseCSharpModels(input: string, config: EngineConfig): ModelSpec[] {
  const models: ModelSpec[] = [];
  const propertyRegex =
    /^\s*public\s+(?:virtual\s+|required\s+|override\s+|sealed\s+|new\s+|static\s+|readonly\s+)*(?<type>[A-Za-z0-9_<>\[\],?.\s]+?)\s+(?<name>[A-Za-z_]\w*)\s*{\s*get;\s*(?:set;|init;|private\s+set;)\s*}/gm;

  for (const extracted of extractClassBodies(input)) {
    const { name, body } = extracted;
    const properties = Array.from(body.matchAll(propertyRegex)).map((propMatch) => {
      const type = propMatch.groups?.type?.trim() ?? "object";
      const propName = propMatch.groups?.name ?? "property";
      const resolved = mapCSharpType(type, config);
      return {
        name: propName,
        type: resolved.nullable && config.nullableAsUnion ? `${resolved.type} | null` : resolved.type,
        nullable: resolved.nullable,
        optional: false
      };
    });

    if (properties.length > 0) {
      models.push({ name: toPascalCase(name), properties });
    }
  }

  return models;
}

function extractClassBodies(input: string): Array<{ name: string; body: string }> {
  const result: Array<{ name: string; body: string }> = [];
  const classKeyword = /\b(?:public|internal)?\s*(?:partial\s+)?class\s+([A-Za-z_]\w*)\s*{/g;

  let match: RegExpExecArray | null;
  while ((match = classKeyword.exec(input)) !== null) {
    const name = match[1];
    const bodyStart = (match.index ?? 0) + match[0].length;
    let index = bodyStart;
    let depth = 1;

    while (index < input.length && depth > 0) {
      const char = input[index];
      if (char === "{") depth++;
      if (char === "}") depth--;
      index++;
    }

    if (depth === 0) {
      result.push({
        name,
        body: input.slice(bodyStart, index - 1)
      });
      classKeyword.lastIndex = index;
    }
  }

  return result;
}

function mapCSharpType(rawType: string, config: EngineConfig): ResolvedType {
  let type = rawType.replace(/\s+/g, "");
  let nullable = false;

  if (type.endsWith("?")) {
    nullable = true;
    type = type.slice(0, -1);
  }

  const nullableMatch = /^Nullable<(.+)>$/i.exec(type);
  if (nullableMatch) {
    nullable = true;
    type = nullableMatch[1];
  }

  if (type.endsWith("[]")) {
    const inner = mapCSharpType(type.slice(0, -2), config);
    return { type: `${inner.type}[]`, nullable };
  }

  const listMatch = /^(?:I?List|IEnumerable|ICollection|IReadOnlyList|Collection|HashSet)<(.+)>$/i.exec(type);
  if (listMatch) {
    const inner = mapCSharpType(listMatch[1], config);
    return { type: `${inner.type}[]`, nullable };
  }

  const dictionaryMatch = /^Dictionary<(.+),(.+)>$/i.exec(type);
  if (dictionaryMatch) {
    const key = mapCSharpType(dictionaryMatch[1], config).type;
    const value = mapCSharpType(dictionaryMatch[2], config).type;
    return { type: `Record<${key}, ${value}>`, nullable };
  }

  const genericMatch = /^([A-Za-z_]\w*)<(.+)>$/.exec(type);
  if (genericMatch) {
    const genericName = safeSimpleType(genericMatch[1], config);
    const args = splitTopLevel(genericMatch[2], ",").map((arg) => mapCSharpType(arg, config).type);
    return { type: `${genericName}<${args.join(", ")}>`, nullable };
  }

  return { type: safeSimpleType(type, config), nullable };
}

function safeSimpleType(type: string, config: EngineConfig): string {
  const simple = type.includes(".") ? type.split(".").at(-1) ?? type : type;
  const lower = simple.toLowerCase();
  if (lower === "datetime" || lower === "datetimeoffset" || lower === "dateonly") {
    return config.dateMapping;
  }
  return PRIMITIVE_MAP[lower] ?? toPascalCase(simple);
}
