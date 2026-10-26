import type { Match } from "../matches/model";
export function selectLeagueMatches(matches: readonly Match[], limit = 10) {
  const time = (m: Match) => m.kickoffUtc ? Date.parse(m.kickoffUtc) : Infinity;
  return {
    live: matches.filter((m) => m.status === "live" || m.status === "halftime"),
    results: matches.filter((m) => m.status === "finished").sort((a, b) => (b.kickoffUtc ? time(b) : -Infinity) - (a.kickoffUtc ? time(a) : -Infinity)).slice(0, limit),
    upcoming: matches.filter((m) => m.status === "scheduled").sort((a, b) => time(a) - time(b)).slice(0, limit),
  };
}
