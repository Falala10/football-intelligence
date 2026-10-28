import { describe, expect, it } from "vitest";
import { mapHeatmaps, mapPlayerGames } from "./fotmob-player-map";
const raw = { payload: { general: { matchId: 42 }, content: { playerStats: { "7": { id: 7, optaId: "77", name: "Player", teamName: "Home", stats: [{ title: "Top", stats: { Minutes: { key: "minutes_played", stat: { value: 0, type: "integer" } }, Passes: { key: "passes", stat: { value: 3, total: 5, type: "fractionWithPercentage" } }, Missing: { stat: { value: null } }, Flag: { stat: { value: 0, type: "boolean" } } } }] } } } } };
describe("player game mapping", () => {
  it("preserves zero minutes and fraction denominators while excluding missing values and flags", () => {
    const p = mapPlayerGames(raw, "42").players[0];
    expect(p.minutes).toBe(0); expect(p.groups[0].stats).toHaveLength(2);
    expect(p.groups[0].stats[1]).toMatchObject({ value: 3, total: 5 });
  });
  it("rejects a wrong match and keeps missing coverage empty", () => {
    expect(() => mapPlayerGames(raw, "43")).toThrow();
    expect(mapPlayerGames({ payload: { general: { matchId: 42 } } }, "42")).toEqual({ players: [], heatmapIds: {}, heatmapUrl: null });
  });
  it("extracts only bounded coordinates belonging to known players without forwarding markup", () => {
    const players = mapPlayerGames(raw, "42").players;
    const maps = mapHeatmaps({ payload: { template: '<svg viewBox="0 0 105 68">', players: { p77: '<script>alert(1)</script><circle cx="0" cy="68" r="7.5"/><circle cx="106" cy="4" r="7.5"/>', p999: '<circle cx="2" cy="3" r="7.5"/>' } } }, players, { "fotmob:7": "77" });
    expect(maps).toEqual({ "fotmob:7": [{ x: 0, y: 68 }] });
    expect(() => mapHeatmaps({ payload: { template: "bad", players: {} } }, players, {})).toThrow();
  });
});
