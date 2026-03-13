import { buildCompatibilityBanner, getAngularVersionProfile } from "@/domain/angular-target";
import { toKebabCase, toPascalCase } from "@/domain/naming";
import { EngineConfig, ModelSpec } from "@/domain/types";

export interface AngularServiceArtifacts {
  service: string;
  dependencies: string;
}

export function generateAngularArtifacts(models: ModelSpec[], config: EngineConfig): AngularServiceArtifacts {
  if (models.length === 0) {
    return {
      service: "// No models available for service generation.",
      dependencies: ""
    };
  }

  const rootModel = models[0];
  const cleanName = rootModel.name.replace(/(Dto|Model)$/i, "");
  const modelType = `${config.modelPrefix}${rootModel.name}`;
  const serviceName = `${toPascalCase(cleanName)}${config.serviceSuffix}`;
  const resource = toKebabCase(cleanName || rootModel.name);
  const resourceLabel = resource.replace(/-/g, " ");
  const versionProfile = getAngularVersionProfile(config.angularVersion);
  const baseUrl = config.apiUrlPattern
    .replace("{resource}", resource)
    .replace("{model}", toKebabCase(rootModel.name));

  const service = renderMainService({
      baseUrl,
      config,
      modelType,
      resourceLabel,
      serviceName,
      versionProfile
    });
  const dependencies = [
    renderBaseApiService(config),
    renderLoggerService(config),
    renderMappingService(config)
  ].filter(Boolean);

  return {
    service,
    dependencies: dependencies.join("\n\n")
  };
}

export function generateAngularService(models: ModelSpec[], config: EngineConfig): string {
  const artifacts = generateAngularArtifacts(models, config);
  return [artifacts.service, artifacts.dependencies].filter(Boolean).join("\n\n");
}

function renderMainService({
  baseUrl,
  config,
  modelType,
  resourceLabel,
  serviceName,
  versionProfile
}: {
  baseUrl: string;
  config: EngineConfig;
  modelType: string;
  resourceLabel: string;
  serviceName: string;
  versionProfile: ReturnType<typeof getAngularVersionProfile>;
}): string {
  const extendsBaseApi = config.serviceExtendsBaseApi || config.serviceDependencies.includes("baseApiService");
  const usesLogger = config.serviceErrorHandling === "loggerService" || config.serviceDependencies.includes("logService");
  const usesMapper = config.serviceDependencies.includes("mappingService");
  const signalImports = config.serviceUseSignals ? ", signal" : "";
  const injectImport = config.injectionStyle === "inject" || extendsBaseApi ? ", inject" : "";
  const rxjsOperators = ["catchError", "throwError"];

  if (usesMapper) {
    rxjsOperators.splice(1, 0, "map");
  }

  return [
    buildCompatibilityBanner(config.angularVersion, "service"),
    `import { Injectable${signalImports}${injectImport} } from '@angular/core';`,
    "import { HttpClient } from '@angular/common/http';",
    `import { Observable, ${rxjsOperators.join(", ")} } from 'rxjs';`,
    "",
    `@Injectable({ providedIn: 'root' })`,
    `export class ${serviceName}${extendsBaseApi ? " extends BaseApiService" : ""} {`,
    `  private readonly baseUrl = '${baseUrl}';`,
    ...buildDependencyLines(config, {
      extendsBaseApi,
      usesLogger,
      usesMapper
    }),
    "",
    buildSignalState(config, modelType, versionProfile.version),
    `  list(): Observable<${modelType}[]> {`,
    `    return ${buildListExpression(modelType, resourceLabel, usesMapper)};`,
    "  }",
    "",
    `  getById(id: string): Observable<${modelType}> {`,
    `    return ${buildGetByIdExpression(modelType, resourceLabel, usesMapper, extendsBaseApi)};`,
    "  }",
    "",
    `  create(payload: ${modelType}): Observable<${modelType}> {`,
    `    return ${buildMutationExpression("post", modelType, resourceLabel, usesMapper, extendsBaseApi)};`,
    "  }",
    "",
    `  update(id: string, payload: ${modelType}): Observable<${modelType}> {`,
    `    return ${buildMutationExpression("put", modelType, resourceLabel, usesMapper, extendsBaseApi)};`,
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
      const lines = ["  constructor() {", "    super(inject(HttpClient));", "  }"];
      if (features.usesLogger) {
        lines.splice(0, 0, "  private readonly logger = inject(LoggerService);");
      }
      if (features.usesMapper) {
        lines.splice(features.usesLogger ? 1 : 0, 0, "  private readonly mapper = inject(MappingService);");
      }
      return lines;
    }

    return [`  constructor(http: HttpClient${constructorArgs.length ? `, ${constructorArgs.join(", ")}` : ""}) {`, "    super(http);", "  }"];
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

function buildListExpression(modelType: string, resourceLabel: string, usesMapper: boolean): string {
  const source = `this.http.get<${usesMapper ? "unknown[]" : `${modelType}[]`}>(this.baseUrl)`;
  return withPipes(source, [
    usesMapper ? `map((items) => this.mapper.mapArray(items, (item) => item as ${modelType}))` : "",
    buildCatchError("load " + resourceLabel)
  ]);
}

function buildGetByIdExpression(
  modelType: string,
  resourceLabel: string,
  usesMapper: boolean,
  extendsBaseApi: boolean
): string {
  const url = extendsBaseApi ? "this.buildUrl(this.baseUrl, id)" : "`${this.baseUrl}/${id}`";
  const source = `this.http.get<${usesMapper ? "unknown" : modelType}>(${url})`;
  return withPipes(source, [
    usesMapper ? `map((item) => this.mapper.mapItem(item, (value) => value as ${modelType}))` : "",
    buildCatchError("load " + resourceLabel + " by id")
  ]);
}

function buildMutationExpression(
  method: "post" | "put",
  modelType: string,
  resourceLabel: string,
  usesMapper: boolean,
  extendsBaseApi: boolean
): string {
  const url = method === "post" ? "this.baseUrl" : extendsBaseApi ? "this.buildUrl(this.baseUrl, id)" : "`${this.baseUrl}/${id}`";
  const source =
    method === "post"
      ? `this.http.post<${usesMapper ? "unknown" : modelType}>(${url}, payload)`
      : `this.http.put<${usesMapper ? "unknown" : modelType}>(${url}, payload)`;

  return withPipes(source, [
    usesMapper ? `map((item) => this.mapper.mapItem(item, (value) => value as ${modelType}))` : "",
    buildCatchError((method === "post" ? "create " : "update ") + resourceLabel)
  ]);
}

function buildDeleteExpression(resourceLabel: string, extendsBaseApi: boolean): string {
  const url = extendsBaseApi ? "this.buildUrl(this.baseUrl, id)" : "`${this.baseUrl}/${id}`";
  return withPipes(`this.http.delete<void>(${url})`, [buildCatchError("delete " + resourceLabel)]);
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
    "      return throwError(() => new Error(`Failed to ${operation}.`));",
    "    };",
    "  }"
  ].join("\n");
}

function renderBaseApiService(config: EngineConfig): string {
  if (!config.serviceDependencies.includes("baseApiService") && !config.serviceExtendsBaseApi) {
    return "";
  }

  return [
    "// Support service: Base API",
    "@Injectable({ providedIn: 'root' })",
    "export abstract class BaseApiService {",
    "  protected constructor(protected readonly http: HttpClient) {}",
    "",
    "  protected buildUrl(resource: string, id?: string): string {",
    "    return id ? `${resource}/${id}` : resource;",
    "  }",
    "}"
  ].join("\n");
}

function renderLoggerService(config: EngineConfig): string {
  if (config.serviceErrorHandling !== "loggerService" && !config.serviceDependencies.includes("logService")) {
    return "";
  }

  return [
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

function renderMappingService(config: EngineConfig): string {
  if (!config.serviceDependencies.includes("mappingService")) {
    return "";
  }

  return [
    "// Support service: Mapping",
    "@Injectable({ providedIn: 'root' })",
    "export class MappingService {",
    "  mapArray<TInput, TOutput>(items: TInput[], projector: (item: TInput) => TOutput): TOutput[] {",
    "    return items.map(projector);",
    "  }",
    "",
    "  mapItem<TInput, TOutput>(item: TInput, projector: (value: TInput) => TOutput): TOutput {",
    "    return projector(item);",
    "  }",
    "}"
  ].join("\n");
}
