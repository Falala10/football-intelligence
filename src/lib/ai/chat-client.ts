export class ChatRequestError extends Error {
  constructor(public code: string, message: string) { super(message); }
}
const wait = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal.aborted) { reject(signal.reason); return; }
  const onAbort = () => { clearTimeout(timer); reject(signal.reason); };
  const timer = setTimeout(() => { signal.removeEventListener("abort", onAbort); resolve(); }, ms);
  signal.addEventListener("abort", onAbort, { once: true });
});
/** Short requests can reconnect to one task without repeating its AI call. */
export async function sendChatTask(body: string, signal: AbortSignal, id: string, fetcher: typeof fetch = fetch) {
  let action = "start", failures = 0;
  const headers = (value: string) => ({ "Content-Type": "application/json", "x-chat-request": id, "x-chat-action": value });
  const cancel = () => { void fetcher("/api/match-ai/task", { method: "POST", headers: headers("cancel"), keepalive: true }).catch(() => {}); };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    while (true) {
      signal.throwIfAborted(); let response: Response;
      try {
        response = await fetcher("/api/match-ai/task", { method: "POST", headers: headers(action), ...(action === "start" ? { body } : {}), signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]) });
      } catch {
        signal.throwIfAborted();
        if (++failures > 3) { cancel(); throw new ChatRequestError("connection", "I couldn't reconnect to the local server. Your question is saved—check the website terminal, then send again."); }
        await wait(1000, signal); continue;
      }
      let data;
      try { data = await response.json(); if (!data || typeof data !== "object") throw new Error("Invalid JSON body"); }
      catch {
        signal.throwIfAborted();
        if (++failures > 3) { cancel(); throw new ChatRequestError("invalid_response", "The server returned an unreadable reply. Your question is saved—send again."); }
        await wait(1000, signal); continue;
      }
      if (response.status === 202 && data.pending === true) { action = "poll"; failures = 0; await wait(1500, signal); continue; }
      if (!response.ok) throw new ChatRequestError(typeof data.code === "string" ? data.code : "server", typeof data.message === "string" ? data.message : "The server couldn't answer just now. Your question is saved—try again.");
      if (!data.answer || !Array.isArray(data.answer.claims) || !data.answer.claims.every((c: unknown) => c !== null && typeof c === "object" && typeof (c as { text?: unknown }).text === "string") || !Array.isArray(data.answer.limitations) || !data.answer.limitations.every((v: unknown) => typeof v === "string")) throw new ChatRequestError("invalid_response", "The server returned an incomplete reply. Your question is saved—send again.");
      return data;
    }
  } finally { signal.removeEventListener("abort", cancel); }
}
