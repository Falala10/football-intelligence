import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));
vi.mock("../fotmob/mcp", () => ({ callFotMobTool: vi.fn() }));
vi.mock("../fotmob/league", () => ({ getFotMobLeague: vi.fn() }));
import { callFotMobTool } from "../fotmob/mcp";
import { getFotMobLeague } from "../fotmob/league";
import { getTeamContext } from "./service";
const team = { id: "fotmob:1", name: "Team", shortName: null, crestUrl: null };
beforeEach(() => vi.resetAllMocks());
it("does not fetch invalid IDs and tolerates team-data failure", async () => {
  expect(await getTeamContext({ ...team, id: "fotmob:../1" })).toBeNull(); expect(callFotMobTool).not.toHaveBeenCalled();
  vi.mocked(callFotMobTool).mockRejectedValue(new Error("offline")); expect(await getTeamContext(team)).toBeNull();
});
it("retains recent results when league fetch fails", async () => {
  vi.mocked(callFotMobTool).mockResolvedValue({ payload: { details: { id: 1, name: "Team" }, fixtures: { allFixtures: { fixtures: [] }, primaryTournamentId: 87 } } });
  vi.mocked(getFotMobLeague).mockRejectedValue(new Error("offline"));
  expect(await getTeamContext(team)).toMatchObject({ overview: { id: "fotmob:1" }, league: null });
  expect(getFotMobLeague).toHaveBeenCalledWith("87");
});
