import { after } from "next/server";
import { POST as answer } from "../route";
import { createChatTasks } from "../../../../lib/ai/chat-tasks";
import { isLocalSameOrigin } from "../../../../lib/ai/local-origin";
const tasks = createChatTasks();
const fail = (message: string, status: number) => Response.json({ code: "invalid", message }, { status });
export async function POST(request: Request) {
  if (!isLocalSameOrigin(request)) return fail("AI is available only from this local website.", 403);
  const id = request.headers.get("x-chat-request"), action = request.headers.get("x-chat-action");
  if (!id || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)) return fail("Start a new question.", 400);
  const key = `${request.headers.get("origin")}:${id}`;
  let response: Response;
  if (action === "poll") response = tasks.poll(key);
  else if (action === "cancel") response = tasks.cancel(key);
  else if (action === "start") {
    if (!request.headers.get("content-type")?.startsWith("application/json")) return fail("Send a question as JSON.", 415);
    const reader = request.body?.getReader(); if (!reader) return fail("Enter a question.", 400);
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) { const item = await reader.read(); if (item.done) break; size += item.value.length; if (size > 65536) { await reader.cancel(); return fail("This conversation is too long. Start a new chat.", 413); } chunks.push(item.value); }
    } catch { return fail("The request was interrupted. Send it again.", 400); }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const body = new TextDecoder().decode(bytes), headers = new Headers(request.headers);
    const url = new URL("/api/match-ai", request.url);
    // The answer's lifetime belongs to the task, not to a short polling connection.
    const started = tasks.start(key, body, signal => answer(new Request(url, { method: "POST", headers, body, signal })));
    after(() => started.done);
    response = started.response;
  } else return fail("Choose a valid chat action.", 400);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Chat-Request", id);
  return response;
}
