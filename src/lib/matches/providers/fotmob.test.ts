import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../../fotmob/matches", () => ({ getMatchesByDate: vi.fn() }));

import { getMatchesByDate } from "../../fotmob/matches";
import { fotmobProvider } from "./fotmob";

const query = { date: "2026-10-01", timezone: "America/New_York" };

describe("FotMob provider", () => {
  beforeEach(() => vi.resetAllMocks());

  it("forwards the day boundary timezone and returns normalized data", async () => {
    vi.mocked(getMatchesByDate).mockResolvedValue({ status: "ok", data: {
      date: query.date, timezone: query.timezone, fetchedAtUtc: "2026-10-01T12:00:00Z",
      counts: { leagues: 1, matches: 1, live: 0 }, leagues: [{ leagueId: "47", sectionId: "s1", name: "Premier League", matches: [{ matchId: "123", state: "finished", home: { name: "A", score: 0 }, away: { name: "B", score: 1 } }] }],
    } });
    const day = await fotmobProvider.getDay(query);
    expect(getMatchesByDate).toHaveBeenCalledWith({ date: query.date, tz: query.timezone });
    expect(day.groups[0].matches[0]).toMatchObject({ id: "fotmob:123", status: "finished", score: { home: 0, away: 1 } });
    expect(day.timezone).toBe(query.timezone);
  });

  it("throws on unavailable data instead of returning an empty day", async () => {
    vi.mocked(getMatchesByDate).mockResolvedValue({ status: "unavailable" });
    await expect(fotmobProvider.getDay(query)).rejects.toThrow("unavailable");
  });
});
