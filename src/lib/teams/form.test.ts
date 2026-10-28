import { expect, it } from "vitest";
import { mapFotMobTeam } from "./fotmob-map";
import { completedFixtures, formRecord } from "./form";
import { buildTeamEvidence } from "../ai/team-evidence";
const time = "2026-10-26T12:00:00Z";
const fixture = (id: number, day: number, score = "2 - 1", away = false, extra = {}) => ({ id, home: { id: away ? 2 : 1, name: away ? "Opponent" : "Team", score: 99 }, away: { id: away ? 1 : 2, name: away ? "Team" : "Opponent", score: 99 }, tournament: { leagueId: 87, name: "League" }, status: { finished: true, utcTime: `2026-10-${day}T12:00:00Z`, scoreStr: score }, ...extra });
const raw = (fixtures: unknown[]) => ({ payload: { details: { id: 1, name: "Team", latestSeason: "2026/2027" }, fixtures: { allFixtures: { fixtures }, primaryTournamentId: 87 } } });
it("validates identity, rejects malformed data and retains normalized scores, not shootout fields", () => {
  expect(() => mapFotMobTeam(raw([]), "2", time)).toThrow();
  expect(() => mapFotMobTeam({}, "1", time)).toThrow();
  const t = mapFotMobTeam(raw([fixture(1, 20), fixture(1, 20), fixture(2, 21, "1 - 1", true)]), "1", time);
  expect(t.fixtures).toHaveLength(2); expect(t.fixtures[0].match.score).toEqual({ home: 2, away: 1 });
  expect(formRecord(completedFixtures(t.fixtures, t.id, time), t.id)).toEqual({ played: 2, wins: 1, draws: 1, losses: 0, goalsFor: 3, goalsAgainst: 2 });
});
it("filters friendlies, awarded games, future/live/unknown scores and respects pre-match cutoff", () => {
  const t = mapFotMobTeam(raw([
    fixture(1, 20), fixture(2, 21, "1 - 3", true), fixture(3, 22, "0 - 2"),
    fixture(4, 23, "1 - 0", false, { tournament: { leagueId: 489, name: "Club Friendlies" } }),
    fixture(5, 24, "1 - 0", false, { status: { finished: true, awarded: true, utcTime: time, scoreStr: "1 - 0" } }),
    fixture(6, 27), fixture(7, 25, "unknown"),
    fixture(8, 25, "1 - 0", false, { status: { started: true, utcTime: "2026-10-25T12:00:00Z", scoreStr: "1 - 0" } }),
  ]), "1", time);
  const f = completedFixtures(t.fixtures, t.id, time);
  expect(f.map(f => f.match.id)).toEqual(["fotmob:3", "fotmob:2", "fotmob:1"]);
  expect(formRecord(f, t.id)).toMatchObject({ played: 3, wins: 2, losses: 1, goalsFor: 5, goalsAgainst: 4 });
  expect(completedFixtures(t.fixtures, t.id, "2026-10-22T12:00:00Z")).toHaveLength(2);
  expect(completedFixtures(t.fixtures, t.id, "bad-date")).toEqual([]);
});
it("keeps all-competition and league form separate and warns on incomplete league totals", () => {
  const overview = mapFotMobTeam(raw([fixture(1, 20), fixture(2, 21, "0 - 2", false, { tournament: { leagueId: 42, name: "Champions League" } }), fixture(3, 22)]), "1", time);
  const anchor = overview.fixtures[2].match;
  const league = { competition: { id: "fotmob:87", name: "League", parentName: null, country: null, logoUrl: null }, season: "2026/2027", fetchedAtUtc: time, matches: [overview.fixtures[0].match, anchor], tables: [{ name: "League", rows: [{ team: anchor.home, played: 10, wins: 8, draws: 1, losses: 1, points: 25, position: 1, goalDifference: 15 }] }] };
  const c = buildTeamEvidence([{ overview, league }, null], anchor, time);
  expect(c.evidence[0].text).toContain("Latest 3: 3 played, 2 wins, 0 draws, 1 losses");
  expect(c.evidence[0].text).toContain("last 2: 2 played, 1 wins, 0 draws, 1 losses");
  expect(c.evidence[0].text).not.toContain("Barça");
  expect(c.evidence[1].text).toContain("Latest 2 league games: 2 played, 2 wins");
  expect(c.evidence[1].text).toContain("partial/inconsistent subset");
  expect(c.limitations.join(" ")).toContain("disagree with the table");
});
