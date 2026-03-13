import { describe, expect, test } from "vitest";
import { generateService } from "@/application/engine";
import { ModelSpec } from "@/domain/types";

const models: ModelSpec[] = [
  {
    name: "UserDto",
    properties: [
      { name: "id", type: "string", nullable: false, optional: false },
      { name: "displayName", type: "string | null", nullable: true, optional: false }
    ]
  }
];

describe("Angular service generator", () => {
  test("supports inject() + signals", () => {
    const service = generateService(models, {
      modelPrefix: "I",
      angularVersion: "21",
      injectionStyle: "inject",
      serviceUseSignals: true,
      serviceErrorHandling: "catchError"
    });

    expect(service).toContain("inject(HttpClient)");
    expect(service).toContain("// Target: Angular 21 (21.0.x)");
    expect(service).toContain("private readonly _items = signal<IUserDto[]>([])");
    expect(service).toContain("readonly items = this._items.asReadonly()");
    expect(service).toContain("private readonly _loading = signal(false)");
    expect(service).toContain("readonly loading = this._loading.asReadonly()");
    expect(service).toContain("Stable signal store for Angular 21");
    expect(service).toContain("import { Observable, catchError, throwError } from 'rxjs';");
    expect(service).toContain(".pipe(catchError(this.handleError('load user')))");
    expect(service).toContain("return throwError(() => new Error(`Failed to ${operation}.`));");
    expect(service).toContain("list(): Observable<IUserDto[]>");
  });

  test("supports constructor injection", () => {
    const service = generateService(models, {
      modelPrefix: "I",
      angularVersion: "18",
      injectionStyle: "constructor",
      serviceUseSignals: false,
      serviceErrorHandling: "catchError"
    });

    expect(service).toContain("constructor(private readonly http: HttpClient) {}");
    expect(service).not.toContain("signal<");
    expect(service).not.toContain("LoggerService");
  });

  test("supports LoggerService error handling", () => {
    const service = generateService(models, {
      modelPrefix: "I",
      angularVersion: "20",
      injectionStyle: "inject",
      serviceUseSignals: false,
      serviceErrorHandling: "loggerService"
    });

    expect(service).toContain("private readonly logger = inject(LoggerService);");
    expect(service).toContain("this.logger.error(`Failed to ${operation}.`, error);");
    expect(service).toContain(".pipe(catchError(this.handleError('create user')))");
    expect(service).toContain("export class LoggerService");
  });

  test("generates complementary support services when selected", () => {
    const service = generateService(models, {
      modelPrefix: "I",
      angularVersion: "21",
      injectionStyle: "constructor",
      serviceUseSignals: false,
      serviceErrorHandling: "catchError",
      serviceDependencies: ["baseApiService", "logService", "mappingService"],
      serviceExtendsBaseApi: true
    });

    expect(service).toContain("export class UserService extends BaseApiService");
    expect(service).toContain("super(http);");
    expect(service).toContain("private readonly logger: LoggerService");
    expect(service).toContain("private readonly mapper: MappingService");
    expect(service).toContain("this.buildUrl(this.baseUrl, id)");
    expect(service).toContain("export abstract class BaseApiService");
    expect(service).toContain("export class LoggerService");
    expect(service).toContain("export class MappingService");
    expect(service).toContain("map((items) => this.mapper.mapArray(items, (item) => item as IUserDto))");
  });
});
