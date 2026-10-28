/** Process-local prototype guard; no user text or credentials are retained. */
export class RequestFailure extends Error {
  constructor(public code: "busy" | "rate_limit" | "timeout" | "cancelled") { super(code); }
}
export function createRequestGate({ timeoutMs = 80000, limit = 8, windowMs = 60000 } = {}) {
  let active: symbol | null = null;
  let recent: number[] = [];
  return async function run<T>(parent: AbortSignal, work: (signal: AbortSignal) => Promise<T>): Promise<T> {
    if (parent.aborted) throw new RequestFailure("cancelled");
    const now = Date.now(); recent = recent.filter(t => now - t < windowMs);
    if (active) throw new RequestFailure("busy");
    if (recent.length >= limit) throw new RequestFailure("rate_limit");
    const token = Symbol(); active = token; recent.push(now);
    const controller = new AbortController();
    let rejectStop: (e: RequestFailure) => void = () => {};
    const stopped = new Promise<never>((_, reject) => { rejectStop = reject; });
    const stop = (code: "timeout" | "cancelled") => {
      const error = new RequestFailure(code);
      controller.abort(error); rejectStop(error);
    };
    const cancel = () => stop("cancelled");
    parent.addEventListener("abort", cancel, { once: true });
    const timer = setTimeout(() => stop("timeout"), timeoutMs);
    try {
      // Race bounds the whole request, including providers that ignore cancellation.
      return await Promise.race([Promise.resolve().then(() => { controller.signal.throwIfAborted(); return work(controller.signal); }), stopped]);
    } finally {
      clearTimeout(timer); parent.removeEventListener("abort", cancel);
      // A late completion must never release a newer request's lock.
      if (active === token) active = null;
    }
  };
}
