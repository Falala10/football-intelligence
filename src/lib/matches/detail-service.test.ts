import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("../fotmob/match-page", () => ({ getFotMobMatchPage: vi.fn() }));
import { getFotMobMatchPage } from "../fotmob/match-page";
import { getMatchDetail } from "./detail-service";
import { mapFotMobDetail } from "./providers/fotmob-detail-map";
afterEach(() => { vi.restoreAllMocks(); vi.resetAllMocks(); });
describe("match detail service", () => {
  it("rejects unsupported or unsafe ids before making requests", async () => {
    for (const id of ["123", "other:123", "fotmob:../secret", "fotmob:0"]) expect(await getMatchDetail(id)).toEqual({ status: "invalid" });
    expect(getFotMobMatchPage).not.toHaveBeenCalled();
  });
  it("forwards the provider id and recovers after a failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const d = mapFotMobDetail({ matchId: "123", fetchedAtUtc: "2026-10-01T12:00:00Z", status: { state: "scheduled" }, home: { name: "Home" }, away: { name: "Away" } }, "123")!;
    vi.mocked(getFotMobMatchPage).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(d);
    expect(await getMatchDetail("fotmob:123")).toEqual({ status: "unavailable" });
    expect(await getMatchDetail("fotmob:123")).toEqual({ status: "ok", data: d });
    expect(getFotMobMatchPage).toHaveBeenCalledWith("123");
  });
});
