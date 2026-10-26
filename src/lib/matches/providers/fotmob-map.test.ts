import { describe, expect, it } from "vitest";

import type { MatchesByDate } from "../../fotmob/types";
import { mapFotMobDay } from "./fotmob-map";

const day: MatchesByDate = {
  date: "2026-09-24",
  timezone: "UTC",
  fetchedAtUtc: "2026-09-24T17:35:17Z",
  counts: { leagues: 1, matches: 6, live: 2 },
  leagues: [
    {
      leagueId: "9809",
      sectionId: "920754",
      name: "Nations League D Grp. 1",
      competition: "UEFA Nations League D",
      country: "INT",
      matches: [
        { matchId: "1", state: "live", kickoffUtc: "2026-09-24T16:00:00.000Z", minute: "67’", clock: "66:21", home: { id: "10045", name: "Andorra", score: 0 }, away: { name: "Malta", score: 1, redCards: 1 } },
        { matchId: "2", state: "halftime", minute: "HT", clock: "45:00", home: { name: "A", score: 1 }, away: { name: "B", score: 1 } },
        { matchId: "3", state: "scheduled", home: { name: "Serbia" }, away: { name: "Greece" } },
        { matchId: "4", state: "finished", home: { name: "C", score: 2 }, away: { name: "D", score: 0 } },
        { matchId: "5", state: "postponed", home: { name: "E" }, away: { name: "F" } },
        { matchId: "6", state: "live", minute: "90+2’", clock: "91:20", home: { name: "G", score: 1 }, away: { name: "H", score: 1 } },
      ],
    },
  ],
};

const matches = mapFotMobDay(day).groups[0].matches;

describe("mapFotMobDay", () => {
  it("scopes ids to the provider and keeps a group key per section", () => {
    const mapped = mapFotMobDay(day);
    expect(matches[0].id).toBe("fotmob:1");
    expect(matches[0].providerMatchId).toBe("1");
    expect(mapped.groups[0].id).toBe("fotmob:section:920754");
    expect(mapped.groups[0].competition).toMatchObject({ id: "fotmob:9809", parentName: "UEFA Nations League D" });
    expect(mapped.counts).toEqual({ competitions: 1, matches: 6, live: 2 });
  });

  it("maps a live match with score, minute and clock seconds", () => {
    expect(matches[0].score).toEqual({ home: 0, away: 1 });
    expect(matches[0].redCards).toEqual({ home: 0, away: 1 });
    expect(matches[0].live).toEqual({ minuteLabel: "67’", clockSeconds: 66 * 60 + 21, asOfUtc: "2026-09-24T17:35:17Z" });
  });

  it("does not count locally at halftime or in stoppage time", () => {
    expect(matches[1].status).toBe("halftime");
    expect(matches[1].live?.clockSeconds).toBeNull();
    expect(matches[5].live).toMatchObject({ minuteLabel: "90+2’", clockSeconds: null });
  });

  it("never turns a missing score into 0-0", () => {
    expect(matches[2].score).toBeNull();
    expect(matches[4].score).toBeNull();
    expect(matches[2].live).toBeNull();
  });

  it("keeps a finished score and no live state", () => {
    expect(matches[3].score).toEqual({ home: 2, away: 0 });
    expect(matches[3].live).toBeNull();
  });

  it("counts distinct competitions while retaining separate stage groups", () => {
    const mapped = mapFotMobDay({ ...day, leagues: [day.leagues[0], { ...day.leagues[0], sectionId: "second-stage" }] });
    expect(mapped.groups).toHaveLength(2);
    expect(mapped.counts.competitions).toBe(1);
  });

  it("builds crest urls only when a team id exists", () => {
    expect(matches[0].home.crestUrl).toContain("/teamlogo/10045.png");
    expect(matches[0].away.crestUrl).toBeNull();
  });
});
