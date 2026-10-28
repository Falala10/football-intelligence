import { afterEach, expect, it, vi } from "vitest";
import { createRequestGate } from "./request-lifecycle";
afterEach(() => vi.useRealTimers());
it("releases after success and failure without swallowing errors", async () => {
  const run = createRequestGate(); const signal = new AbortController().signal;
  await expect(run(signal, async () => { throw new Error("provider"); })).rejects.toThrow("provider");
  await expect(run(signal, async () => "ready")).resolves.toBe("ready");
});
it("bounds an unresponsive provider and accepts another request afterward", async () => {
  vi.useFakeTimers(); const run = createRequestGate({ timeoutMs: 50 });
  const first = run(new AbortController().signal, () => new Promise(() => {}));
  const assertion = expect(first).rejects.toThrow("timeout");
  await vi.advanceTimersByTimeAsync(50); await assertion;
  await expect(run(new AbortController().signal, async () => "ready")).resolves.toBe("ready");
});
it("cancels and propagates abort; late completion cannot unlock a newer request", async () => {
  const run = createRequestGate(); const parent = new AbortController();
  let finish!: (v: string) => void; let child!: AbortSignal;
  const first = run(parent.signal, signal => { child = signal; return new Promise<string>(r => { finish = r; }); });
  await Promise.resolve(); parent.abort(); await expect(first).rejects.toThrow("cancelled"); expect(child.aborted).toBe(true);
  let finishSecond!: (v: string) => void;
  const second = run(new AbortController().signal, () => new Promise<string>(r => { finishSecond = r; }));
  await Promise.resolve(); finish("late"); await Promise.resolve();
  await expect(run(new AbortController().signal, async () => "wrong")).rejects.toThrow("busy");
  finishSecond("done"); await expect(second).resolves.toBe("done");
});
it("distinguishes concurrent requests from per-minute limits and does not charge rejected attempts", async () => {
  vi.useFakeTimers(); const run = createRequestGate({ limit: 1 }); const signal = new AbortController().signal;
  const parent = new AbortController(); const first = run(parent.signal, () => new Promise(() => {}));
  await expect(run(signal, async () => 1)).rejects.toThrow("busy");
  parent.abort(); await expect(first).rejects.toThrow("cancelled");
  await expect(run(signal, async () => 1)).rejects.toThrow("rate_limit");
  await vi.advanceTimersByTimeAsync(60000);
  await expect(run(signal, async () => 2)).resolves.toBe(2);
});
it("does not start work for an already cancelled request", async () => {
  const parent = new AbortController(); parent.abort(); const work = vi.fn();
  await expect(createRequestGate()(parent.signal, work)).rejects.toThrow("cancelled"); expect(work).not.toHaveBeenCalled();
});
