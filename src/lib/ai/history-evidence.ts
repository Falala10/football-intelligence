import type { LeagueSeason } from "../competitions/model";
import type { Team } from "../matches/model";
import type { MatchEvidence } from "./model";
import { completedFixtures, formRecord } from "../teams/form";
import { seasonStart } from "../teams/seasons";
export function buildHistoricalEvidence(league: LeagueSeason, team: Team, nowUtc: string, compact = false): MatchEvidence | null {
  const standing = league.tables?.flatMap(t => t.rows).find(r => r.team.id === team.id);
  if (!standing || !team.id || !league.season) return null;
  const year = seasonStart(league.season)!;
  const all = (league.matches ?? []).map(match => ({ match, competitionId: league.competition.id, competition: league.competition.name, friendly: false }));
  const fixtures = completedFixtures(all, team.id, nowUtc);
  const dateMismatch = fixtures.some(f => { const y = new Date(f.match.kickoffUtc!).getUTCFullYear(); return y < year || y > year + (league.season!.includes("/") ? 1 : 0); });
  const r = formRecord(fixtures, team.id);
  const consistent = !dateMismatch && standing.played !== null && standing.played > 0 && standing.played === r.played && standing.wins === r.wins && standing.draws === r.draws && standing.losses === r.losses && standing.goalDifference === r.goalsFor - r.goalsAgainst;
  const rate = (n: number, d: number) => Number((n / d).toFixed(2));
  return { id: `history-${team.id.slice(7)}-${league.competition.id.slice(7)}-${league.season.replace("/", "-")}`, kind: "team-history", title: `${team.name} · ${league.competition.name} ${league.season}`, href: `https://www.fotmob.com/leagues/${league.competition.id.slice(7)}/overview?season=${encodeURIComponent(league.season)}`, asOfUtc: league.fetchedAtUtc,
    text: `HISTORICAL LEAGUE SEASON: ${league.season}. Team: ${team.name} (${team.id}). Competition: ${league.competition.name} (${league.competition.id}). Scope: league only, not cups or all competitions. Table entry: position ${standing.position ?? "unknown"}, played ${standing.played ?? "unknown"}, wins ${standing.wins ?? "unknown"}, draws ${standing.draws ?? "unknown"}, losses ${standing.losses ?? "unknown"}, points ${standing.points ?? "unknown"}, goal difference ${standing.goalDifference ?? "unknown"}. ${standing.points !== null && standing.played ? `Calculated table points per game: ${rate(standing.points, standing.played)}.` : ""} ${consistent ? `Validated fixture/table record: ${r.played} played, ${r.wins} wins, ${r.draws} draws, ${r.losses} losses; goals for ${r.goalsFor}, against ${r.goalsAgainst}; goals scored per game ${rate(r.goalsFor, r.played)}, conceded per game ${rate(r.goalsAgainst, r.played)}. ${compact ? "" : `Latest five league results, newest first: ${fixtures.slice(0, 5).map(f => `${f.match.kickoffUtc!.slice(0,10)} ${f.match.home.name} ${f.match.score!.home}–${f.match.score!.away} ${f.match.away.name}`).join("; ")}.`} ` : "Fixture coverage disagrees with the table, is missing, or includes dates outside this season. Use table figures only; historical goals totals/rates and match examples are withheld."} This is the returned historical table, not proof that a competition's full schedule finished. Avoid claiming a title unless position and completed-season context establish it. Historical xG, player totals, coaches, transfers, injuries, tactics and cup outcomes are not loaded. Comparing an unfinished current season against this one requires per-game rates; do not compare total points/goals as equal opportunity.` };
}
