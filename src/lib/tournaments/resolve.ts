import "server-only";
import { cacheLife } from "next/cache";
import { callFotMobTool } from "../fotmob/mcp";
const obj = (v: unknown): Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const normal = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
/** Only accept an exact competition name occurring in the question, never the first search hit. */
export function competitionSearchId(raw: unknown, question: string): string | null {
  const found = new Set<string>(), p = obj(raw).payload;
  for (const group of Array.isArray(p) ? p : []) for (const value of Array.isArray(obj(group).suggestions) ? obj(group).suggestions as unknown[] : []) {
    const s = obj(value);
    if (s.type === "league" && typeof s.name === "string" && /^[1-9]\d{0,11}$/.test(String(s.id)) && ` ${normal(question)} `.includes(` ${normal(s.name)} `)) found.add(String(s.id));
  }
  return found.size === 1 ? [...found][0] : null;
}
export async function searchCompetition(question: string): Promise<string | null> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 7200 });
  const term = question.match(/\b(?:in|about|for)\s+(?:the\s+)?(.+?)(?:[?!.]|$)/i)?.[1] ?? question;
  try { return competitionSearchId(await callFotMobTool("search_fotmob", { term: term.slice(0, 100), hits: 12, lang: "en" }), question); }
  catch { return null; }
}
