import type { LeagueSection } from "./fotmob/types";

export type NavLeague = { id: string; name: string };

/** Leagues in the sidebar, in display order. Ids are FotMob league ids. */
export const NAV_LEAGUES: readonly NavLeague[] = [
  { id: "47", name: "Premier League" },
  { id: "87", name: "LaLiga" },
  { id: "55", name: "Serie A" },
  { id: "54", name: "Bundesliga" },
  { id: "53", name: "Ligue 1" },
  { id: "42", name: "Champions League" },
  { id: "130", name: "MLS" },
];

export function isNavLeagueId(value: unknown): value is string {
  return typeof value === "string" && NAV_LEAGUES.some((league) => league.id === value);
}

function rank(leagueId: string): number {
  const index = NAV_LEAGUES.findIndex((league) => league.id === leagueId);
  return index === -1 ? NAV_LEAGUES.length : index;
}

const isLive = (state: string) => state === "live" || state === "halftime";

/**
 * Choose which league sections to show. Optionally limit to one league and/or live matches, and put
 * the sidebar leagues first. Sections outside the sidebar keep FotMob's order after them.
 */
export function selectLeagues(
  leagues: readonly LeagueSection[],
  options: { leagueId?: string; liveOnly?: boolean } = {},
): LeagueSection[] {
  const { leagueId, liveOnly = false } = options;
  const selected: LeagueSection[] = [];
  for (const league of leagues) {
    if (leagueId && league.leagueId !== leagueId) continue;
    const matches = liveOnly ? league.matches.filter((match) => isLive(match.state)) : league.matches;
    if (matches.length > 0) selected.push({ ...league, matches });
  }
  // Array.prototype.sort is stable, so equal ranks keep their original order.
  return selected.sort((a, b) => rank(a.leagueId) - rank(b.leagueId));
}
