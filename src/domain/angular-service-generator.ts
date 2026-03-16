import { buildCompatibilityBanner, getAngularVersionProfile } from "@/domain/angular-target";
import { generateAngularMockService } from "@/domain/angular-mock-service-generator";
import { splitTopLevel, toCamelCase, toKebabCase, toPascalCase } from "@/domain/naming";
import { EngineConfig, ModelSpec } from "@/domain/types";

export interface AngularServiceArtifacts {
  service: string;
  dependencies: string;
  mockService: string;
}

export function generateAngularArtifacts(models: ModelSpec[], config: EngineConfig): AngularServiceArtifacts {
  if (models.length === 0) {
    return {
      service: "// No models available for service generation.",
      dependencies: "",
      mockService: ""
    };
  }

  const rootModel = models[0];
  const modelMap = new Map(models.map((model) => [model.name, model]));
  const modelNames = new Set(models.map((model) => model.name));
  const cleanName = rootModel.name.replace(/(Dto|Model)$/i, "");
  const modelType = `${config.modelPrefix}${rootModel.name}`;
  const serviceName = `${toPascalCase(cleanName)}${config.serviceSuffix}`;
  const resource = toKebabCase(cleanName || rootModel.name);
  const resourceLabel = resource.replace(/-/g, " ");
  const versionProfile = getAngularVersionProfile(config.angularVersion);
  const baseUrl = config.apiUrlPattern
    .replace("{resource}", resource)
    .replace("{model}", toKebabCase(rootModel.name));
  const endpointPath = baseUrl.replace(/^\/+/, "");

  const service = renderMainService({
    baseUrl,
    config,
    endpointPath,
    rootModel,
    modelType,
    resourceLabel,
    serviceName,
    versionProfile
  });
  const dependencies = renderSupportServices(config, models, modelMap, modelNames, rootModel, modelType);
  const mockService = generateAngularMockService(models, config);

  return {
    service,
    dependencies,
    mockService
  };
}

export function generateAngularService(models: ModelSpec[], config: EngineConfig): string {
  const artifacts = generateAngularArtifacts(models, config);
  return [artifacts.service, artifacts.dependencies].filter(Boolean).join("\n\n");
}

function renderMainService({
  baseUrl,
  config,
  endpointPath,
  rootModel,
  modelType,
  resourceLabel,
  serviceName,
  versionProfile
}: {
  baseUrl: string;
  config: EngineConfig;
  endpointPath: string;
  rootModel: ModelSpec;
  modelType: string;
  resourceLabel: string;
  serviceName: string;
  versionProfile: ReturnType<typeof getAngularVersionProfile>;
}): string {
  const extendsBaseApi = config.serviceExtendsBaseApi || config.serviceDependencies.includes("baseApiService");
  const usesLogger = config.serviceErrorHandling === "loggerService" || config.serviceDependencies.includes("logService");
  const usesMapper = config.serviceDependencies.includes("mappingService");
  const mapperMethodBase = getMapperMethodBase(rootModel.name);
  const signalImports = config.serviceUseSignals ? ", signal" : "";
  const needsInjectImport =
    config.injectionStyle === "inject" && (!extendsBaseApi || usesLogger || usesMapper);
  const injectImport = needsInjectImport ? ", inject" : "";
  const rxjsOperators = ["catchError", "throwError"];

  if (usesMapper) {
    rxjsOperators.splice(1, 0, "map");
  }

  return [
    buildCompatibilityBanner(config.angularVersion, "service"),
    `import { Injectable${signalImports}${injectImport} } from '@angular/core';`,
    ...buildMainServiceImports(extendsBaseApi, usesLogger, usesMapper),
    `import { Observable, ${rxjsOperators.join(", ")} } from 'rxjs';`,
    "",
    `@Injectable({ providedIn: 'root' })`,
    `export class ${serviceName}${extendsBaseApi ? " extends BaseApiService" : ""} {`,
    `  private readonly ${extendsBaseApi ? "endpoint" : "baseUrl"} = '${extendsBaseApi ? endpointPath : baseUrl}';`,
    ...buildDependencyLines(config, {
      extendsBaseApi,
      usesLogger,
      usesMapper
    }),
    "",
    buildSignalState(config, modelType, versionProfile.version),
    `  list(): Observable<${modelType}[]> {`,
    `    return ${buildListExpression(modelType, resourceLabel, usesMapper, extendsBaseApi, mapperMethodBase)};`,
    "  }",
    "",
    `  getById(id: string): Observable<${modelType}> {`,
    `    return ${buildGetByIdExpression(modelType, resourceLabel, usesMapper, extendsBaseApi, mapperMethodBase)};`,
    "  }",
    "",
    `  create(payload: ${modelType}): Observable<${modelType}> {`,
    `    return ${buildMutationExpression("post", modelType, resourceLabel, usesMapper, extendsBaseApi, mapperMethodBase)};`,
    "  }",
    "",
    `  update(id: string, payload: ${modelType}): Observable<${modelType}> {`,
    `    return ${buildMutationExpression("put", modelType, resourceLabel, usesMapper, extendsBaseApi, mapperMethodBase)};`,
    "  }",
    "",
    "  delete(id: string): Observable<void> {",
    `    return ${buildDeleteExpression(resourceLabel, extendsBaseApi)};`,
    "  }",
    "",
    buildErrorHelpers(config),
    "}"
  ]
    .filter(Boolean)
    .join("\n");
}

function buildMainServiceImports(extendsBaseApi: boolean, usesLogger: boolean, usesMapper: boolean): string[] {
  const lines: string[] = [];

  if (!extendsBaseApi) {
    lines.push("import { HttpClient } from '@angular/common/http';");
  }
  if (extendsBaseApi) {
    lines.push("import { BaseApiService } from './base-api.service';");
  }
  if (usesLogger) {
    lines.push("import { LoggerService } from './logger.service';");
  }
  if (usesMapper) {
    lines.push("import { MappingService } from './mapping.service';");
  }

  return lines;
}

function buildSignalState(config: EngineConfig, modelType: string, angularVersion: string): string {
  if (!config.serviceUseSignals) {
    return "";
  }

  return [
    "  private readonly _items = signal<" + modelType + "[]>([]);",
    "  readonly items = this._items.asReadonly();",
    "  private readonly _loading = signal(false);",
    "  readonly loading = this._loading.asReadonly();",
    "  // Stable signal store for Angular " + angularVersion + " without relying on experimental resource APIs.",
    "",
    "  loadAll(): void {",
    "    this._loading.set(true);",
    "    this.list().subscribe({",
    "      next: (items) => this._items.set(items),",
    "      complete: () => this._loading.set(false),",
    "      error: () => this._loading.set(false)",
    "    });",
    "  }",
    ""
  ].join("\n");
}

function buildDependencyLines(
  config: EngineConfig,
  features: { extendsBaseApi: boolean; usesLogger: boolean; usesMapper: boolean }
): string[] {
  if (features.extendsBaseApi) {
    const constructorArgs: string[] = [];

    if (features.usesLogger) {
      constructorArgs.push("private readonly logger: LoggerService");
    }
    if (features.usesMapper) {
      constructorArgs.push("private readonly mapper: MappingService");
    }

    if (config.injectionStyle === "inject") {
      const lines: string[] = [];
      if (features.usesLogger) {
        lines.push("  private readonly logger = inject(LoggerService);");
      }
      if (features.usesMapper) {
        lines.push("  private readonly mapper = inject(MappingService);");
      }
      return lines;
    }

    return constructorArgs.length ? [`  constructor(${constructorArgs.join(", ")}) {}`] : [];
  }

  if (config.injectionStyle === "inject") {
    const dependencies = ["  private readonly http = inject(HttpClient);"];
    if (features.usesLogger) {
      dependencies.push("  private readonly logger = inject(LoggerService);");
    }
    if (features.usesMapper) {
      dependencies.push("  private readonly mapper = inject(MappingService);");
    }
    return dependencies;
  }

  const constructorArgs = ["private readonly http: HttpClient"];
  if (features.usesLogger) {
    constructorArgs.push("private readonly logger: LoggerService");
  }
  if (features.usesMapper) {
    constructorArgs.push("private readonly mapper: MappingService");
  }

  return [`  constructor(${constructorArgs.join(", ")}) {}`];
}

function buildListExpression(
  modelType: string,
  resourceLabel: string,
  usesMapper: boolean,
  extendsBaseApi: boolean,
  mapperMethodBase: string
): string {
  const source = extendsBaseApi
    ? `this.get<${usesMapper ? "unknown[]" : `${modelType}[]`}>(this.endpoint)`
    : `this.http.get<${usesMapper ? "unknown[]" : `${modelType}[]`}>(this.baseUrl)`;
  return withPipes(source, [
    usesMapper ? `map((items) => this.mapper.map${mapperMethodBase}Array(items))` : "",
    buildCatchError("load " + resourceLabel)
  ]);
}

function buildGetByIdExpression(
  modelType: string,
  resourceLabel: string,
  usesMapper: boolean,
  extendsBaseApi: boolean,
  mapperMethodBase: string
): string {
  const source = extendsBaseApi
    ? `this.get<${usesMapper ? "unknown" : modelType}>(this.buildUrl(this.endpoint, id))`
    : `this.http.get<${usesMapper ? "unknown" : modelType}>(\`${"${this.baseUrl}"}/${"${id}"}\`)`;
  return withPipes(source, [
    usesMapper ? `map((item) => this.mapper.map${mapperMethodBase}(item))` : "",
    buildCatchError("load " + resourceLabel + " by id")
  ]);
}

function buildMutationExpression(
  method: "post" | "put",
  modelType: string,
  resourceLabel: string,
  usesMapper: boolean,
  extendsBaseApi: boolean,
  mapperMethodBase: string
): string {
  const source =
    method === "post"
      ? extendsBaseApi
        ? `this.post<${usesMapper ? "unknown" : modelType}>(this.endpoint, payload)`
        : `this.http.post<${usesMapper ? "unknown" : modelType}>(this.baseUrl, payload)`
      : extendsBaseApi
        ? `this.put<${usesMapper ? "unknown" : modelType}>(this.buildUrl(this.endpoint, id), payload)`
        : `this.http.put<${usesMapper ? "unknown" : modelType}>(\`${"${this.baseUrl}"}/${"${id}"}\`, payload)`;

  return withPipes(source, [
    usesMapper ? `map((item) => this.mapper.map${mapperMethodBase}(item))` : "",
    buildCatchError((method === "post" ? "create " : "update ") + resourceLabel)
  ]);
}

function buildDeleteExpression(resourceLabel: string, extendsBaseApi: boolean): string {
  const source = extendsBaseApi
    ? "this.delete<void>(this.buildUrl(this.endpoint, id))"
    : "this.http.delete<void>(`${this.baseUrl}/${id}`)";
  return withPipes(source, [buildCatchError("delete " + resourceLabel)]);
}

function withPipes(source: string, operations: string[]): string {
  const steps = operations.filter(Boolean);
  if (steps.length === 0) {
    return source;
  }
  return `${source}.pipe(${steps.join(", ")})`;
}

function buildCatchError(operation: string): string {
  return `catchError(this.handleError('${operation}'))`;
}

function buildErrorHelpers(config: EngineConfig): string {
  if (config.serviceErrorHandling === "loggerService") {
    return [
      "  private handleError(operation: string) {",
      "    return (error: unknown) => {",
      "      this.logger.error(`Failed to ${operation}.`, error);",
      "      return throwError(() => error);",
      "    };",
      "  }"
    ].join("\n");
  }

  return [
    "  private handleError(operation: string) {",
    "    return (error: unknown) => {",
    "      return throwError(() => new Error(`Failed to ${operation}.`, { cause: error }));",
    "    };",
    "  }"
  ].join("\n");
}

function renderSupportServices(
  config: EngineConfig,
  models: ModelSpec[],
  modelMap: Map<string, ModelSpec>,
  modelNames: Set<string>,
  rootModel: ModelSpec,
  modelType: string
): string {
  const includesBaseApi = config.serviceDependencies.includes("baseApiService") || config.serviceExtendsBaseApi;
  const includesLogger = config.serviceErrorHandling === "loggerService" || config.serviceDependencies.includes("logService");
  const includesMapping = config.serviceDependencies.includes("mappingService");

  const serviceBlocks = [
    includesBaseApi ? renderSupportFile("base-api.service.ts", renderBaseApiService()) : "",
    includesLogger ? renderSupportFile("logger.service.ts", renderLoggerService()) : "",
    includesMapping
      ? renderSupportFile("mapping.service.ts", renderMappingService(models, modelMap, modelNames, rootModel, modelType, config))
      : ""
  ].filter(Boolean);

  if (serviceBlocks.length === 0) {
    return "";
  }
  return serviceBlocks.join("\n\n");
}

function renderBaseApiService(): string {
  return [
    "import { Injectable, inject } from '@angular/core';",
    "import { HttpClient, HttpHeaders } from '@angular/common/http';",
    "import { Observable } from 'rxjs';",
    "",
    "// Support service: Base API",
    "@Injectable({ providedIn: 'root' })",
    "export class BaseApiService {",
    "  private readonly baseUrl = 'https://api.ejemplo.com';",
    "  protected readonly http = inject(HttpClient);",
    "",
    "  protected buildUrl(resource: string, id?: string): string {",
    "    return id ? `${resource}/${id}` : resource;",
    "  }",
    "",
    "  private resolveUrl(endpoint: string): string {",
    "    return `${this.baseUrl}/${endpoint}`;",
    "  }",
    "",
    "  get<T>(endpoint: string, headers?: HttpHeaders): Observable<T> {",
    "    return this.http.get<T>(this.resolveUrl(endpoint), { headers });",
    "  }",
    "",
    "  post<T>(endpoint: string, body: unknown, headers?: HttpHeaders): Observable<T> {",
    "    return this.http.post<T>(this.resolveUrl(endpoint), body, { headers });",
    "  }",
    "",
    "  put<T>(endpoint: string, body: unknown, headers?: HttpHeaders): Observable<T> {",
    "    return this.http.put<T>(this.resolveUrl(endpoint), body, { headers });",
    "  }",
    "",
    "  patch<T>(endpoint: string, body: unknown, headers?: HttpHeaders): Observable<T> {",
    "    return this.http.patch<T>(this.resolveUrl(endpoint), body, { headers });",
    "  }",
    "",
    "  delete<T>(endpoint: string, headers?: HttpHeaders): Observable<T> {",
    "    return this.http.delete<T>(this.resolveUrl(endpoint), { headers });",
    "  }",
    "}"
  ].join("\n");
}

function renderLoggerService(): string {
  return [
    "import { Injectable } from '@angular/core';",
    "",
    "// Support service: Logs",
    "@Injectable({ providedIn: 'root' })",
    "export class LoggerService {",
    "  error(message: string, error?: unknown): void {",
    "    console.error(`[ContractFlow] ${message}`, error);",
    "  }",
    "",
    "  info(message: string, payload?: unknown): void {",
    "    console.info(`[ContractFlow] ${message}`, payload);",
    "  }",
    "}"
  ].join("\n");
}

function renderMappingService(
  models: ModelSpec[],
  modelMap: Map<string, ModelSpec>,
  modelNames: Set<string>,
  rootModel: ModelSpec,
  modelType: string,
  config: EngineConfig
): string {
  const rootMapperMethodBase = getMapperMethodBase(rootModel.name);
  const methodBlocks = models.map((model) => renderModelMapper(model, modelMap, config));
  const wrapperBlocks = Array.from(collectGenericWrapperTypes(models))
    .map((wrapperType) => renderWrapperMapper(wrapperType, modelMap, modelNames))
    .filter(Boolean);
  return [
    "import { Injectable } from '@angular/core';",
    "",
    "// Support service: Mapping",
    "@Injectable({ providedIn: 'root' })",
    "export class MappingService {",
    methodBlocks.join("\n\n"),
    wrapperBlocks.length ? "\n\n" + wrapperBlocks.join("\n\n") : "",
    "",
    `  map${rootMapperMethodBase}Item(source: unknown): ${modelType} {`,
    `    return this.map${rootMapperMethodBase}(source);`,
    "  }",
    "}"
  ].join("\n");
}

function getMapperMethodBase(modelName: string): string {
  return toPascalCase(modelName.replace(/(Dto|Model)$/i, ""));
}

function renderModelMapper(model: ModelSpec, modelMap: Map<string, ModelSpec>, config: EngineConfig): string {
  const mapperMethodBase = getMapperMethodBase(model.name);
  const modelType = `${config.modelPrefix}${model.name}`;
  const propertyLines = model.properties.map((property) => {
    const sourceKey = property.name;
    const fieldName = config.camelCaseProperties ? toCamelCase(property.name) : property.name;
    return `      ${fieldName}: ${renderPropertyMapper(property.type, sourceKey, modelMap)}`
  });

  return [
    `  map${mapperMethodBase}(source: unknown): ${modelType} {`,
    "    const value = source as Record<string, unknown>;",
    "",
    "    return {",
    propertyLines.join(",\n"),
    "    };",
    "  }",
    "",
    `  map${mapperMethodBase}Array(source: unknown[]): ${modelType}[] {`,
    `    return source.map((item) => this.map${mapperMethodBase}(item));`,
    "  }"
  ].join("\n");
}

function renderPropertyMapper(
  type: string,
  sourceKey: string,
  modelMap: Map<string, ModelSpec>,
  modelNames: Set<string> = new Set(modelMap.keys())
): string {
  const parts = splitTopLevel(type, "|").map((part) => part.trim()).filter(Boolean);
  const nonNullParts = parts.filter((part) => part !== "null");
  const baseType = normalizeCollectionType(nonNullParts[0] ?? parts[0] ?? "unknown");
  const nullable = parts.includes("null");
  const accessor = `value['${sourceKey}']`;

  if (baseType.endsWith("[]")) {
    const inner = baseType.slice(0, -2).replace(/^\((.*)\)$/, "$1");
    const itemMapper = renderArrayItemMapper(inner, "item", modelMap);
    const arrayExpr = `Array.isArray(${accessor}) ? ${accessor}.map((item) => ${itemMapper}) : []`;
    return nullable ? `${accessor} == null ? null : ${arrayExpr}` : arrayExpr;
  }
  if (baseType.startsWith("Record<")) {
    const recordExpr = renderRecordMapper(baseType, accessor, modelMap);
    return nullable ? `${accessor} == null ? null : ${recordExpr}` : recordExpr;
  }

  if (baseType === "string") {
    const expr = `String(${accessor} ?? '')`;
    return nullable ? `${accessor} == null ? null : String(${accessor})` : expr;
  }
  if (baseType === "number") {
    const expr = `Number(${accessor} ?? 0)`;
    return nullable ? `${accessor} == null ? null : Number(${accessor})` : expr;
  }
  if (baseType === "boolean") {
    const expr = `Boolean(${accessor})`;
    return nullable ? `${accessor} == null ? null : Boolean(${accessor})` : expr;
  }
  if (baseType === "Date") {
    const expr = `new Date(String(${accessor}))`;
    return nullable ? `${accessor} == null ? null : ${expr}` : `${accessor} instanceof Date ? ${accessor} : ${expr}`;
  }
  if (isDomainGenericWrapper(baseType)) {
    const expr = `this.map${getWrapperMapperMethodBase(baseType)}(${accessor})`;
    return nullable ? `${accessor} == null ? null : ${expr}` : expr;
  }
  if (modelMap.has(baseType)) {
    const mapperMethodBase = getMapperMethodBase(baseType);
    const expr = `this.map${mapperMethodBase}(${accessor})`;
    return nullable ? `${accessor} == null ? null : ${expr}` : expr;
  }

  const typedBase = withKnownModelPrefixes(baseType, modelNames);
  return nullable ? `(${accessor} as ${typedBase} | null) ?? null` : `${accessor} as ${typedBase}`;
}

function renderArrayItemMapper(type: string, itemVar: string, modelMap: Map<string, ModelSpec>): string {
  const normalizedType = normalizeCollectionType(type);
  if (normalizedType.endsWith("[]")) {
    const inner = normalizedType.slice(0, -2).replace(/^\((.*)\)$/, "$1");
    return `Array.isArray(${itemVar}) ? ${itemVar}.map((nested) => ${renderArrayItemMapper(inner, "nested", modelMap)}) : []`;
  }
  if (normalizedType.startsWith("Record<")) {
    return renderRecordMapper(normalizedType, itemVar, modelMap);
  }
  if (isDomainGenericWrapper(normalizedType)) {
    return `this.map${getWrapperMapperMethodBase(normalizedType)}(${itemVar})`;
  }
  if (normalizedType === "string") return `String(${itemVar} ?? '')`;
  if (normalizedType === "number") return `Number(${itemVar} ?? 0)`;
  if (normalizedType === "boolean") return `Boolean(${itemVar})`;
  if (normalizedType === "Date") return `${itemVar} instanceof Date ? ${itemVar} : new Date(String(${itemVar}))`;
  if (modelMap.has(normalizedType)) {
    return `this.map${getMapperMethodBase(normalizedType)}(${itemVar})`;
  }
  return `${itemVar} as ${normalizedType}`;
}

function renderSupportFile(filename: string, content: string): string {
  return [`// ${filename}`, content].join("\n");
}

function normalizeCollectionType(type: string): string {
  const trimmed = type.trim();
  if (trimmed.startsWith("Array<") && trimmed.endsWith(">")) {
    return `${trimmed.slice(6, -1).trim()}[]`;
  }
  return trimmed;
}

function renderRecordMapper(type: string, accessor: string, modelMap: Map<string, ModelSpec>): string {
  const inner = type.slice("Record<".length, -1);
  const [keyTypeRaw, valueTypeRaw] = splitTopLevel(inner, ",").map((part) => part.trim());
  const keyType = keyTypeRaw || "string";
  const valueType = normalizeCollectionType(valueTypeRaw || "unknown");
  const keyMapper = keyType === "number" ? "Number(key)" : "String(key)";
  const valueMapper = renderArrayItemMapper(valueType, "entryValue", modelMap);

  return `Object.fromEntries(Object.entries(${accessor} as Record<string, unknown>).map(([key, entryValue]) => [${keyMapper}, ${valueMapper}]))`;
}

function collectGenericWrapperTypes(models: ModelSpec[]): Set<string> {
  const wrappers = new Set<string>();

  for (const model of models) {
    for (const property of model.properties) {
      collectGenericWrapperTypesFromType(property.type, wrappers);
    }
  }

  return wrappers;
}

function collectGenericWrapperTypesFromType(type: string, wrappers: Set<string>) {
  const parts = splitTopLevel(type, "|").map((part) => part.trim()).filter(Boolean);

  for (const part of parts) {
    if (part === "null") continue;

    const normalized = normalizeCollectionType(part);

    if (normalized.endsWith("[]")) {
      collectGenericWrapperTypesFromType(normalized.slice(0, -2), wrappers);
      continue;
    }

    if (normalized.startsWith("Record<")) {
      const inner = normalized.slice("Record<".length, -1);
      for (const arg of splitTopLevel(inner, ",")) {
        collectGenericWrapperTypesFromType(arg, wrappers);
      }
      continue;
    }

    if (isDomainGenericWrapper(normalized)) {
      wrappers.add(normalized);
      const generic = parseGenericType(normalized);
      if (generic) {
        for (const arg of generic.args) {
          collectGenericWrapperTypesFromType(arg, wrappers);
        }
      }
    }
  }
}

function renderWrapperMapper(
  wrapperType: string,
  modelMap: Map<string, ModelSpec>,
  modelNames: Set<string>
): string {
  const generic = parseGenericType(wrapperType);
  if (!generic) return "";

  const returnType = withKnownModelPrefixes(wrapperType, modelNames);
  const methodName = getWrapperMapperMethodBase(wrapperType);
  const overrides = renderGenericWrapperOverrides(generic.args, modelMap, modelNames);

  return [
    `  map${methodName}(source: unknown): ${returnType} {`,
    "    const value = source as Record<string, unknown>;",
    "",
    "    return {",
    `      ...(value as ${returnType})${overrides ? "," : ""}`,
    overrides,
    "    };",
    "  }"
  ]
    .filter(Boolean)
    .join("\n");
}

function renderGenericWrapperOverrides(
  args: string[],
  modelMap: Map<string, ModelSpec>,
  modelNames: Set<string>
): string {
  const normalizedArgs = args.map((arg) => normalizeCollectionType(arg));
  const lines: string[] = [];

  if (normalizedArgs[0]) {
    lines.push(
      ...renderWrapperOverrideLines(normalizedArgs[0], ["items", "results", "records", "nodes", "content", "list"], true, modelMap, modelNames)
    );
    lines.push(
      ...renderWrapperOverrideLines(normalizedArgs[0], ["data", "value", "result", "item", "payload", "model"], false, modelMap, modelNames)
    );
  }

  if (normalizedArgs[1]) {
    lines.push(
      ...renderWrapperOverrideLines(normalizedArgs[1], ["meta", "metadata", "page", "paging", "summary"], false, modelMap, modelNames)
    );
  }

  return Array.from(new Set(lines)).join(",\n");
}

function renderWrapperOverrideLines(
  type: string,
  keys: string[],
  asCollection: boolean,
  modelMap: Map<string, ModelSpec>,
  modelNames: Set<string>
): string[] {
  return keys.map((key) => {
    const accessor = `value['${key}']`;
    const normalizedType = asCollection && !type.endsWith("[]") ? `${type}[]` : type;

    if (normalizedType.endsWith("[]")) {
      const inner = normalizedType.slice(0, -2).replace(/^\((.*)\)$/, "$1");
      return `      ${key}: Array.isArray(${accessor}) ? ${accessor}.map((item) => ${renderArrayItemMapper(inner, "item", modelMap)}) : []`;
    }

    return `      ${key}: ${accessor} == null ? null : ${renderWrapperValueMapper(normalizedType, accessor, modelMap, modelNames)}`;
  });
}

function renderWrapperValueMapper(
  type: string,
  accessor: string,
  modelMap: Map<string, ModelSpec>,
  modelNames: Set<string>
): string {
  const normalized = normalizeCollectionType(type);

  if (normalized === "string") return `String(${accessor})`;
  if (normalized === "number") return `Number(${accessor})`;
  if (normalized === "boolean") return `Boolean(${accessor})`;
  if (normalized === "Date") return `${accessor} instanceof Date ? ${accessor} : new Date(String(${accessor}))`;
  if (normalized.startsWith("Record<")) return renderRecordMapper(normalized, accessor, modelMap);
  if (isDomainGenericWrapper(normalized)) return `this.map${getWrapperMapperMethodBase(normalized)}(${accessor})`;
  if (modelMap.has(normalized)) return `this.map${getMapperMethodBase(normalized)}(${accessor})`;

  return `${accessor} as ${withKnownModelPrefixes(normalized, modelNames)}`;
}

function isDomainGenericWrapper(type: string): boolean {
  const generic = parseGenericType(type);
  return Boolean(generic) && !type.startsWith("Record<");
}

function parseGenericType(type: string): { name: string; args: string[] } | null {
  const match = /^([A-Za-z_]\w*)<(.+)>$/.exec(type);
  if (!match) {
    return null;
  }

  return {
    name: match[1],
    args: splitTopLevel(match[2], ",").map((arg) => arg.trim())
  };
}

function getWrapperMapperMethodBase(type: string): string {
  const generic = parseGenericType(type);
  if (!generic) {
    return toPascalCase(type);
  }

  const argsSuffix = generic.args.map((arg) => getWrapperTypeLabel(arg)).join("And");
  return `${toPascalCase(generic.name)}Of${argsSuffix}`;
}

function getWrapperTypeLabel(type: string): string {
  const normalized = normalizeCollectionType(type);

  if (normalized.endsWith("[]")) {
    return `${getWrapperTypeLabel(normalized.slice(0, -2))}Array`;
  }

  if (normalized.startsWith("Record<")) {
    const inner = normalized.slice("Record<".length, -1);
    const [keyType, valueType] = splitTopLevel(inner, ",").map((part) => part.trim());
    return `RecordOf${getWrapperTypeLabel(keyType)}And${getWrapperTypeLabel(valueType)}`;
  }

  const generic = parseGenericType(normalized);
  if (generic) {
    return `${toPascalCase(generic.name)}Of${generic.args.map((arg) => getWrapperTypeLabel(arg)).join("And")}`;
  }

  return getMapperMethodBase(normalized);
}

function withKnownModelPrefixes(type: string, modelNames: Set<string>): string {
  let result = type;

  for (const modelName of modelNames) {
    const regex = new RegExp(`\\b${modelName}\\b`, "g");
    result = result.replace(regex, `I${modelName}`);
  }

  return result;
}



