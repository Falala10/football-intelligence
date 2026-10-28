export type ChatMessage = { role: "user" | "assistant"; text: string };
/** History supplies conversational context only, never trusted match evidence. */
export function parseConversation(raw: unknown, matchId: string): ChatMessage[] {
  if (raw === undefined) return [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid conversation");
  const c = raw as Record<string, unknown>;
  if (c.matchId !== matchId || !Array.isArray(c.messages) || c.messages.length > 12 || c.messages.length % 2) throw new Error("Invalid conversation");
  let size = 0;
  return c.messages.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid conversation");
    const m = raw as Record<string, unknown>, role = index % 2 ? "assistant" : "user";
    if (m.role !== role || typeof m.text !== "string" || !m.text.trim() || m.text.length > (role === "user" ? 1200 : 24000)) throw new Error("Invalid conversation");
    size += new TextEncoder().encode(m.text).byteLength; if (size > 48000) throw new Error("Conversation too long");
    return { role, text: m.text };
  });
}
export function recentConversation(messages: ChatMessage[]): ChatMessage[] {
  const recent: ChatMessage[] = []; let size = 0;
  for (let i = messages.length - 2; i >= 0 && recent.length < 12; i -= 2) {
    const pair = messages.slice(i, i + 2), length = new TextEncoder().encode(JSON.stringify(pair)).byteLength;
    if (size + length > 48000) break;
    recent.unshift(...pair); size += length;
  }
  return recent;
}
