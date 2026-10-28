import { expect, it } from "vitest";
import { buildHistoricalEvidence } from "./history-evidence";
import { mapFotMobLeague } from "../competitions/fotmob-map";
const league = () => mapFotMobLeague({ payload: { details: { id: 87, name: "LaLiga", selectedSeason: "2025/2026" }, table: [{ table: { all: [{ id: 1, name: "Team", idx: 1, played: 1, wins: 1, draws: 0, losses: 0, pts: 3, goalConDiff: 2 }] } }], fixtures: { allMatches: [{ id: 42, home: { id: 1, name: "Team" }, away: { id: 2, name: "Other" }, status: { utcTime: "2025-10-20T20:00:00Z", finished: true, scoreStr: "3 - 1" } }] } } }, "87", "2026-10-26T12:00:00Z")!;
const team = { id: "fotmob:1", name: "Team", crestUrl: null, shortName: null };
it("builds historical per-game records with stable season references", () => {
  const e = buildHistoricalEvidence(league(), team, "2026-10-26T12:00:00Z")!;
  expect(e.id).toBe("history-1-87-2025-2026");
  expect(e.text).toContain("HISTORICAL LEAGUE SEASON: 2025/2026");
  expect(e.text).toContain("points per game: 3");
  expect(e.text).toContain("goals scored per game 3, conceded per game 1");
});
it("withholds fixture totals on missing, inconsistent or wrong-year fixtures; never invents membership", () => {
  for (const mode of ["missing", "mismatch", "wrong-year"]) {
    const l = league();
    if (mode === "missing") l.matches = null;
    if (mode === "mismatch") l.tables![0].rows[0].played = 38;
    if (mode === "wrong-year") l.matches![0].kickoffUtc = "2027-10-20T20:00:00Z";
    const text = buildHistoricalEvidence(l, team, "2026-10-26T12:00:00Z")!.text;
    expect(text).toContain("withheld"); expect(text).not.toContain("Validated fixture/table record");
  }
  expect(buildHistoricalEvidence(league(), { ...team, id: "fotmob:3" }, "2026-10-26T12:00:00Z")).toBeNull();
});

it("keeps compact ten-season context within budget without dropping statistics or warnings", () => {
  const l = league();
  const evidence = Array.from({ length: 20 }, () => buildHistoricalEvidence(l, team, "2026-10-26T12:00:00Z", true)!);
  expect(evidence.reduce((n, e) => n + JSON.stringify(e).length, 0)).toBeLessThan(36000);
  expect(evidence[0].text).toContain("goals scored per game 3");
  expect(evidence[0].text).not.toContain("Latest five league results");
  l.matches = null;
  expect(buildHistoricalEvidence(l, team, "2026-10-26T12:00:00Z", true)!.text).toContain("withheld");
});
