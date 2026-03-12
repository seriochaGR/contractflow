import { describe, expect, test } from "vitest";
import { POST as convertPost } from "../../app/api/engine/convert/route";
import { POST as allPost } from "../../app/api/engine/all/route";

describe("Engine API endpoints", () => {
  test("POST /api/engine/convert returns TypeScript conversion", async () => {
    const request = new Request("http://localhost/api/engine/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceType: "csharp",
        input: "public class UserDto { public string? Name { get; set; } }"
      })
    });

    const response = await convertPost(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.typescript).toContain("export interface IUserDto");
    expect(payload.typescript).toContain("name: string | null;");
  });

  test("POST /api/engine/all returns all artifacts", async () => {
    const request = new Request("http://localhost/api/engine/all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceType: "json",
        input: JSON.stringify({ id: "1", createdAt: "2026-02-20T00:00:00Z", tags: ["x"] }),
        rootModelName: "RecordDto",
        config: {
          modelPrefix: "I",
          dateMapping: "Date"
        }
      })
    });

    const response = await allPost(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.typescript).toContain("export interface IRecordDto");
    expect(payload.angularService).toContain("list(): Observable<IRecordDto[]>");
    expect(payload.jsonMocks).toContain("\"RecordDto\"");
  });
});
