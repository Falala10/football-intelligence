import { afterEach, expect, it, vi } from "vitest";
import { createChatTasks } from "./chat-tasks";
afterEach(() => vi.useRealTimers());
it("reconnects to the same work and cached response without another generation", async () => {
  const tasks = createChatTasks(); let finish!: (r: Response) => void;
  const work = vi.fn(() => new Promise<Response>(r => { finish = r; }));
  const started = tasks.start("local:id", "question", work); await Promise.resolve();
  expect(tasks.start("local:id", "question", work).response.status).toBe(202); expect(work).toHaveBeenCalledTimes(1);
  finish(Response.json({ answer: "ready" })); await started.done;
  expect(await tasks.poll("local:id").json()).toEqual({ answer: "ready" });
  expect(await tasks.start("local:id", "question", work).response.json()).toEqual({ answer: "ready" });
  expect(tasks.start("local:id", "changed", work).response.status).toBe(409);
  expect(tasks.poll("another-origin:id").status).toBe(410); expect(work).toHaveBeenCalledTimes(1);
});
it("cancels work and ignores a late answer", async () => {
  const tasks = createChatTasks(); let finish!: (r: Response) => void; let signal!: AbortSignal;
  const started = tasks.start("id", "body", s => { signal = s; return new Promise(r => { finish = r; }); }); await Promise.resolve();
  tasks.cancel("id"); expect(signal.aborted).toBe(true); finish(Response.json({ wrong: "late" })); await started.done;
  expect(tasks.poll("id").status).toBe(499);
});
it("bounds retention/capacity and returns clear failures for lost work", async () => {
  vi.useFakeTimers(); const tasks = createChatTasks({ capacity: 1, ttlMs: 100 });
  const first = tasks.start("first", "body", async () => Response.json({ ready: true })); await first.done;
  expect(tasks.start("second", "body", async () => Response.json({})).response.status).toBe(429);
  await vi.advanceTimersByTimeAsync(101); expect(tasks.poll("first").status).toBe(410);
  const next = tasks.start("second", "body", async () => { throw new Error("private error"); }); await next.done;
  expect(tasks.poll("second").status).toBe(502); expect(await tasks.poll("second").text()).not.toContain("private error");
});
