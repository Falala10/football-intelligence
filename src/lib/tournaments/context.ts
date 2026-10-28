import { searchCompetition } from "./resolve";
import { buildMatchEvidence } from "../ai/evidence";
import "server-only";
import { getTournament } from "./service";
import { tournamentId } from "./intent";
import { tournamentEvidence } from "./evidence";
import { getLeagueSeason } from "../competitions/service";
import type { MatchDetail } from "../matches/detail-model";
import type { ChatMessage } from "../ai/conversation";
export async function loadTournamentContext(question: string, history: ChatMessage[], detail: MatchDetail | null, signal?: AbortSignal) {
  const base = detail ? buildMatchEvidence(detail, null, { status: "none" }).evidence.filter(e => e.id === "match") : [];
  const id = tournamentId(question, [], null) ?? await searchCompetition(question) ?? tournamentId(question, history, detail);
  if (!id) return { fallbackToResearch: true, evidence: base, limitations: ["The viewed match identity is attached as background only. The requested competition has no connected full fixture context here; use general football knowledge/research for that topic without substituting the viewed competition or claiming its identity is missing."] };
  signal?.throwIfAborted();
  try {
    const data = await getTournament(id); signal?.throwIfAborted();
    const requested = /\b(20\d{2})[-/](20\d{2}|\d{2})\b/.exec(question);
    if (requested && `${requested[1]}/${requested[2].length === 2 ? `20${requested[2]}` : requested[2]}` !== data.season) return { fallbackToResearch: true, evidence: base, limitations: [`This competition snapshot covers ${data.season}, not the requested historical season. Do not substitute the current field or dates.`] };
    let league = null;
    if (id === "133" && /favourit|favorit|contender|strong|finalist|who.*win|predict|chance|likely|compare/i.test(question)) {
      try { const result = await getLeagueSeason("fotmob:47"); if (result.status === "ok") league = result.data; } catch { /* Cup facts remain usable without league context. */ }
    }
    signal?.throwIfAborted();
    return { fallbackToResearch: false, evidence: [...base, ...tournamentEvidence(data, league)], limitations: [], data };
  } catch (error) {
    if (signal?.aborted) throw error;
    return { fallbackToResearch: false, evidence: base, limitations: ["The competition-wide fixture data could not be loaded. The viewed match identity, competition and round remain valid where attached; answer those facts and only qualify the unavailable tournament-wide detail. Do not invent remaining teams, a bracket or a final date."] };
  }
}
