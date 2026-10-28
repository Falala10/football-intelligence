import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));
vi.mock("../fotmob/mcp", () => ({ callFotMobTool: vi.fn() }));
import { callFotMobTool } from "../fotmob/mcp";
import { getPlayerGames } from "./player-service";
const raw = (url: string | null) => ({ payload: { general: { matchId: 42 }, content: { heatmapUrl: url, playerStats: { "7": { id: 7, optaId: "77", name: "Player", stats: [] } } } } });
beforeEach(() => vi.resetAllMocks());
it("rejects unsafe IDs without fetching", async () => {
  expect(await getPlayerGames("fotmob:../42")).toBeNull(); expect(callFotMobTool).not.toHaveBeenCalled();
});
it("retains player data on heatmap failure and retries successfully", async () => {
  const url = "/api/data/heatmap/match/42/heatmaps?heatmapUrl=https%3A%2F%2Fpub.fotmob.com%2Fprod%2Fdb%2Fapi%2Fheatmap%2Fmatch%2F42";
  vi.mocked(callFotMobTool).mockResolvedValueOnce(raw(url)).mockRejectedValueOnce(new Error("offline"));
  const first = await getPlayerGames("fotmob:42"); expect(first?.players).toHaveLength(1); expect(first?.heatmapStatus).toBe("unavailable");
  vi.mocked(callFotMobTool).mockResolvedValueOnce(raw(url)).mockResolvedValueOnce({ payload: { template: '<svg viewBox="0 0 105 68">', players: { p77: '<circle cx="1" cy="2" r="7.5"/>' } } });
  expect((await getPlayerGames("fotmob:42"))?.heatmaps).toEqual({ "fotmob:7": [{ x: 1, y: 2 }] });
});
it("never forwards unexpected heatmap URLs", async () => {
  vi.mocked(callFotMobTool).mockResolvedValue(raw("https://example.com/private"));
  expect((await getPlayerGames("fotmob:42"))?.heatmapStatus).toBe("unavailable"); expect(callFotMobTool).toHaveBeenCalledTimes(1);
});
