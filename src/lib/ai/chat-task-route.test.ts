import { beforeEach, expect, it, vi } from "vitest";
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("../../app/api/match-ai/route", () => ({ POST: vi.fn() }));
import { POST as answer } from "../../app/api/match-ai/route";
const id = "12345678-1234-1234-1234-123456789abc";
const req = (action: string, body?: string, origin = "http://127.0.0.1:3000") => new Request("http://localhost:3000/api/match-ai/task", { method: "POST", headers: { host: "127.0.0.1:3000", origin, "content-type": "application/json", "x-chat-request": id, "x-chat-action": action }, body });
beforeEach(() => { vi.resetModules(); vi.mocked(answer).mockReset(); });
it("deduplicates starts, detaches from the polling connection and returns the result", async () => {
  vi.mocked(answer).mockResolvedValue(Response.json({ answer: "ready" }));
  const { POST } = await import("../../app/api/match-ai/task/route");
  expect((await POST(req("start", "{}"))).status).toBe(202);
  await vi.waitFor(() => expect(answer).toHaveBeenCalledTimes(1));
  const completed = await POST(req("start", "{}")); expect(completed.status).toBe(200); expect(answer).toHaveBeenCalledTimes(1);
  expect(await (await POST(req("poll"))).json()).toEqual({ answer: "ready" });
});
it("keeps the local-origin and body-size boundaries on task requests", async () => {
  const { POST } = await import("../../app/api/match-ai/task/route");
  expect((await POST(req("poll", undefined, "https://evil.example"))).status).toBe(403);
  expect((await POST(req("start", "a".repeat(65537)))).status).toBe(413);
  expect((await POST(req("poll"))).status).toBe(410); expect(answer).not.toHaveBeenCalled();
});
