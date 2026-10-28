vi.mock("../matches/commentary-service", () => ({ getMatchAnalysisCommentary: vi.fn() }));
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("../fotmob/mcp", () => ({ callFotMobTool: vi.fn() }));
vi.mock("./service", () => ({ getTeamContext: vi.fn() }));
vi.mock("../matches/detail-service", () => ({ getMatchDetail: vi.fn() }));
import { callFotMobTool } from "../fotmob/mcp";
import { getTeamContext } from "./service";
import { getMatchDetail } from "../matches/detail-service";
import { getClubResearchSources, selectExactTeam } from "./lookup";
import { mapFotMobTeam } from "./fotmob-map";
const rows = [{ type: "team", id: "10260", name: "Manchester United" }, { type: "team", id: "9", name: "Manchester United (W)" }, { type: "team", id: "10", name: "Manchester United U21" }];
const raw = { payload: [{ suggestions: rows }, { suggestions: [rows[0]] }] };
beforeEach(() => vi.resetAllMocks());
it("resolves verified club identities without mixing men's, women's, youth or duplicate suggestions", () => {
  expect(selectExactTeam(raw, "Man Utd")?.id).toBe("fotmob:10260");
  expect(selectExactTeam(raw, "Manchester United Women")?.id).toBe("fotmob:9");
  expect(selectExactTeam(raw, "Manchester")?.id).toBeUndefined();
  expect(selectExactTeam({ payload: [{ suggestions: [rows[0], { ...rows[0], id: "99" }] }] }, "Manchester United")).toBeNull();
});
it("computes a real club-form source and retains it when detailed match data fails", async () => {
  vi.mocked(callFotMobTool).mockResolvedValue(raw);
  const overview = mapFotMobTeam({ payload: { details: { id: 10260, name: "Manchester United", latestSeason: "2026/2027" }, fixtures: { allFixtures: { fixtures: [{ id: 42, home: { id: 10260, name: "Manchester United" }, away: { id: 2, name: "Opponent" }, tournament: { leagueId: 47, name: "Premier League" }, status: { finished: true, utcTime: "2026-10-20T12:00:00Z", scoreStr: "0 - 3" } }] } } } }, "10260", "2026-10-26T12:00:00Z");
  vi.mocked(getTeamContext).mockResolvedValue({ overview, league: null }); vi.mocked(getMatchDetail).mockResolvedValue({ status: "unavailable" });
  const sources = await getClubResearchSources("Manchester United");
  expect(sources).toHaveLength(1); expect(sources[0].text).toContain("goals scored 0, conceded 3");
  expect(sources[0].text).toContain("failed to score in 1, conceded at least two in 1");
  expect(sources[0].url).toContain("10260");
});
it("does not pass arbitrary query URLs to the provider", async () => {
  expect(await getClubResearchSources("https://example.com/private")).toEqual([]); expect(callFotMobTool).not.toHaveBeenCalled();
});
it("does not start club lookup after cancellation or advance past an aborted search", async () => {
  const parent = new AbortController(); parent.abort();
  expect(await getClubResearchSources("Manchester United", parent.signal)).toEqual([]);
  expect(callFotMobTool).not.toHaveBeenCalled();
  const during = new AbortController();
  vi.mocked(callFotMobTool).mockImplementationOnce(async () => { during.abort(); return raw; });
  expect(await getClubResearchSources("Manchester United", during.signal)).toEqual([]);
  expect(getTeamContext).not.toHaveBeenCalled();
});
