import { describe, expect, test } from "vitest";
import { convertInput } from "@/application/engine";

describe("TypeScript generator", () => {
  test("prepends an Angular compatibility banner", () => {
    const output = convertInput({
      sourceType: "json",
      input: '{ "id": "1", "displayName": "Ada" }',
      rootModelName: "UserDto",
      config: {
        angularVersion: "19",
        enableContracts: true,
        enableServices: false,
        enableMocks: false
      }
    });

    expect(output.typescript).toContain("// Target: Angular 19 (19.2.x)");
    expect(output.typescript).toContain("// Compatible TypeScript: >=5.5.0 <5.9.0");
    expect(output.typescript).toContain("export interface IUserDto");
  });
});
