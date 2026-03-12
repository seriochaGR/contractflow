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
      serviceUseSignals: true
    });

    expect(service).toContain("inject(HttpClient)");
    expect(service).toContain("signal<IUserDto[]>([])");
    expect(service).toContain("list(): Observable<IUserDto[]>");
  });

  test("supports constructor injection", () => {
    const service = generateService(models, {
      modelPrefix: "I",
      injectionStyle: "constructor",
      serviceUseSignals: false
    });

    expect(service).toContain("constructor(private readonly http: HttpClient) {}");
    expect(service).not.toContain("signal<");
  });
});
