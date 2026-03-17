import { buildCompatibilityBanner, getAngularVersionProfile } from "@/domain/angular-target";
import { splitTopLevel, toCamelCase, toKebabCase, toPascalCase } from "@/domain/naming";
import { getMockValue } from "@/domain/mock-generator";
import { EngineConfig, ModelSpec } from "@/domain/types";

export function generateAngularMockService(models: ModelSpec[], config: EngineConfig): string {
  if (models.length === 0) {
    return "// No models available for mock service generation.";
  }

  const rootModel = models[0];
  const modelMap = new Map<string, ModelSpec>(models.map((model) => [model.name, model]));
  const cleanName = rootModel.name.replace(/(Dto|Model)$/i, "");
  const modelType = `${config.modelPrefix}${rootModel.name}`;
  const serviceName = `${toPascalCase(cleanName)}${config.mockServiceSuffix}`;
  const resourceLabel = toKebabCase(cleanName || rootModel.name).replace(/-/g, " ");
  const versionProfile = getAngularVersionProfile(config.angularVersion);
  const idProperty = findIdProperty(rootModel, config);
  const initialItems = createInitialItems(rootModel.name, modelMap, config, config.mockServiceSeedCount);

  return [
    buildCompatibilityBanner(config.angularVersion, "service"),
    "import { Injectable } from '@angular/core';",
    "import { BehaviorSubject, Observable, delay, of, throwError } from 'rxjs';",
    "",
    "// In-memory mock service for UI and flow testing.",
    "@Injectable({ providedIn: 'root' })",
    `export class ${serviceName} {`,
    `  private readonly latency = ${config.mockServiceLatencyMs};`,
    `  private readonly idKey: string | null = ${idProperty ? `'${idProperty}'` : "null"};`,
    `  private readonly initialItems: ${modelType}[] = ${renderTsLiteral(initialItems, 1)};`,
    `  private readonly store = new BehaviorSubject<${modelType}[]>(this.cloneItems(this.initialItems));`,
    "",
    "  readonly items$ = this.store.asObservable();",
    "",
    `  // Stable in-memory store for Angular ${versionProfile.version} without backend calls.`,
    `  list(): Observable<${modelType}[]> {`,
    "    return this.simulate(this.store.value);",
    "  }",
    "",
    `  getById(id: string): Observable<${modelType}> {`,
    "    const item = this.findById(id);",
    "    if (!item) {",
    `      return throwError(() => new Error('Mock ${resourceLabel} not found.'));`,
    "    }",
    "",
    "    return this.simulate(item);",
    "  }",
    "",
    `  create(payload: ${modelType}): Observable<${modelType}> {`,
    "    const nextItem = this.assignIdIfNeeded(payload);",
    "    this.store.next([...this.store.value, nextItem]);",
    "    return this.simulate(nextItem);",
    "  }",
    "",
    `  update(id: string, payload: ${modelType}): Observable<${modelType}> {`,
    "    const index = this.findIndexById(id);",
    "    if (index < 0) {",
    `      return throwError(() => new Error('Cannot update mock ${resourceLabel}: item not found.'));`,
    "    }",
    "",
    `    const nextItem = this.assignIdIfNeeded({ ...payload, ...(this.idKey ? { [this.idKey]: id } : {}) } as ${modelType});`,
    "    const nextItems = [...this.store.value];",
    "    nextItems[index] = nextItem;",
    "    this.store.next(nextItems);",
    "    return this.simulate(nextItem);",
    "  }",
    "",
    "  delete(id: string): Observable<void> {",
    "    const index = this.findIndexById(id);",
    "    if (index < 0) {",
    `      return throwError(() => new Error('Cannot delete mock ${resourceLabel}: item not found.'));`,
    "    }",
    "",
    "    const nextItems = this.store.value.filter((item) => this.getItemId(item) !== id);",
    "    this.store.next(nextItems);",
    "    return this.simulate<void>(undefined);",
    "  }",
    "",
    `  reset(items: ${modelType}[] = this.initialItems): void {`,
    "    this.store.next(this.cloneItems(items));",
    "  }",
    "",
    `  snapshot(): ${modelType}[] {`,
    "    return this.cloneItems(this.store.value);",
    "  }",
    "",
    `  seed(items: ${modelType}[]): void {`,
    "    this.store.next(this.cloneItems(items));",
    "  }",
    "",
    "  private simulate<T>(value: T): Observable<T> {",
    "    return of(this.cloneValue(value)).pipe(delay(this.latency));",
    "  }",
    "",
    `  private cloneItems(items: ${modelType}[]): ${modelType}[] {`,
    "    return items.map((item) => this.cloneValue(item));",
    "  }",
    "",
    "  private cloneValue<T>(value: T): T {",
    "    return value === undefined ? value : structuredClone(value);",
    "  }",
    "",
    `  private assignIdIfNeeded(payload: ${modelType}): ${modelType} {`,
    "    const nextItem = this.cloneValue(payload);",
    `    if (${config.mockServiceAutoIds ? "!this.idKey || this.getItemId(nextItem)" : "true"}) {`,
    "      return nextItem;",
    "    }",
    "",
    "    return { ...nextItem, [this.idKey]: crypto.randomUUID() } as " + modelType + ";",
    "  }",
    "",
    `  private findById(id: string): ${modelType} | undefined {`,
    "    return this.store.value.find((item) => this.getItemId(item) === id);",
    "  }",
    "",
    "  private findIndexById(id: string): number {",
    "    return this.store.value.findIndex((item) => this.getItemId(item) === id);",
    "  }",
    "",
    `  private getItemId(item: ${modelType}): string {`,
    "    if (!this.idKey) {",
    "      return '';",
    "    }",
    "",
    "    const value = item as Record<string, unknown>;",
    "    return String(value[this.idKey] ?? '');",
    "  }",
    "}"
  ].join("\n");
}

function createInitialItems(
  modelName: string,
  modelMap: Map<string, ModelSpec>,
  config: EngineConfig,
  count = 2
): unknown[] {
  return Array.from({ length: count }, () => createModelSample(modelName, modelMap, config, new Set<string>()));
}

function createModelSample(
  modelName: string,
  modelMap: Map<string, ModelSpec>,
  config: EngineConfig,
  trail: Set<string>
): Record<string, unknown> {
  const model = modelMap.get(modelName);
  if (!model || trail.has(modelName)) {
    return {};
  }

  const nextTrail = new Set(trail);
  nextTrail.add(modelName);

  const record: Record<string, unknown> = {};
  for (const property of model.properties) {
    const outputKey = config.camelCaseProperties ? toCamelCase(property.name) : property.name;
    record[outputKey] = createValueSample(outputKey, property.type, modelMap, config, nextTrail);
  }

  return record;
}

function createValueSample(
  key: string,
  type: string,
  modelMap: Map<string, ModelSpec>,
  config: EngineConfig,
  trail: Set<string>
): unknown {
  const unionParts = splitTopLevel(type, "|").map((part) => part.trim()).filter(Boolean);
  const effectiveType = unionParts.find((part) => part !== "null" && part !== "undefined") ?? unionParts[0] ?? "unknown";

  if (effectiveType.endsWith("[]")) {
    const inner = effectiveType.slice(0, -2).replace(/^\((.*)\)$/, "$1");
    return [createValueSample(key, inner, modelMap, config, trail)];
  }

  if (effectiveType.startsWith("Record<")) {
    return {};
  }

  if (modelMap.has(effectiveType)) {
    return createModelSample(effectiveType, modelMap, config, trail);
  }

  return getMockValue(key, effectiveType);
}

function findIdProperty(model: ModelSpec, config: EngineConfig): string | null {
  const property = model.properties.find((item) => /(^id$|id$|_id$)/i.test(item.name));
  if (!property) {
    return null;
  }

  return config.camelCaseProperties ? toCamelCase(property.name) : property.name;
}

function renderTsLiteral(value: unknown, indentLevel = 0): string {
  const indent = "  ".repeat(indentLevel);
  const childIndent = "  ".repeat(indentLevel + 1);

  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[\n${value.map((item) => `${childIndent}${renderTsLiteral(item, indentLevel + 1)}`).join(",\n")}\n${indent}]`;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    return `{\n${entries
      .map(([key, item]) => `${childIndent}${isValidIdentifier(key) ? key : JSON.stringify(key)}: ${renderTsLiteral(item, indentLevel + 1)}`)
      .join(",\n")}\n${indent}}`;
  }

  return "undefined";
}

function isValidIdentifier(value: string): boolean {
  return /^[A-Za-z_$][\w$]*$/.test(value);
}
