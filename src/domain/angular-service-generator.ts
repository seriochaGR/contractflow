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
  const baseUrl = config.apiUrlPattern
    .replace("{resource}", resource)
    .replace("{model}", toKebabCase(rootModel.name));
  const injectLine =
    config.injectionStyle === "inject"
      ? "  private readonly http = inject(HttpClient);"
      : "  constructor(private readonly http: HttpClient) {}";

  const signalImports = config.serviceUseSignals ? ", signal" : "";
  const signalState = config.serviceUseSignals
    ? [
        "  readonly items = signal<" + modelType + "[]>([]);",
        "  readonly loading = signal(false);",
        "",
        "  loadAll(): void {",
        "    this.loading.set(true);",
        "    this.list().subscribe({",
        "      next: (items) => this.items.set(items),",
        "      complete: () => this.loading.set(false),",
        "      error: () => this.loading.set(false)",
        "    });",
        "  }",
        ""
      ].join("\n")
    : "";

  return [
    `import { Injectable${signalImports}${config.injectionStyle === "inject" ? ", inject" : ""} } from '@angular/core';`,
    "import { HttpClient } from '@angular/common/http';",
    "import { Observable } from 'rxjs';",
    "",
    `@Injectable({ providedIn: 'root' })`,
    `export class ${serviceName} {`,
    `  private readonly baseUrl = '${baseUrl}';`,
    injectLine,
    "",
    signalState,
    `  list(): Observable<${modelType}[]> {`,
    "    return this.http.get<" + modelType + "[]>(this.baseUrl);",
    "  }",
    "",
    `  getById(id: string): Observable<${modelType}> {`,
    "    return this.http.get<" + modelType + ">(`${this.baseUrl}/${id}`);",
    "  }",
    "",
    `  create(payload: ${modelType}): Observable<${modelType}> {`,
    "    return this.http.post<" + modelType + ">(this.baseUrl, payload);",
    "  }",
    "",
    `  update(id: string, payload: ${modelType}): Observable<${modelType}> {`,
    "    return this.http.put<" + modelType + ">(`${this.baseUrl}/${id}`, payload);",
    "  }",
    "",
    "  delete(id: string): Observable<void> {",
    "    return this.http.delete<void>(`${this.baseUrl}/${id}`);",
    "  }",
    "}"
  ]
    .filter(Boolean)
    .join("\n");
}
