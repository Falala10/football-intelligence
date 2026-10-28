import { XMLParser } from "fast-xml-parser";
import type { ChatMessage } from "./conversation";
export function isStatementQuestion(question: string) {
  return /\b(?:what (?:did|has|does)|anything)\b.*\b(?:say|said|saying|comments?)\b|\b(?:press conference|post.match comments|manager(?:'s)? reaction)\b/i.test(question);
}
export function statementSearchTerm(question: string, history: ChatMessage[] = [], lookupQuery?: string): string {
  const named = /\bwhat (?:did|has|does)\s+(.{2,65}?)\s+(?:say|said|think)\b/i.exec(question)?.[1];
  if (named && !/^(he|she|they|the manager|the coach)$/i.test(named.trim())) return `${named.trim()} football comments`;
  for (const prior of [...history].reverse().filter(m => m.role === "user")) {
    const person = /\bwhat (?:did|has|does)\s+(.{2,65}?)\s+(?:say|said|think)\b/i.exec(prior.text)?.[1];
    if (person && !/^(he|she|they|the manager|the coach)$/i.test(person.trim())) return `${person.trim()} football comments`;
  }
  return (lookupQuery || [...history.filter(m => m.role === "user").slice(-2).map(m => m.text), question].join(" ")).slice(0, 250);
}
const obj = (v: unknown): Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const plain = (v: string) => v.replace(/<[^>]*>/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
/** News search metadata is not a transcript. Never imply the linked article was read. */
export function parseStatementSearch(xml: string, term: string, now: number) {
  const parsed = new XMLParser({ processEntities: false, ignoreAttributes: false }).parse(xml);
  const item = obj(obj(obj(parsed).rss).channel).item;
  const rows = Array.isArray(item) ? item : item ? [item] : [];
  const terms = term.toLowerCase().match(/[\p{L}\p{N}]+/gu)?.filter(t => t.length > 2 && !["football", "comments", "what", "did", "say", "their", "recent", "form", "the", "about"].includes(t)) ?? [];
  return rows.slice(0, 40).flatMap(value => {
    const row = obj(value), date = typeof row.pubDate === "string" ? Date.parse(row.pubDate) : NaN;
    if (typeof row.title !== "string" || typeof row.link !== "string" || !Number.isFinite(date) || date > now + 600000 || now - date > 14 * 86400000) return [];
    let url: URL; try { url = new URL(row.link); } catch { return []; }
    if (url.protocol !== "https:" || url.hostname !== "news.google.com" || !url.pathname.startsWith("/rss/articles/") || url.username || url.password) return [];
    const title = plain(row.title);
    if (!terms.length || !terms.every(term => title.toLowerCase().includes(term))) return [];
    const source = obj(row.source), publisher = typeof source["#text"] === "string" ? plain(source["#text"] as string) : "Publisher identified in headline";
    return [{ id: "", title, url: url.href, publishedAt: new Date(date).toISOString(), reportText: title, text: `Report publication date ${new Date(date).toISOString()} (NOT proof of match/event date). Publisher label: ${publisher}. Google News headline metadata ONLY; full article and press conference transcript have NOT been retrieved. Headline: ${title}. Only a brief quotation explicitly present in this headline may be repeated; do not invent surrounding comments, motives, context or a season-wide position. Do not call the source official based on its label alone.` }];
  });
}
