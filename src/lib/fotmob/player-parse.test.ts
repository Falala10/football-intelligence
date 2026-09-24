import { describe, expect, it } from "vitest";

import { parsePlayerProfile } from "./player-parse";

function valid(): Record<string, unknown> {
  return {
    state: "ok",
    id: "696679",
    name: "Raphinha",
    fetchedAtUtc: "2026-09-24T18:00:00Z",
    team: { id: "8634", name: "Barcelona", colors: { primary: "#971e48", secondary: "#ab2151" } },
    info: { shirt: 11, age: 29, country: "Brazil", foot: "Left", marketValue: "€50.7m" },
    position: { primary: "left winger", recentUsage: [{ position: "striker", appearances: 9 }] },
    season: { league: "LaLiga", season: "2026/2027", matches: 7, minutes: 555, goals: 12, assists: 3, rating: 9.01 },
    stats: {
      goals: { value: 12, per90: 1.95, percentile: 100 },
      xG: { value: 8.84 },
    },
    recentMatches: [
      { matchId: "1", opponent: "Sevilla", score: "3-1", result: "W", goals: 3, rating: 9.7 },
      { opponent: "Levante", result: "X", assists: 2 },
    ],
  };
}

describe("parsePlayerProfile", () => {
  it("parses a valid profile", () => {
    const profile = parsePlayerProfile(valid());
    expect(profile?.name).toBe("Raphinha");
    expect(profile?.team?.colors).toEqual({ primary: "#971e48", secondary: "#ab2151" });
    expect(profile?.season?.goals).toBe(12);
    expect(profile?.stats.goals).toEqual({ value: 12, per90: 1.95, percentile: 100 });
    expect(profile?.stats.xG.percentile).toBeUndefined();
    expect(profile?.position?.recentUsage).toEqual([{ position: "striker", appearances: 9 }]);
  });

  it("returns null unless the state is ok", () => {
    expect(parsePlayerProfile({ ...valid(), state: "unavailable" })).toBeNull();
    expect(parsePlayerProfile({ ...valid(), state: "player_not_found" })).toBeNull();
    expect(parsePlayerProfile({ ...valid(), state: undefined })).toBeNull();
  });

  it("returns null for unusable shapes or missing identity", () => {
    expect(parsePlayerProfile(null)).toBeNull();
    expect(parsePlayerProfile("text")).toBeNull();
    expect(parsePlayerProfile([])).toBeNull();
    expect(parsePlayerProfile({ ...valid(), name: "" })).toBeNull();
    expect(parsePlayerProfile({ ...valid(), id: undefined })).toBeNull();
    expect(parsePlayerProfile({ ...valid(), fetchedAtUtc: undefined })).toBeNull();
  });

  it("only accepts #rrggbb colours, because they are used in inline styles", () => {
    const raw = valid();
    raw.team = { name: "X", colors: { primary: "red; background:url(x)", secondary: "#12345" } };
    const colors = parsePlayerProfile(raw)?.team?.colors;
    expect(colors?.primary).toBeUndefined();
    expect(colors?.secondary).toBeUndefined();
  });

  it("drops stats without a numeric value", () => {
    const raw = valid();
    raw.stats = { goals: { value: "12" }, shots: { value: 25 }, junk: 5, nothing: null };
    expect(Object.keys(parsePlayerProfile(raw)?.stats ?? {})).toEqual(["shots"]);
  });

  it("ignores unknown results and keeps the rest of a recent match", () => {
    const recent = parsePlayerProfile(valid())?.recentMatches ?? [];
    expect(recent).toHaveLength(2);
    expect(recent[0].result).toBe("W");
    expect(recent[1].result).toBeUndefined();
    expect(recent[1].assists).toBe(2);
  });

  it("does not turn missing numbers into zero", () => {
    const raw = valid();
    raw.season = { league: "LaLiga" };
    const season = parsePlayerProfile(raw)?.season;
    expect(season?.goals).toBeUndefined();
    expect(season?.rating).toBeUndefined();
  });
});
