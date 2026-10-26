import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("../fotmob/league", () => ({ getFotMobLeague: vi.fn() }));
import { getFotMobLeague } from "../fotmob/league";
import { getLeagueSeason } from "./service";
import { mapFotMobLeague } from "./fotmob-map";
afterEach(() => { vi.restoreAllMocks(); vi.resetAllMocks(); });
it("rejects unsupported ids before making a request", async () => {
  expect(await getLeagueSeason("other:47")).toEqual({ status: "invalid" });
  expect(getFotMobLeague).not.toHaveBeenCalled();
});
it("recovers after a failure", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const data = mapFotMobLeague({ payload: { details: { id: 47, name: "League" } } }, "47", "2026-10-01T12:00:00Z")!;
  vi.mocked(getFotMobLeague).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(data);
  expect(await getLeagueSeason("fotmob:47")).toEqual({ status: "unavailable" });
  expect(await getLeagueSeason("fotmob:47")).toEqual({ status: "ok", data });
});
