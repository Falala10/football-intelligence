import { describe, expect, it } from "vitest";

import { parseMatchesByDate } from "./parse";

function validPayload(): Record<string, unknown> {
  return {
    date: "2026-09-24",
    timezone: "UTC",
    fetchedAtUtc: "2026-09-24T17:35:17Z",
    counts: { leagues: 99, matches: 99, live: 99 }, // deliberately wrong: counts are recomputed
    leagues: [
      {
        leagueId: "9809",
        sectionId: "920754",
        name: "UEFA Nations League D Grp. 1",
        competition: "UEFA Nations League D",
        country: "INT",
        matches: [
          {
            matchId: "1",
            state: "live",
            kickoffUtc: "2026-09-24T16:00:00.000Z",
            minute: "67’",
            clock: "66:21",
            home: { id: "10045", name: "Andorra", score: 0 },
            away: { id: "8495", name: "Malta", score: 1, redCards: 1 },
          },
          {
            matchId: "2",
            state: "scheduled",
            home: { name: "Serbia" },
            away: { name: "Greece" },
          },
        ],
      },
    ],
  };
}

describe("parseMatchesByDate", () => {
  it("parses a valid response and recomputes the counts", () => {
    const parsed = parseMatchesByDate(validPayload());
    expect(parsed?.counts).toEqual({ leagues: 1, matches: 2, live: 1 });
    expect(parsed?.leagues[0].competition).toBe("UEFA Nations League D");
  });

  it("keeps the live minute and clock, and treats a 0 score as a real score", () => {
    const live = parseMatchesByDate(validPayload())?.leagues[0].matches[0];
    expect(live?.minute).toBe("67’");
    expect(live?.clock).toBe("66:21");
    expect(live?.home.score).toBe(0);
    expect(live?.away.redCards).toBe(1);
  });

  it("leaves scores undefined for matches that have none", () => {
    const scheduled = parseMatchesByDate(validPayload())?.leagues[0].matches[1];
    expect(scheduled?.home.score).toBeUndefined();
    expect(scheduled?.clock).toBeUndefined();
  });

  it("ignores scores that are not whole numbers", () => {
    const payload = validPayload();
    const leagues = payload.leagues as { matches: { home: { score: unknown } }[] }[];
    leagues[0].matches[0].home.score = "2";
    expect(parseMatchesByDate(payload)?.leagues[0].matches[0].home.score).toBeUndefined();
  });

  it("returns null when the tool reports unavailable", () => {
    expect(parseMatchesByDate({ ...validPayload(), state: "unavailable" })).toBeNull();
  });

  it("returns null for unusable top-level shapes", () => {
    expect(parseMatchesByDate(null)).toBeNull();
    expect(parseMatchesByDate("text")).toBeNull();
    expect(parseMatchesByDate([])).toBeNull();
    expect(parseMatchesByDate({ ...validPayload(), leagues: "no" })).toBeNull();
    expect(parseMatchesByDate({ ...validPayload(), date: undefined })).toBeNull();
    expect(parseMatchesByDate({ ...validPayload(), fetchedAtUtc: "" })).toBeNull();
  });

  it("drops malformed matches and leagues instead of failing the whole page", () => {
    const payload = validPayload();
    const leagues = payload.leagues as Record<string, unknown>[];
    (leagues[0].matches as unknown[]).push(
      { matchId: "3", state: "exploded", home: { name: "A" }, away: { name: "B" } },
      { matchId: "4", state: "live", home: { name: "A" } },
      null,
    );
    leagues.push({ leagueId: "1", name: "No section id", matches: [] });
    leagues.push({ leagueId: "2", sectionId: "s2", name: "Only bad matches", matches: [{ matchId: "9" }] });

    const parsed = parseMatchesByDate(payload);
    expect(parsed?.leagues).toHaveLength(1);
    expect(parsed?.leagues[0].matches.map((m) => m.matchId)).toEqual(["1", "2"]);
  });

  it("returns an empty list, not null, for a valid day with no matches", () => {
    const parsed = parseMatchesByDate({ ...validPayload(), leagues: [] });
    expect(parsed?.counts).toEqual({ leagues: 0, matches: 0, live: 0 });
  });
});
