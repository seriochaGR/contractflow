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

const nestedModels: ModelSpec[] = [
  {
    name: "UserDto",
    properties: [
      { name: "id", type: "string", nullable: false, optional: false },
      { name: "address", type: "AddressDto | null", nullable: true, optional: false },
      { name: "roles", type: "RoleDto[]", nullable: false, optional: false },
      { name: "roleMap", type: "Record<string, RoleDto>", nullable: false, optional: false },
      { name: "history", type: "Array<AddressDto>", nullable: false, optional: false },
      { name: "page", type: "PagedResult<RoleDto> | null", nullable: true, optional: false }
    ]
  },
  {
    name: "AddressDto",
    properties: [
      { name: "street", type: "string", nullable: false, optional: false },
      { name: "zipCode", type: "number", nullable: false, optional: false }
    ]
  },
  {
    name: "RoleDto",
    properties: [{ name: "name", type: "string", nullable: false, optional: false }]
  },
  {
    name: "PageMetaDto",
    properties: [{ name: "total", type: "number", nullable: false, optional: false }]
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
    expect(service).toContain("return throwError(() => new Error(`Failed to ${operation}.`, { cause: error }));");
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

    expect(service).toContain("import { LoggerService } from './logger.service';");
    expect(service).toContain("private readonly logger = inject(LoggerService);");
    expect(service).toContain("this.logger.error(`Failed to ${operation}.`, error);");
    expect(service).toContain(".pipe(catchError(this.handleError('create user')))");
    expect(service).toContain("// logger.service.ts");
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
    expect(service).toContain("private readonly endpoint = 'api/user';");
    expect(service).toContain("import { BaseApiService } from './base-api.service';");
    expect(service).toContain("import { LoggerService } from './logger.service';");
    expect(service).toContain("import { MappingService } from './mapping.service';");
    expect(service).toContain("private readonly logger: LoggerService");
    expect(service).toContain("private readonly mapper: MappingService");
    expect(service).toContain("this.get<unknown[]>(this.endpoint)");
    expect(service).toContain("this.get<unknown>(this.buildUrl(this.endpoint, id))");
    expect(service).toContain("this.post<unknown>(this.endpoint, payload)");
    expect(service).toContain("this.put<unknown>(this.buildUrl(this.endpoint, id), payload)");
    expect(service).toContain("this.delete<void>(this.buildUrl(this.endpoint, id))");
    expect(service).toContain("// base-api.service.ts");
    expect(service).toContain("// logger.service.ts");
    expect(service).toContain("// mapping.service.ts");
    expect(service).toContain("export class BaseApiService");
    expect(service).toContain("export class LoggerService");
    expect(service).toContain("export class MappingService");
    expect(service).toContain("map((items) => this.mapper.mapUserArray(items))");
    expect(service).toContain("map((item) => this.mapper.mapUser(item))");
    expect(service).toContain("mapUser(source: unknown): IUserDto");
    expect(service).toContain("id: String(value['id'] ?? '')");
    expect(service).toContain("displayName: value['displayName'] == null ? null : String(value['displayName'])");
  });

  test("generates a richer BaseApiService template", () => {
    const service = generateService(models, {
      modelPrefix: "I",
      angularVersion: "21",
      injectionStyle: "inject",
      serviceUseSignals: false,
      serviceErrorHandling: "catchError",
      serviceDependencies: ["baseApiService"]
    });

    expect(service).toContain("// base-api.service.ts");
    expect(service).toContain("import { HttpClient, HttpHeaders } from '@angular/common/http';");
    expect(service).toContain("private readonly baseUrl = 'https://api.ejemplo.com';");
    expect(service).toContain("protected readonly http = inject(HttpClient);");
    expect(service).toContain("get<T>(endpoint: string, headers?: HttpHeaders): Observable<T>");
    expect(service).toContain("post<T>(endpoint: string, body: unknown, headers?: HttpHeaders): Observable<T>");
    expect(service).toContain("put<T>(endpoint: string, body: unknown, headers?: HttpHeaders): Observable<T>");
    expect(service).toContain("patch<T>(endpoint: string, body: unknown, headers?: HttpHeaders): Observable<T>");
    expect(service).toContain("delete<T>(endpoint: string, headers?: HttpHeaders): Observable<T>");
  });

  test("generates mapping methods for nested models", () => {
    const service = generateService(nestedModels, {
      modelPrefix: "I",
      angularVersion: "21",
      injectionStyle: "inject",
      serviceUseSignals: false,
      serviceErrorHandling: "catchError",
      serviceDependencies: ["mappingService"]
    });

    expect(service).toContain("mapUser(source: unknown): IUserDto");
    expect(service).toContain("mapAddress(source: unknown): IAddressDto");
    expect(service).toContain("mapRole(source: unknown): IRoleDto");
    expect(service).toContain("address: value['address'] == null ? null : this.mapAddress(value['address'])");
    expect(service).toContain("roles: Array.isArray(value['roles']) ? value['roles'].map((item) => this.mapRole(item)) : []");
    expect(service).toContain(
      "roleMap: Object.fromEntries(Object.entries(value['roleMap'] as Record<string, unknown>).map(([key, entryValue]) => [String(key), this.mapRole(entryValue)]))"
    );
    expect(service).toContain(
      "history: Array.isArray(value['history']) ? value['history'].map((item) => this.mapAddress(item)) : []"
    );
    expect(service).toContain("mapPagedResultOfRole(source: unknown): PagedResult<IRoleDto>");
    expect(service).toContain("page: value['page'] == null ? null : this.mapPagedResultOfRole(value['page'])");
    expect(service).toContain("items: Array.isArray(value['items']) ? value['items'].map((item) => this.mapRole(item)) : []");
    expect(service).toContain("data: value['data'] == null ? null : this.mapRole(value['data'])");
    expect(service).toContain("map((items) => this.mapper.mapUserArray(items))");
  });
});
