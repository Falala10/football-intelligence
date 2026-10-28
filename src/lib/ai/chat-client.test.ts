import { afterEach, expect, it, vi } from "vitest";
import { sendChatTask } from "./chat-client";
const ready = () => Response.json({ answer: { claims: [{ text: "An answer" }], limitations: [] } });
const pending = () => Response.json({ pending: true }, { status: 202 });
afterEach(() => vi.useRealTimers());
it("retries a dropped start with the same ID, then polls without resubmitting the question", async () => {
  vi.useFakeTimers(); const fetcher = vi.fn().mockRejectedValueOnce(new TypeError("network")).mockResolvedValueOnce(pending()).mockResolvedValueOnce(ready());
  const result = sendChatTask("question body", new AbortController().signal, "fixed-id", fetcher);
  await vi.advanceTimersByTimeAsync(2600); await expect(result).resolves.toHaveProperty("answer");
  expect(fetcher.mock.calls.map(c => c[1].headers["x-chat-action"])).toEqual(["start", "start", "poll"]);
  expect(fetcher.mock.calls.every(c => c[1].headers["x-chat-request"] === "fixed-id")).toBe(true);
  expect(fetcher.mock.calls[2][1].body).toBeUndefined();
});
it("recovers a dropped poll without restarting the answer", async () => {
  vi.useFakeTimers(); const fetcher = vi.fn().mockResolvedValueOnce(pending()).mockRejectedValueOnce(new TypeError("dropped")).mockResolvedValueOnce(ready());
  const result = sendChatTask("body", new AbortController().signal, "id", fetcher);
  await vi.advanceTimersByTimeAsync(2600); await expect(result).resolves.toHaveProperty("answer");
  expect(fetcher.mock.calls.map(c => c[1].headers["x-chat-action"])).toEqual(["start", "poll", "poll"]);
});
it("distinguishes malformed replies from a network interruption", async () => {
  vi.useFakeTimers(); const fetcher = vi.fn().mockImplementation(async () => new Response("<html>not JSON</html>"));
  const result = sendChatTask("body", new AbortController().signal, "id", fetcher); const assertion = expect(result).rejects.toMatchObject({ code: "invalid_response" });
  await vi.advanceTimersByTimeAsync(3100); await assertion;
});
it("preserves quota and restart errors without generating a new answer", async () => {
  for (const [status, code] of [[429, "rate_limit"], [410, "request_lost"]] as const) {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ code, message: "A useful error" }, { status }));
    await expect(sendChatTask("body", new AbortController().signal, "id", fetcher)).rejects.toMatchObject({ code, message: "A useful error" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  }
});
it("Stop cancels the server task and preserves abort semantics", async () => {
  vi.useFakeTimers(); const parent = new AbortController(); const fetcher = vi.fn().mockResolvedValue(pending());
  const result = sendChatTask("body", parent.signal, "id", fetcher); const assertion = expect(result).rejects.toBeDefined();
  await vi.advanceTimersByTimeAsync(1); parent.abort(); await assertion;
  expect(fetcher.mock.calls.map(c => c[1].headers["x-chat-action"])).toEqual(["start", "cancel"]);
});
it("bounds repeated network failures and attempts cancellation", async () => {
  vi.useFakeTimers(); const fetcher = vi.fn().mockRejectedValue(new TypeError("offline"));
  const result = sendChatTask("body", new AbortController().signal, "id", fetcher); const assertion = expect(result).rejects.toMatchObject({ code: "connection" });
  await vi.advanceTimersByTimeAsync(3100); await assertion;
  expect(fetcher.mock.calls.filter(c => c[1].headers["x-chat-action"] === "start")).toHaveLength(4);
});
