/** Bounded, in-memory local tasks. Reconnecting with an existing ID never starts a second answer. */
export function createChatTasks({ ttlMs = 180000, capacity = 32 } = {}) {
  type Task = { fingerprint: string; controller: AbortController; result?: Response; done: Promise<void>; finished?: number };
  const tasks = new Map<string, Task>();
  const failure = (code: string, message: string, status: number) => Response.json({ code, message }, { status });
  function prune() {
    for (const [key, task] of tasks) if (task.finished !== undefined && Date.now() - task.finished > ttlMs) tasks.delete(key);
  }
  return {
    start(key: string, fingerprint: string, work: (signal: AbortSignal) => Promise<Response>) {
      prune(); const existing = tasks.get(key);
      if (existing) return { response: existing.fingerprint === fingerprint ? existing.result?.clone() ?? Response.json({ pending: true }, { status: 202 }) : failure("conflict", "This request changed. Send it again as a new question.", 409), done: existing.done };
      if (tasks.size >= capacity) return { response: failure("busy", "The chat is busy. Try again in a moment.", 429), done: Promise.resolve() };
      const controller = new AbortController();
      const task: Task = { fingerprint, controller, done: Promise.resolve() };
      tasks.set(key, task);
      task.done = Promise.resolve().then(() => { controller.signal.throwIfAborted(); return work(controller.signal); }).then(response => {
        if (!task.result) task.result = response;
      }).catch(() => { if (!task.result) task.result = failure("unavailable", "The server couldn't finish this answer. Your question is saved—try again.", 502); }).finally(() => {
        task.finished = Date.now();
        const expiry = setTimeout(() => { if (tasks.get(key) === task) tasks.delete(key); }, ttlMs);
        expiry.unref?.();
      });
      return { response: Response.json({ pending: true }, { status: 202 }), done: task.done };
    },
    poll(key: string) {
      prune(); const task = tasks.get(key);
      return task ? task.result?.clone() ?? Response.json({ pending: true }, { status: 202 }) : failure("request_lost", "The server restarted or this request expired. Your question is saved—send it again.", 410);
    },
    cancel(key: string) {
      const task = tasks.get(key);
      if (task && !task.result) { task.result = failure("cancelled", "Stopped. You can edit your question or send it again.", 499); task.controller.abort(); }
      return Response.json({ stopped: true });
    },
  };
}
