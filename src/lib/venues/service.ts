import "server-only";
import type { ChatMessage } from "../ai/conversation";
import type { MatchDetail } from "../matches/detail-model";
import { buildMatchEvidence } from "../ai/evidence";
import { searchFootballWeb } from "../ai/research";
import { getTeamOverview } from "../teams/service";
export function isVenueQuestion(question: string, history: ChatMessage[] = []): boolean {
  question = question.replace(/\bpalyed\b/gi, "played").replace(/\bpalying\b/gi, "playing");
  if (/^(?:what is|explain) (?:a |the )?(?:stadium|venue|football ground)\s*[?.!]*$/i.test(question.trim())) return false;
  if (/\b(stadium|venue|home ground)\b/i.test(question) || /\bwhere\b.*\b(?:this match|this game|playing|played|held|taking place)\b/i.test(question)) return true;
  if (!/^(?:why|why not|how come|why is that|what do you mean)\s*[?.!]*$/i.test(question.trim())) return false;
  for (const message of [...history].reverse().filter(m => m.role === "user")) {
    if (/^(?:why|why not|how come|why is that)\s*[?.!]*$/i.test(message.text.trim())) continue;
    return isVenueQuestion(message.text);
  }
  return false;
}
export async function answerVenue(question: string, history: ChatMessage[], detail: MatchDetail, signal?: AbortSignal) {
  const matchEvidence = buildMatchEvidence(detail, null, { status: "none" }).evidence.filter(e => e.id === "match");
  const result = (text: string, evidence = matchEvidence, ids = ["match"]) => ({ model: "venue-facts", answer: { status: "answered" as const, claims: [{ text, evidenceIds: ids, basis: "context" as const }], limitations: [] as string[] }, evidence });
  const why = /^(?:why|why not|how come|why is that)\s*[?.!]*$/i.test(question.trim());
  if (detail.venue.stadium) return result(why ? `Do you mean why the match is being played there, or why the venue wasn't shown earlier? The match listing gives ${detail.venue.stadium}${detail.venue.city ? ` in ${detail.venue.city}` : ""}.` : `The match is at ${detail.venue.stadium}${detail.venue.city ? ` in ${detail.venue.city}` : ""}.`);
  const profile = detail.match.home.id ? await getTeamOverview(detail.match.home.id) : null;
  signal?.throwIfAborted();
  if (!why && process.env.FOOTBALL_RESEARCH_PROVIDER !== "open") {
    try {
      const identity = `${profile?.name ?? detail.match.home.name} vs ${detail.match.away.name}; gender ${profile?.gender ?? "not supplied"}; competition ${detail.competitionName ?? "unknown"}; date ${detail.match.kickoffUtc ?? "unknown"}; match ${detail.match.id}.`;
      const searched = await searchFootballWeb(`Which stadium is this exact fixture being played at? Verify this fixture's venue, not just the club's usual home ground. If no event-specific source confirms it, explicitly say so. ${identity}`, [], signal, identity);
      return { ...searched, evidence: [] };
    } catch (error) { if (signal?.aborted) throw error; }
  }
  const ground = profile?.id === detail.match.home.id ? profile.homeGround : null;
  if (ground && profile) {
    const source = { id: "home-ground", kind: "team-history" as const, title: `${profile.name} · listed home ground`, href: `https://www.fotmob.com/teams/${profile.id.slice(7)}/overview`, asOfUtc: profile.fetchedAtUtc, text: `Verified club identity ${profile.id}, ${profile.name}, gender ${profile.gender ?? "unknown"}. Usual home ground: ${ground.stadium}; city ${ground.city ?? "unknown"}; country ${ground.country ?? "unknown"}. This is a club-profile fact, NOT confirmation of the venue of this particular fixture. The match-specific stadium field is missing.` };
    const place = `${ground.stadium}${ground.city ? ` in ${ground.city}` : ""}`;
    return result(why ? `Because the match listing leaves the stadium blank, and the club's usual ground isn't enough to confirm this game's venue. ${profile.name}'s listed home ground is ${place}, but I couldn't verify the exact match venue from the available sources.` : `${profile.name}'s listed home ground is ${place}. I couldn't independently confirm that this particular match is being played there.`, [...matchEvidence, source], ["match", "home-ground"]);
  }
  return { model: "venue-facts", answer: { status: "insufficient_evidence" as const, claims: [], limitations: [why ? "The match listing doesn't include a stadium, and I couldn't verify an event-specific venue through the connected sources. That doesn't mean the venue is unknown in general." : "I couldn't confirm the stadium for this specific fixture from the match listing or a secondary lookup. I won't assume it's the home team's usual ground."] }, evidence: matchEvidence };
}
