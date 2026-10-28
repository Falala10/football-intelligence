import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));
vi.mock("../fotmob/mcp", () => ({ callFotMobTool: vi.fn() }));
import { competitionSearchId } from "./resolve";
it("accepts only exact named competition results and deduplicates search groups", () => {
  const league = { type: "league", id: "138", name: "Copa del Rey" };
  const raw = { payload: [{ suggestions: [league] }, { suggestions: [league, { type: "team", id: "1", name: "Copa del Rey" }] }] };
  expect(competitionSearchId(raw, "Who remains in the Copa del Rey?")).toBe("138");
  expect(competitionSearchId(raw, "Who remains in the FA Cup?")).toBeNull();
  expect(competitionSearchId({ payload: [{ suggestions: [league, { ...league, id: "999" }] }] }, "Copa del Rey")).toBeNull();
});
