import { describe, expect, it } from "vitest";
import { mapFotMobDay } from "./providers/fotmob-map";
import { selectGroups } from "./select";

const groups = mapFotMobDay({
  date: "2026-10-01", timezone: "UTC", fetchedAtUtc: "2026-10-01T12:00:00Z",
  counts: { leagues: 4, matches: 8, live: 4 },
  leagues: ["999", "87", "47", "47"].map((id, index) => ({
    leagueId: id, sectionId: String(index), name: `Group ${index}`,
    matches: ["halftime", "scheduled"].map((state, n) => ({ matchId: `${index}-${n}`, state: state as "halftime" | "scheduled", home: { name: "A" }, away: { name: "B" } })),
  })),
}).groups;

describe("normalized schedule selection", () => {
  it("preserves every match and stage while prioritizing navigation leagues", () => {
    const selected = selectGroups(groups);
    expect(selected.map((g) => g.id)).toEqual(["fotmob:section:2", "fotmob:section:3", "fotmob:section:1", "fotmob:section:0"]);
    expect(selected.flatMap((g) => g.matches)).toHaveLength(8);
  });
  it("translates existing URL ids and keeps distinct stages", () => {
    expect(selectGroups(groups, { leagueId: "47" })).toHaveLength(2);
    expect(selectGroups(groups, { leagueId: "55" })).toEqual([]);
  });
  it("includes halftime as live without modifying the source", () => {
    const before = JSON.stringify(groups);
    const live = selectGroups(groups, { liveOnly: true });
    expect(live.flatMap((g) => g.matches)).toHaveLength(4);
    expect(JSON.stringify(groups)).toBe(before);
  });
});
