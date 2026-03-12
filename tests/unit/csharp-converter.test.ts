import { describe, expect, test } from "vitest";
import { convertInput } from "@/application/engine";

describe("C# conversion", () => {
  test("maps nullable, list and DateTime to idiomatic TypeScript", () => {
    const input = `
      public class UserDto
      {
          public Guid Id { get; set; }
          public string? DisplayName { get; set; }
          public DateTime? BirthDate { get; set; }
          public List<string> Roles { get; set; }
      }
    `;

    const result = convertInput({
      sourceType: "csharp",
      input,
      config: {
        modelPrefix: "I",
        tsOutputKind: "interface",
        dateMapping: "Date"
      }
    });

    expect(result.typescript).toContain("export interface IUserDto");
    expect(result.typescript).toContain("id: string;");
    expect(result.typescript).toContain("displayName: string | null;");
    expect(result.typescript).toContain("birthDate: Date | null;");
    expect(result.typescript).toContain("roles: string[];");
  });
});
