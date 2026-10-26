import { expect, it } from "vitest";
import { mapFotMobLeague } from "./fotmob-map";
import { selectLeagueMatches } from "./select";
it("orders results newest first and fixtures soonest first without changing the source", () => {
  const matches = mapFotMobLeague({ payload: { details: { id: 47, name: "League" }, fixtures: { allMatches: Array.from({ length: 24 }, (_, i) => ({ id: String(i + 1), home: { name: "A" }, away: { name: "B" }, status: { finished: i < 12, utcTime: `2026-10-${String(i + 1).padStart(2, "0")}T12:00:00Z` } })) } } }, "47", "2026-10-01T12:00:00Z")!.matches!;
  const before = JSON.stringify(matches), selected = selectLeagueMatches(matches);
  expect(selected.results).toHaveLength(10); expect(selected.results[0].providerMatchId).toBe("12");
  expect(selected.upcoming).toHaveLength(10); expect(selected.upcoming[0].providerMatchId).toBe("13");
  expect(JSON.stringify(matches)).toBe(before);
});
