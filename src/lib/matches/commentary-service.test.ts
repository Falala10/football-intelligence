import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("../fotmob/commentary", () => ({ getFotMobCommentary: vi.fn() }));
import { getFotMobCommentary } from "../fotmob/commentary";
import { getMatchCommentary } from "./commentary-service";
afterEach(() => { vi.restoreAllMocks(); vi.resetAllMocks(); });
describe("commentary service", () => {
  it("rejects invalid ids without calling the source", async () => {
    expect(await getMatchCommentary("other:123")).toEqual({ status: "unavailable" });
    expect(getFotMobCommentary).not.toHaveBeenCalled();
  });
  it("recovers after a failure without confusing it with no coverage", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getFotMobCommentary).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ status: "none" });
    expect(await getMatchCommentary("fotmob:123")).toEqual({ status: "unavailable" });
    expect(await getMatchCommentary("fotmob:123")).toEqual({ status: "none" });
    expect(getFotMobCommentary).toHaveBeenCalledWith("123");
  });
});
