import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));
vi.mock("../fotmob/mcp", () => ({ callFotMobTool: vi.fn() }));
import { callFotMobTool } from "../fotmob/mcp";
import { getHistoricalLeague } from "./history-service";
beforeEach(() => vi.resetAllMocks());
it("validates parameters before fetching and rejects silent current-season fallbacks", async () => {
  await expect(getHistoricalLeague("../87", "2025/2026")).rejects.toThrow();
  await expect(getHistoricalLeague("87", "2025/2028")).rejects.toThrow();
  expect(callFotMobTool).not.toHaveBeenCalled();
  vi.mocked(callFotMobTool).mockResolvedValue({ payload: { details: { id: 87, name: "LaLiga", selectedSeason: "2026/2027" } } });
  await expect(getHistoricalLeague("87", "2025/2026")).rejects.toThrow("mismatched");
});
it("requests the explicit season using bounded read-only league parameters", async () => {
  vi.mocked(callFotMobTool).mockResolvedValue({ payload: { details: { id: 87, name: "LaLiga", selectedSeason: "2025/2026" } } });
  expect((await getHistoricalLeague("87", "2025/2026")).season).toBe("2025/2026");
  expect(callFotMobTool).toHaveBeenCalledWith("fetch_fotmob_route", { route_key: "leagues", params_json: JSON.stringify({ id: "87", season: "2025/2026" }), use_cache: false });
});
