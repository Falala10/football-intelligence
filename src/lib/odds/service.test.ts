import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { answerOdds, matchEvent, oddsIntent, quotes } from "./service";
import { mapFotMobDetail } from "../matches/providers/fotmob-detail-map";
const now = Date.parse("2026-10-27T16:30:00Z");
const detail = mapFotMobDetail({ matchId: "42", fetchedAtUtc: "2026-10-27T16:30:00Z", status: { state: "scheduled", kickoffUtc: "2026-10-27T20:00:00Z" }, home: { name: "Fleetwood Town" }, away: { name: "Arsenal" }, competition: { name: "EFL Cup", parentId: 133, round: "4" } }, "42")!;
const market = { key: "h2h", last_update: "2026-10-27T16:29:00Z", outcomes: [{ name: "Fleetwood Town", price: 20 }, { name: "Draw", price: 10 }, { name: "Arsenal", price: 1.1 }] };
const event = { id: "event", sport_key: "soccer_england_efl_cup", home_team: "Fleetwood Town", away_team: "Arsenal", commence_time: "2026-10-27T20:00:00Z", bookmakers: [{ title: "Test bookmaker", markets: [market] }] };
const catalog = [{ key: "soccer_england_efl_cup", active: true, has_outrights: false }];
const history = [{ role: "user" as const, text: "Who could be the finalists for the entire EFL competition?" }];
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });
it("retains tournament intent and lets an explicit match request switch back", () => {
  expect(oddsIntent("based on betting odds?", history, detail).scope).toBe("outrights");
  expect(oddsIntent("show odds for this match", history, detail).scope).toBe("h2h");
  expect(oddsIntent("Arsenal vs Fleetwood Town odds?", history, detail).scope).toBe("h2h");
});
it("matches both teams, orientation and kickoff, rejecting duplicate or wrong events", () => {
  expect(matchEvent([event], detail)?.id).toBe("event");
  for (const data of [[event, event], [{ ...event, away_team: "Chelsea" }], [{ ...event, commence_time: "2026-10-28T20:00:00Z" }], [{ ...event, home_team: "Arsenal", away_team: "Fleetwood Town" }]]) expect(matchEvent(data, detail)).toBeNull();
});
it("accepts complete fresh three-way quotes and rejects stale/lay/partial/invalid prices", () => {
  expect(quotes(event, "h2h", now)[0].outcomes[0]).toEqual({ name: "Arsenal", price: 1.1 });
  for (const m of [{ ...market, key: "h2h_lay" }, { ...market, last_update: "2026-10-27T15:00:00Z" }, { ...market, last_update: "2026-10-28T16:30:00Z" }, { ...market, outcomes: market.outcomes.slice(1) }, { ...market, outcomes: [...market.outcomes.slice(0, 2), { name: "Arsenal", price: 1 }] }]) expect(quotes({ ...event, bookmakers: [{ title: "Test", markets: [m] }] }, "h2h", now)).toEqual([]);
});
it("reports absent EFL outright markets without spending a match-odds credit", async () => {
  vi.stubEnv("ODDS_API_KEY", "test-coverage"); const fetcher = vi.fn().mockResolvedValue(Response.json(catalog)); vi.stubGlobal("fetch", fetcher);
  const result = await answerOdds("based on betting odds?", history, detail);
  expect(result.answer.limitations.join(" ")).toContain("doesn't offer EFL Cup tournament-winner or reach-the-final odds");
  expect(fetcher).toHaveBeenCalledTimes(1); expect(String(fetcher.mock.calls[0][0])).toContain("/sports/");
});
it("deduplicates and caches quotes while keeping the key out of returned text/links", async () => {
  vi.useFakeTimers(); vi.setSystemTime(now); vi.stubEnv("ODDS_API_KEY", "test-private-cache");
  const fetcher = vi.fn().mockImplementation(async url => Response.json(String(url).includes("/odds/") ? [event] : catalog)); vi.stubGlobal("fetch", fetcher);
  const [first, second] = await Promise.all([answerOdds("odds for this match?", [], detail), answerOdds("odds for this match?", [], detail)]);
  expect(first.answer.status).toBe("answered"); expect(second.answer.status).toBe("answered");
  expect(first.answer.claims[0].text).toContain("Arsenal 1.10"); expect(first.answer.claims[0].text).toContain("90-minute"); expect(first.answer.claims[0].text).toContain("updated 2026");
  await answerOdds("odds for this match?", [], detail); expect(fetcher).toHaveBeenCalledTimes(2);
  expect(JSON.stringify(first)).not.toContain("test-private-cache"); expect(first.research.sources[0].url).toBe("https://the-odds-api.com/");
});
it("does not silently substitute the viewed match when the question names different teams", async () => {
  vi.stubEnv("ODDS_API_KEY", "test-different"); const fetcher = vi.fn().mockResolvedValue(Response.json(catalog)); vi.stubGlobal("fetch", fetcher);
  const result = await answerOdds("Liverpool vs Chelsea betting odds", [], detail);
  expect(result.answer.status).toBe("insufficient_evidence"); expect(fetcher).toHaveBeenCalledTimes(1);
});
it("fails safely on invalid credentials and exhausted quota without leaking provider error bodies", async () => {
  for (const status of [401, 429]) {
    vi.stubEnv("ODDS_API_KEY", `test-error-${status}`); vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("secret provider details", { status })));
    const result = await answerOdds("odds for this match?", [], detail);
    expect(result.answer.status).toBe("insufficient_evidence"); expect(JSON.stringify(result)).not.toContain("secret provider details");
    expect(result.answer.limitations.join(" ")).toContain(status === 401 ? "authenticate" : "usage limit");
  }
});
it("does not invent an outright price when only a fresh fan poll or malformed market is available", () => {
  expect(quotes({ bookmakers: [{ title: "Fan poll", markets: [{ key: "oddspoll", outcomes: [{ name: "Arsenal", price: 80 }] }] }] }, "outrights", now)).toEqual([]);
});
