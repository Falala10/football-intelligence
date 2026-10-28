import { expect, it } from "vitest";
import { mapTournament } from "./map";
import { parseEflCalendar } from "./calendar";
import { finalPairConflict } from "./facts";
import { tournamentEvidence } from "./evidence";
const fetched = "2026-10-27T16:00:00Z";
const fixture = (id: number, home: number, away: number, stage = "4", status: Record<string, unknown> = {}) => ({ id, round: stage, home: { id: home, name: `Team ${home}` }, away: { id: away, name: `Team ${away}` }, status: { utcTime: "2026-10-28T20:00:00Z", ...status } });
const wrap = (matches: unknown[], extra: Record<string, unknown> = {}) => ({ payload: { details: { id: 133, name: "EFL Cup", selectedSeason: "2026/2027" }, fixtures: { fixtureInfo: { activeRound: { roundId: "4" } }, allMatches: matches }, ...extra } });
const full = () => Array.from({ length: 8 }, (_, i) => fixture(i + 1, i * 2 + 1, i * 2 + 2));
it("preserves every current tie and validates the complete last-16 field", () => {
  const data = mapTournament(wrap(full()), "133", fetched)!;
  expect(data.remaining).toHaveLength(16); expect(data.stageCoverageComplete).toBe(true); expect(data.activeStageName).toContain("Round of 16");
  expect(data.ties).toHaveLength(8); expect(data.calendar).toBeNull();
  const evidence = tournamentEvidence(data)[0].text;
  expect(evidence).toContain("No later-stage opponents supplied"); expect(evidence).toContain("cannot BOTH");
});
it("removes an explicitly resolved single-leg loser but never chooses a shootout winner from a draw", () => {
  const games = full(); games[0] = fixture(1, 1, 2, "4", { finished: true, scoreStr: "0 - 2" });
  let data = mapTournament(wrap(games), "133", fetched)!;
  expect(data.remaining).toHaveLength(15); expect(data.remaining.some(r => r.team.id === "fotmob:1")).toBe(false);
  expect(data.remaining.find(r => r.team.id === "fotmob:2")?.status).toBe("advanced");
  expect(tournamentEvidence(data)[0].text).toContain("Verified eliminated teams: Team 1");
  games[0] = fixture(1, 1, 2, "4", { finished: true, scoreStr: "1 - 1", reason: { short: "Pen" } });
  data = mapTournament(wrap(games), "133", fetched)!;
  expect(data.stageCoverageComplete).toBe(false); expect(data.remaining.filter(r => r.status === "unresolved")).toHaveLength(2);
});
it("doesn't declare an incomplete, duplicated-team or placeholder field complete", () => {
  expect(mapTournament(wrap(full().slice(1)), "133", fetched)?.stageCoverageComplete).toBe(false);
  const games = full(); games[7] = fixture(8, 1, 16);
  expect(mapTournament(wrap(games), "133", fetched)?.stageCoverageComplete).toBe(false);
  games[7] = fixture(8, 0, 16);
  expect(mapTournament(wrap(games), "133", fetched)?.stageCoverageComplete).toBe(false);
});
it("uses a reported aggregate winner only after both legs finish", () => {
  const games = [fixture(1, 1, 2, "1/2", { finished: true, scoreStr: "0 - 2" }), fixture(2, 2, 1, "1/2")];
  const playoff = { hasDrawOrder: true, rounds: [{ stage: "1/2", matchups: [{ stage: "1/2", bestOf: 2, homeTeamId: 1, awayTeamId: 2, aggregatedWinner: 2, matches: [{ matchId: 1 }, { matchId: 2 }] }] }] };
  const raw = wrap(games, { playoff }); raw.payload.fixtures.fixtureInfo.activeRound.roundId = "1/2";
  expect(mapTournament(raw, "133", fetched)?.ties[0].winnerId).toBeNull();
  games[1] = fixture(2, 2, 1, "1/2", { finished: true, scoreStr: "0 - 1" });
  expect(mapTournament(raw, "133", fetched)?.ties[0].winnerId).toBe("fotmob:2");
  expect(mapTournament(wrap(games), "133", fetched)?.ties[0].winnerId).toBeNull();
});
it("does not turn fixture draw order into known future opponents or invent completion for other cups", () => {
  const data = mapTournament(wrap(full(), { playoff: { hasDrawOrder: true, rounds: [] } }), "133", fetched)!;
  expect(data.notes.join(" ")).toContain("do not establish a future bracket");
  const raw = wrap(full()); raw.payload.details.id = 132;
  expect(mapTournament(raw, "132", fetched)?.stageCoverageComplete).toBe(false);
  expect(mapTournament(raw, "133", fetched)).toBeNull();
});
it("rejects impossible final pairings from the current ties while allowing analysis of other pairings", () => {
  const data = mapTournament(wrap(full()), "133", fetched)!;
  expect(finalPairConflict("Could Team 1 and Team 2 be the finalists?", data)).toContain("can't both");
  expect(finalPairConflict("Could Team 1 and Team 3 be the finalists?", data)).toBeNull();
  data.activeStage = "final"; data.ties[0].stage = "final";
  expect(finalPairConflict("Could Team 1 and Team 2 be the finalists?", data)).toBeNull();
});
it("matches official calendar dates to the exact season without inventing kickoff times", () => {
  const html = '<li>Round One: 7-9 August 2026</li><li>Semi-Final First Leg: w/c 11 January 2027</li><li>Final: Sunday 21 March 2027</li>';
  const data = parseEflCalendar(html, "2026/2027", fetched)!;
  expect(data.finalDate).toBe("2027-03-21"); expect(data.dates[1].dateText).toContain("w/c");
  expect(parseEflCalendar(html, "2025/2026", fetched)).toBeNull();
  expect(parseEflCalendar(html.replace("21 March", "99 March"), "2026/2027", fetched)).toBeNull();
  expect(parseEflCalendar(html + '<li>Final: Sunday 28 March 2027</li>', "2026/2027", fetched)).toBeNull();
});
it("keeps league tables and fixtures separate from knockout ties for any provider competition", () => {
  const raw = { payload: { details: { id: 87, name: "LaLiga", selectedSeason: "2026/2027" }, fixtures: { fixtureInfo: { activeRound: { roundId: "10" } }, allMatches: [fixture(1, 1, 2, "10")] }, table: [{ data: { table: { all: [{ idx: 1, id: 1, name: "Leader", pts: 25, played: 10 }] } } }] } };
  const data = mapTournament(raw, "87", fetched)!;
  expect(data.format).toBe("league"); expect(data.ties).toEqual([]);
  const text = tournamentEvidence(data).map(e => e.text).join("\n");
  expect(text).toContain("Leader: played 10"); expect(text).toContain("points 25");
  expect(text).not.toContain("Listed remaining/advancing candidates");
});
it("retains source-reported multi-leg winners outside the EFL Cup", () => {
  const raw = wrap([fixture(1, 1, 2, "1/2", { finished: true }), fixture(2, 2, 1, "1/2", { finished: true })], { playoff: { rounds: [{ stage: "1/2", matchups: [{ homeTeamId: 1, awayTeamId: 2, bestOf: 2, aggregatedWinner: 2, matches: [{ matchId: 1 }, { matchId: 2 }] }] }] } });
  raw.payload.details.id = 139;
  expect(mapTournament(raw, "139", fetched)?.ties[0].winnerId).toBe("fotmob:2");
});
it("loads source-embedded cup fixtures and stages even when the flat fixture list omits them", () => {
  const raw = wrap([], { playoff: { rounds: [{ stage: "1", matchups: [{ stage: "1", homeTeamId: 1, awayTeamId: 2, matches: [{ ...fixture(10, 1, 2), matchId: 10 }] }] }] } });
  raw.payload.details.id = 132;
  const data = mapTournament(raw, "132", fetched)!;
  expect(data.fixtures[0].stage).toBe("1"); expect(data.ties[0].teams.map(t => t.id)).toEqual(["fotmob:1", "fotmob:2"]);
});
it("validates a non-EFL active field using explicit source participant counts, not EFL rules", () => {
  const raw = wrap([], { playoff: { rounds: [{ stage: "1/2", participantCount: 4, matchups: [
    { homeTeamId: 1, awayTeamId: 2, matches: [{ ...fixture(10, 1, 2), matchId: 10 }] },
    { homeTeamId: 3, awayTeamId: 4, matches: [{ ...fixture(11, 3, 4), matchId: 11 }] },
  ] }] } });
  raw.payload.details.id = 139; raw.payload.fixtures.fixtureInfo.activeRound.roundId = "1/2";
  expect(mapTournament(raw, "139", fetched)?.stageCoverageComplete).toBe(true);
});
