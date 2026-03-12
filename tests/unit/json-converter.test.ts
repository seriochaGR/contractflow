import { describe, expect, test } from "vitest";
import { convertInput } from "@/application/engine";

describe("JSON conversion", () => {
  test("infers nullable, arrays and date strings", () => {
    const input = JSON.stringify({
      id: "abc",
      displayName: null,
      createdAt: "2026-02-01T12:30:00Z",
      tags: ["alpha", "beta"]
    });

    const result = convertInput({
      sourceType: "json",
      input,
      rootModelName: "UserDto",
      config: {
        modelPrefix: "I",
        dateMapping: "Date",
        tsOutputKind: "interface"
      }
    });

    expect(result.typescript).toContain("export interface IUserDto");
    expect(result.typescript).toContain("displayName: unknown | null;");
    expect(result.typescript).toContain("createdAt: Date;");
    expect(result.typescript).toContain("tags: string[];");
  });
});
