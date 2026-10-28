import type { ChatMessage } from "../ai/conversation";
import type { MatchDetail } from "../matches/detail-model";
const competitions: [RegExp, string][] = [[/\b(efl(?: cup)?|carabao|league cup)\b/i, "133"], [/\bfa cup\b/i, "132"], [/\bchampions league\b/i, "42"], [/\b(?:la\s?liga)\b/i, "87"], [/\bpremier league\b/i, "47"], [/\bserie a\b/i, "55"], [/\bbundesliga\b/i, "54"], [/\bligue 1\b/i, "53"], [/\b(?:mls|major league soccer)\b/i, "130"], [/\b(?:supercopa(?: de espa[nñ]a)?|spanish super cup)\b/i, "139"], [/\bdfb[ -]?pokal\b/i, "209"]];
const cue = /\b(tournament|entire competition|whole competition|cup|carabao|efl|bracket|the final|final date|finalists?|semi.?finals?|quarter.?finals?|teams (?:are )?(?:left|remaining)|remaining teams|round of 16|route to|road to|path to|draw|next round)\b/i;
export function isTournamentQuestion(question: string, history: ChatMessage[] = []): boolean {
  if (/\b(transfers?|rumou?rs?|ballon|balon|odds|bookmakers?)\b/i.test(question) || /^(?:what is|explain) (?:a |the )?(?:knockout |football )?tournament\s*[?.!]*$/i.test(question)) return false;
  if (/\b(this match|this game|came off|substitution|first goal|second goal)\b/i.test(question) && !/\b(entire|whole|tournament|competition|bracket|finalists?|route to|road to|path to)\b/i.test(question)) return false;
  if (cue.test(question) || competitions.some(([pattern]) => pattern.test(question)) || /\b(standings|league table|title race|relegation|promotion|qualification|playoffs?|play-offs|competition format|league format)\b/i.test(question)) return true;
  const prior = [...history].reverse().find(m => m.role === "user");
  return !!prior && isTournamentQuestion(prior.text) && /^(?:what about|who else|why (?:them|those)|when is (?:it|that)|can (?:they|those)|could (?:they|those)|and |so )/i.test(question.trim());
}
export function tournamentId(question: string, history: ChatMessage[], detail: MatchDetail | null): string | null {
  const explicit = competitions.find(([pattern]) => pattern.test(question)); if (explicit) return explicit[1];
  if (detail?.competitionName && question.toLowerCase().includes(detail.competitionName.toLowerCase())) return detail.competitionId?.replace(/^fotmob:/, "") ?? null;
  // A different explicitly named competition must not silently become the viewed EFL Cup.
  if (/\b(world cup|europa league|copa|coppa|super cup|conference league|eredivisie|primeira liga)\b/i.test(question)) return null;
  const prior = [...history].reverse().find(m => m.role === "user");
  const contextual = prior && competitions.find(([pattern]) => pattern.test(prior.text)); if (contextual) return contextual[1];
  const id = detail?.competitionId?.replace(/^fotmob:/, "");
  // The provider-validated parent competition is sufficient for generic fixture context.
  // Rule-specific progression remains conservative in the tournament mapper.
  return id && /^[1-9]\d{0,11}$/.test(id) ? id : null;
}
