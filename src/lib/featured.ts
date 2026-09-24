import type { LeagueSection, Match } from "./fotmob/types";
import { NAV_LEAGUES } from "./leagues";

export type Featured = { league: LeagueSection; match: Match; kind: "live" | "next" | "result" };
export type Entry = { league: LeagueSection; match: Match };

const isNav = (leagueId: string) => NAV_LEAGUES.some((league) => league.id === leagueId);
const isLive = (match: Match) => match.state === "live" || match.state === "halftime";

function flatten(leagues: readonly LeagueSection[]): Entry[] {
  return leagues.flatMap((league) => league.matches.map((match) => ({ league, match })));
}

/**
 * The match to feature on the dashboard: a live one if any, otherwise the next kick-off (preferring the
 * sidebar leagues), otherwise a finished match. Pass leagues already ordered with the sidebar leagues first.
 */
export function pickFeaturedMatch(leagues: readonly LeagueSection[]): Featured | null {
  const all = flatten(leagues);

  const live = all.find((entry) => isLive(entry.match));
  if (live) return { ...live, kind: "live" };

  const upcoming = all.filter(({ match }) => match.state === "scheduled" && match.kickoffUtc);
  const preferred = upcoming.filter(({ league }) => isNav(league.leagueId));
  const pool = preferred.length > 0 ? preferred : upcoming;
  const next = [...pool].sort((a, b) => (a.match.kickoffUtc ?? "").localeCompare(b.match.kickoffUtc ?? ""))[0];
  if (next) return { ...next, kind: "next" };

  const finished = all.filter(({ match }) => match.state === "finished");
  const result = finished.find(({ league }) => isNav(league.leagueId)) ?? finished[0];
  return result ? { ...result, kind: "result" } : null;
}

/** Other matches to show beside the featured one: live first, then upcoming, then finished. */
export function pickOtherMatches(leagues: readonly LeagueSection[], featured: Featured | null, limit: number): Entry[] {
  const rank = (match: Match) => (isLive(match) ? 0 : match.state === "scheduled" ? 1 : 2);
  const others = flatten(leagues).filter((entry) => entry.match.matchId !== featured?.match.matchId);
  // Sorting is stable, so matches of equal rank keep the league order they came in.
  return others.sort((a, b) => rank(a.match) - rank(b.match)).slice(0, Math.max(0, limit));
}
