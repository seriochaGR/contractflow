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
      injectionStyle: "inject",
      serviceUseSignals: true,
      serviceErrorHandling: "catchError"
    });

    expect(service).toContain("inject(HttpClient)");
    expect(service).toContain("private readonly _items = signal<IUserDto[]>([])");
    expect(service).toContain("readonly items = this._items.asReadonly()");
    expect(service).toContain("private readonly _loading = signal(false)");
    expect(service).toContain("readonly loading = this._loading.asReadonly()");
    expect(service).toContain("import { Observable, catchError, throwError } from 'rxjs';");
    expect(service).toContain(".pipe(catchError(this.handleError('load user')))");
    expect(service).toContain("return throwError(() => new Error(`Failed to ${operation}.`));");
    expect(service).toContain("list(): Observable<IUserDto[]>");
  });

  test("supports constructor injection", () => {
    const service = generateService(models, {
      modelPrefix: "I",
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
      injectionStyle: "inject",
      serviceUseSignals: false,
      serviceErrorHandling: "loggerService"
    });

    expect(service).toContain("import { LoggerService } from './logger.service';");
    expect(service).toContain("private readonly logger = inject(LoggerService);");
    expect(service).toContain("this.logger.error(`Failed to ${operation}.`, error);");
    expect(service).toContain(".pipe(catchError(this.handleError('create user')))");
  });
});
