import type { ChatMessage } from "../ai/conversation";
import type { MatchEvidence } from "../ai/model";
import type { Team } from "../matches/model";
import { barcelonaHighLineReports } from "./catalog";
const normal = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const topic = /\b(high[ -]?line|offside|press(?:ing)?|defensive line|tactic(?:s|al)?)\b/;
const barca = /\b(barca|barcelona|fcb|flick)\b/;
/** Retrieve reviewed sources by team/topic, never by a client-supplied URL or assistant claim. */
export function getFootballReporting(question: string, history: ChatMessage[], teams: Team[], nowUtc: string): MatchEvidence[] {
  if (!teams.some(t => t.id === "fotmob:8634") || !Number.isFinite(Date.parse(nowUtc))) return [];
  const q = normal(question);
  const explicitOther = teams.some(t => t.id !== "fotmob:8634" && (q.includes(normal(t.name)) || (t.id === "fotmob:8633" && /\bmadrid\b/.test(q))));
  if (explicitOther && !barca.test(q)) return [];
  const prior = [...history].reverse().find(m => m.role === "user" && topic.test(normal(m.text)));
  const inherited = prior ? normal(prior.text) : "";
  const focusedFollowup = /\b(when|why|how|what did|what went|against|opponent|start|begin|since|that|they|their|it|work|risk|now|season|same)\b/.test(q);
  const aboutBarca = barca.test(q) || (!explicitOther && focusedFollowup && barca.test(inherited));
  if (!aboutBarca || !(topic.test(q) || focusedFollowup && topic.test(inherited))) return [];
  return barcelonaHighLineReports.filter(r => Date.parse(`${r.published}T00:00:00Z`) <= Date.parse(nowUtc)).map(r => ({
    id: r.id, kind: "football-reporting", title: r.title, href: r.href, asOfUtc: "2026-10-26T00:00:00Z",
    text: `Reviewed historical reporting. Team: Barcelona (fotmob:8634). Publication date: ${r.published}. Scope: ${r.period}. Reviewed 2026-10-26; a curated paraphrase, not a fresh news search. ${r.notes}`,
  }));
}
