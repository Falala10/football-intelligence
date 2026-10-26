import type { CommentaryResult } from "../commentary-model";
const record = (v: unknown): Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const integer = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;

export function mapFotMobCommentary(raw: unknown, matchId: string): CommentaryResult {
  const r = record(raw);
  if (String(r.matchId) !== matchId) return { status: "unavailable" };
  if (r.state === "none") return { status: "none" };
  if (r.state !== "ok" || !Array.isArray(r.items) || (r.source !== "human" && r.source !== "auto") || typeof r.fetchedAtUtc !== "string" || Number.isNaN(Date.parse(r.fetchedAtUtc))) return { status: "unavailable" };
  const items = r.items.map(record).filter((i) => typeof i.text === "string" && i.text.trim()).map((i, index) => ({
    id: `${matchId}:${typeof i.id === "string" ? i.id : index}:${index}`,
    minute: integer(i.minute) ? `${i.minute}${integer(i.added) && i.added > 0 ? `+${i.added}` : ""}’` : null,
    text: i.text as string,
  }));
  if (r.items.length > 0 && items.length === 0) return { status: "unavailable" };
  return { status: "ok", data: { source: r.source === "human" ? "human" : "automatic", fetchedAtUtc: r.fetchedAtUtc, items } };
}
