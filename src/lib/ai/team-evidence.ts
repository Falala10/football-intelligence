import type { TeamContext } from "../teams/service";
import type { TeamFixture, FormRecord } from "../teams/model";
import type { Match } from "../matches/model";
import { completedFixtures, formRecord, resultLabel } from "../teams/form";
import type { MatchEvidence } from "./model";
const tally = (r: FormRecord) => `${r.played} played, ${r.wins} wins, ${r.draws} draws, ${r.losses} losses, goals for ${r.goalsFor}, goals against ${r.goalsAgainst}`;
function games(fixtures: TeamFixture[], teamId: string) {
  return fixtures.map(f => { const m = f.match; return `${m.kickoffUtc!.slice(0, 10)} | ${f.competition} | ${m.home.name} ${m.score!.home}–${m.score!.away} ${m.away.name} | ${resultLabel(f, teamId)} | match ID ${m.id}`; }).join("\n");
}
export function buildTeamEvidence(contexts: (TeamContext | null)[], anchor: Match, nowUtc: string): { evidence: MatchEvidence[]; limitations: string[] } {
  const evidence: MatchEvidence[] = [], limitations: string[] = [];
  for (const [index, c] of contexts.entries()) {
    if (!c) { limitations.push(`Team history could not load for ${index === 0 ? anchor.home.name : anchor.away.name}.`); continue; }
    const t = c.overview, scope = `team-context-${t.id.slice(7)}`, href = `https://www.fotmob.com/teams/${t.id.slice(7)}/overview`;
    const recent = completedFixtures(t.fixtures, t.id, nowUtc), five = recent.slice(0, 5);
    const before = anchor.kickoffUtc ? completedFixtures(t.fixtures, t.id, anchor.kickoffUtc).filter(f => f.match.id !== anchor.id).slice(0, 5) : [];
    evidence.push({ id: `${scope}-recent`, kind: "team-history", title: `${t.name} recent competitive games`, href, asOfUtc: t.fetchedAtUtc,
      text: `Team identity: ${t.name} (${t.id}). ${t.id === "fotmob:8634" ? "Aliases: Barça, Barca, FCB." : ""} Current team fixture feed: ${t.season ?? "season unknown"}. Latest completed competitive games as of ${nowUtc}; friendlies, live, scheduled, missing-score and awarded games are excluded. Latest ${five.length}: ${tally(formRecord(five, t.id))}. Newest first:\n${games(recent.slice(0, 10), t.id)}\nBefore the viewed match (${anchor.id}, kickoff ${anchor.kickoffUtc ?? "unknown"}), last ${before.length}: ${tally(formRecord(before, t.id))}. Newest first:\n${games(before, t.id)}\nScores only: these results do not explain tactical causes, xG, injuries or player performances in the other games. A drawn score after extra time remains a draw in this goals-based record; a shootout outcome is not inferred. These are the returned fixtures, not proof of a complete career history.` });
    if (!c.league) { limitations.push(`${t.name}'s league season data could not load.`); continue; }
    const league = c.league;
    const fixtures: TeamFixture[] = (league.matches ?? []).map(match => ({ match, competitionId: league.competition.id, competition: league.competition.name, friendly: false }));
    const seasonGames = completedFixtures(fixtures, t.id, nowUtc), lastFive = seasonGames.slice(0, 5), record = formRecord(seasonGames, t.id);
    const standing = league.tables?.flatMap(table => table.rows).find(row => row.team.id === t.id);
    const mismatch = standing && (standing.played !== record.played || standing.wins !== record.wins || standing.draws !== record.draws || standing.losses !== record.losses);
    evidence.push({ id: `${scope}-season`, kind: "team-history", title: `${t.name} · ${league.competition.name} ${league.season ?? "season unknown"}`, href: `https://www.fotmob.com/leagues/${league.competition.id.slice(7)}/overview`, asOfUtc: league.fetchedAtUtc,
      text: `Team: ${t.name} (${t.id}). Current league: ${league.competition.name}. Explicit season: ${league.season ?? "unknown"}; this is not a past-season comparison. Current table entry: ${standing ? `position ${standing.position ?? "unknown"}, played ${standing.played ?? "unknown"}, wins ${standing.wins ?? "unknown"}, draws ${standing.draws ?? "unknown"}, losses ${standing.losses ?? "unknown"}, points ${standing.points ?? "unknown"}, goal difference ${standing.goalDifference ?? "unknown"}` : "not provided"}. ${standing?.points !== null && standing?.points !== undefined && standing.played ? `Calculated table points per game ${Number((standing.points / standing.played).toFixed(2))}.` : ""} Computed from ${record.played} completed, valid scored fixtures in the returned league feed: ${tally(record)}. ${record.played ? `Goals per game ${Number((record.goalsFor / record.played).toFixed(2))}; goals conceded per game ${Number((record.goalsAgainst / record.played).toFixed(2))}.` : ""} ${mismatch ? "WARNING: fixture tally differs from the table; treat computed figures as a partial/inconsistent subset, not complete season totals." : "Table/fixture consistency must not imply all advanced statistics are covered."}\nLatest ${lastFive.length} league games: ${tally(formRecord(lastFive, t.id))}.\n${games(lastFive, t.id)}\nNo season xG trends or detailed performance data for these other matches is loaded.` });
    if (mismatch) limitations.push(`${t.name}: returned league fixtures disagree with the table; do not present computed fixture totals as complete season figures.`);
  }
  return { evidence, limitations };
}
