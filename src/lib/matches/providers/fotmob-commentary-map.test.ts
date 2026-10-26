import { describe, expect, it } from "vitest";
import { mapFotMobCommentary } from "./fotmob-commentary-map";
const raw = { matchId: "123", state: "ok", source: "human", fetchedAtUtc: "2026-10-01T12:00:00Z", items: [{ id: "a", minute: 90, added: 2, text: "Full time." }, { minute: 0, text: "Kick-off." }] };
describe("commentary mapping", () => {
  it("preserves newest-first order, stoppage minutes and zero minutes", () => {
    const r = mapFotMobCommentary(raw, "123");
    expect(r.status).toBe("ok");
    if (r.status === "ok") { expect(r.data.source).toBe("human"); expect(r.data.items.map((i) => i.minute)).toEqual(["90+2’", "0’"]); }
  });
  it("labels automatic updates separately", () => {
    const r = mapFotMobCommentary({ ...raw, source: "auto" }, "123");
    if (r.status !== "ok") throw new Error("Expected data");
    expect(r.data.source).toBe("automatic");
  });
  it("distinguishes no coverage, empty updates, and upstream failure", () => {
    expect(mapFotMobCommentary({ matchId: "123", state: "none" }, "123")).toEqual({ status: "none" });
    expect(mapFotMobCommentary({ ...raw, items: [] }, "123").status).toBe("ok");
    expect(mapFotMobCommentary({ ...raw, state: "unavailable" }, "123")).toEqual({ status: "unavailable" });
  });
  it("rejects wrong matches, invalid dates, and unusable lines", () => {
    for (const bad of [null, { ...raw, matchId: "456" }, { ...raw, fetchedAtUtc: "bad" }, { ...raw, items: [{}] }, { ...raw, source: "unknown" }]) expect(mapFotMobCommentary(bad, "123")).toEqual({ status: "unavailable" });
  });
});
