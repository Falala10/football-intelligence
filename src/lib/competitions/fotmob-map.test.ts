import { describe, expect, it } from "vitest";
import { mapFotMobLeague } from "./fotmob-map";
const table = { all: [{ id: 1, name: "Team", idx: 1, played: 2, wins: 0, pts: 0, goalConDiff: -2 }] };
const raw = { payload: { details: { id: 47, name: "League", selectedSeason: "2026/2027" }, table: [{ data: { table } }], fixtures: { allMatches: [
  { id: "1", home: { name: "A" }, away: { name: "B" }, status: { finished: true, scoreStr: "0 - 1", utcTime: "2026-10-01T12:00:00Z" } },
  { id: "2", home: { name: "A" }, away: { name: "B" }, status: { scoreStr: "0 - 0" } },
] } } };
const map = (r: unknown) => mapFotMobLeague(r, "47", "2026-10-01T12:00:00Z");
describe("league mapping", () => {
  it("maps overall standings with zero and negative values without inventing missing stats", () => {
    expect(map(raw)?.tables?.[0].rows[0]).toMatchObject({ points: 0, wins: 0, goalDifference: -2, losses: null, team: { id: "fotmob:1" } });
  });
  it("preserves conference tables and ignores home/away splits", () => {
    const r = { payload: { ...raw.payload, table: [{ data: { tables: [{ name: "East", table: { ...table, home: table.all, away: table.all } }, { name: "West", table }] } }] } };
    expect(map(r)?.tables?.map((t) => t.name)).toEqual(["East", "West"]);
  });
  it("preserves real scores but does not show a scheduled 0-0", () => {
    expect(map(raw)?.matches?.[0].score).toEqual({ home: 0, away: 1 });
    expect(map(raw)?.matches?.[1].score).toBeNull();
  });
  it("reports absent standings/fixtures and rejects mismatched leagues", () => {
    expect(map({ payload: { details: raw.payload.details } })).toMatchObject({ tables: null, matches: null });
    expect(map({ payload: { details: { id: 87, name: "Other" } } })).toBeNull();
  });
  it("maps cancelled, postponed and halftime states", () => {
    const matches = [{ cancelled: true }, { postponed: true }, { started: true, reason: { short: "HT" } }].map((status, i) => ({ ...raw.payload.fixtures.allMatches[0], id: String(i), status }));
    expect(map({ payload: { ...raw.payload, fixtures: { allMatches: matches } } })?.matches?.map((m) => m.status)).toEqual(["cancelled", "postponed", "halftime"]);
  });
});
