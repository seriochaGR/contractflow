import { EngineConfig, ModelSpec } from "@/domain/types";
import { toKebabCase, toPascalCase } from "@/domain/naming";

export function generateAngularService(models: ModelSpec[], config: EngineConfig): string {
  if (models.length === 0) {
    return "// No models available for service generation.";
  }

  const rootModel = models[0];
  const cleanName = rootModel.name.replace(/(Dto|Model)$/i, "");
  const modelType = `${config.modelPrefix}${rootModel.name}`;
  const serviceName = `${toPascalCase(cleanName)}${config.serviceSuffix}`;
  const resource = toKebabCase(cleanName || rootModel.name);
  const resourceLabel = resource.replace(/-/g, " ");
  const baseUrl = config.apiUrlPattern
    .replace("{resource}", resource)
    .replace("{model}", toKebabCase(rootModel.name));
  const dependencyLines = buildDependencyLines(config);
  const importLines = buildImportLines(config);
  const errorHelpers = buildErrorHelpers(config);

  const signalImports = config.serviceUseSignals ? ", signal" : "";
  const signalState = config.serviceUseSignals
    ? [
        "  private readonly _items = signal<" + modelType + "[]>([]);",
        "  readonly items = this._items.asReadonly();",
        "  private readonly _loading = signal(false);",
        "  readonly loading = this._loading.asReadonly();",
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
      ].join("\n")
    : "";

  return [
    `import { Injectable${signalImports}${config.injectionStyle === "inject" ? ", inject" : ""} } from '@angular/core';`,
    ...importLines,
    "",
    `@Injectable({ providedIn: 'root' })`,
    `export class ${serviceName} {`,
    `  private readonly baseUrl = '${baseUrl}';`,
    ...dependencyLines,
    "",
    signalState,
    `  list(): Observable<${modelType}[]> {`,
    "    return this.http.get<" + modelType + "[]>(this.baseUrl)" + buildCatchError("load " + resourceLabel) + ";",
    "  }",
    "",
    `  getById(id: string): Observable<${modelType}> {`,
    "    return this.http.get<" + modelType + ">(`${this.baseUrl}/${id}`)" + buildCatchError("load " + resourceLabel + " by id") + ";",
    "  }",
    "",
    `  create(payload: ${modelType}): Observable<${modelType}> {`,
    "    return this.http.post<" + modelType + ">(this.baseUrl, payload)" + buildCatchError("create " + resourceLabel) + ";",
    "  }",
    "",
    `  update(id: string, payload: ${modelType}): Observable<${modelType}> {`,
    "    return this.http.put<" + modelType + ">(`${this.baseUrl}/${id}`, payload)" + buildCatchError("update " + resourceLabel) + ";",
    "  }",
    "",
    "  delete(id: string): Observable<void> {",
    "    return this.http.delete<void>(`${this.baseUrl}/${id}`)" + buildCatchError("delete " + resourceLabel) + ";",
    "  }",
    "",
    errorHelpers,
    "}"
  ]
    .filter(Boolean)
    .join("\n");
}

function buildDependencyLines(config: EngineConfig): string[] {
  if (config.injectionStyle === "inject") {
    const dependencies = ["  private readonly http = inject(HttpClient);"];
    if (config.serviceErrorHandling === "loggerService") {
      dependencies.push("  private readonly logger = inject(LoggerService);");
    }
    return dependencies;
  }

  if (config.serviceErrorHandling === "loggerService") {
    return ["  constructor(private readonly http: HttpClient, private readonly logger: LoggerService) {}"];
  }

  return ["  constructor(private readonly http: HttpClient) {}"];
}

function buildImportLines(config: EngineConfig): string[] {
  const lines = ["import { HttpClient } from '@angular/common/http';"];

  if (config.serviceErrorHandling === "loggerService") {
    lines.push("import { LoggerService } from './logger.service';");
  }

  lines.push("import { Observable, catchError, throwError } from 'rxjs';");
  return lines;
}

function buildCatchError(operation: string): string {
  return `.pipe(catchError(this.handleError('${operation}')))`;
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
