import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("../teams/service", () => ({ getTeamOverview: vi.fn() }));
vi.mock("../ai/research", () => ({ searchFootballWeb: vi.fn() }));
import { getTeamOverview } from "../teams/service";
import { searchFootballWeb } from "../ai/research";
import { mapFotMobDetail } from "../matches/providers/fotmob-detail-map";
import { answerVenue, isVenueQuestion } from "./service";
const detail = () => mapFotMobDetail({ matchId: "123", fetchedAtUtc: "2026-10-27T18:00:00Z", home: { id: 2073, name: "FC Nordsjælland" }, away: { id: 2, name: "AGF" }, status: { state: "scheduled", kickoffUtc: "2026-10-27T18:00:00Z" } }, "123")!;
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("FOOTBALL_RESEARCH_PROVIDER", "auto"); });
it("keeps why on the immediate venue topic, without hijacking a later topic", () => {
  expect(isVenueQuestion("why?", [{ role: "user", text: "stadium?" }])).toBe(true);
  expect(isVenueQuestion("why?", [{ role: "user", text: "stadium?" }, { role: "user", text: "Who scored?" }])).toBe(false);
  expect(isVenueQuestion("What is a stadium?")).toBe(false);
});
it("uses confirmed match venue without extra requests", async () => {
  const d = detail(); d.venue.stadium = "Confirmed Park";
  expect((await answerVenue("stadium?", [], d)).answer.claims[0].text).toContain("at Confirmed Park");
  expect(getTeamOverview).not.toHaveBeenCalled(); expect(searchFootballWeb).not.toHaveBeenCalled();
});
it("falls back to the correct women's club ground without claiming match confirmation", async () => {
  vi.mocked(getTeamOverview).mockResolvedValue({ id: "fotmob:2073", name: "FC Nordsjælland (W)", gender: "female", homeGround: { stadium: "Right to Dream Park", city: "Farum", country: "Denmark" }, season: null, leagueId: null, fetchedAtUtc: "2026-10-27T18:00:00Z", fixtures: [] });
  vi.mocked(searchFootballWeb).mockRejectedValue(new Error("quota"));
  const d = detail(); const answer = await answerVenue("stadium?", [], d);
  expect(answer.answer.claims[0].text).toContain("Right to Dream Park in Farum");
  expect(answer.answer.claims[0].text).toContain("couldn't independently confirm");
  expect(vi.mocked(searchFootballWeb).mock.calls[0][0]).toContain("gender female");
  expect(d.venue.stadium).toBeNull();
  const followup = await answerVenue("why?", [{ role: "user", text: "stadium?" }], d);
  expect(followup.answer.claims[0].text).toContain("listing leaves the stadium blank");
  expect(searchFootballWeb).toHaveBeenCalledTimes(1);
});

it("recognizes conversational venue wording and transposed spelling in follow-ups", () => {
  for (const text of ["where is this being palyed?", "where is this being played?", "where is it taking place?", "where are they playing?"]) {
    expect(isVenueQuestion(text)).toBe(true);
    expect(isVenueQuestion("why?", [{ role: "user", text }, { role: "assistant", text: "The match venue is unconfirmed." }])).toBe(true);
  }
  expect(isVenueQuestion("where are they in the table?")).toBe(false);
});
