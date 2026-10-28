import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));
vi.mock("./mcp", () => ({ callFotMobTool: vi.fn() }));
import { callFotMobTool } from "./mcp";
import { getFotMobAnalysisCommentary, getFotMobCommentary } from "./commentary";
afterEach(() => vi.resetAllMocks());
it("fetches full untruncated analysis commentary separately from the display excerpt", async () => {
  vi.mocked(callFotMobTool).mockResolvedValue({ matchId: "42", state: "ok", source: "human", fetchedAtUtc: "2026-10-26T12:00:00Z", items: [] });
  await getFotMobAnalysisCommentary("42");
  expect(callFotMobTool).toHaveBeenLastCalledWith("get_match_commentary", { match_id_or_url: "42", detail: "full" });
  await getFotMobCommentary("42");
  expect(callFotMobTool).toHaveBeenLastCalledWith("get_match_commentary", { match_id_or_url: "42", detail: "auto", limit: 50 });
});
