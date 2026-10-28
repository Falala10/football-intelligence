import { describe, expect, it } from "vitest";
import { mapFotMobDetail } from "./fotmob-detail-map";
const raw = {
  matchId: "123", fetchedAtUtc: "2026-10-01T12:00:00Z", status: { state: "live", minute: "45+2’", clock: "46:20", kickoffUtc: "bad" },
  home: { id: 1, name: "Home", score: 0 }, away: { id: 2, name: "Away", score: 1 },
  available: { events: true, stats: true }, events: [{ type: "goal", minute: 45, added: 2, side: "away", player: "Scorer", assist: "Helper", penalty: true }, { type: "sub", minute: 60, in: { name: "In" }, out: { name: "Out" } }],
  lineups: { home: { formation: "4-4-2", starters: [{ id: 0, name: "Player" }] } },
  stats: [{ title: "Stats", items: [{ title: "Shots", home: 0 }, { title: "Passes", home: "20 (80%)", away: 12 }] }],
};
describe("match detail mapping", () => {
  it("preserves zero scores and scopes ids, without counting stoppage time", () => {
    const d = mapFotMobDetail(raw, "123")!;
    expect(d.match.score).toEqual({ home: 0, away: 1 });
    expect(d.match.home.id).toBe("fotmob:1");
    expect(d.match.live?.clockSeconds).toBeNull();
    expect(d.match.kickoffUtc).toBeNull();
  });
  it("keeps stoppage minutes, assists, penalties and substitutions", () => {
    const d = mapFotMobDetail(raw, "123")!;
    expect(d.events?.[0]).toMatchObject({ minute: "45+2’", side: "away" });
    expect(d.events?.[0].description).toContain("Helper");
    expect(d.events?.[0].description).toContain("penalty");
    expect(d.events?.[1].description).toBe("In on, Out off");
  });
  it("does not invent stats or player identifiers", () => {
    const d = mapFotMobDetail(raw, "123")!;
    expect(d.stats?.[0].items[0]).toEqual({ label: "Shots", home: "0", away: null });
    expect(d.stats?.[0].items[1].home).toBe("20 (80%)");
    expect(d.lineups.home?.starters[0].id).toBeNull();
    expect(d.lineups.away).toBeNull();
  });
  it("distinguishes unavailable events from an empty timeline", () => {
    expect(mapFotMobDetail({ ...raw, available: {}, events: [] }, "123")?.events).toBeNull();
    expect(mapFotMobDetail({ ...raw, events: [] }, "123")?.events).toEqual([]);
  });
  it("never supplies a score before kickoff or with a missing side", () => {
    expect(mapFotMobDetail({ ...raw, status: { state: "scheduled" } }, "123")?.match.score).toBeNull();
    expect(mapFotMobDetail({ ...raw, away: { name: "Away" } }, "123")?.match.score).toBeNull();
  });
  it("rejects unavailable, malformed and mismatched responses", () => {
    for (const bad of [null, {}, { ...raw, state: "unavailable" }, { ...raw, matchId: "456" }, { ...raw, status: {} }, { ...raw, fetchedAtUtc: "bad" }]) expect(mapFotMobDetail(bad, "123")).toBeNull();
  });
});

it("preserves the source injury reason without inventing a diagnosis or cause", () => {
  const d = mapFotMobDetail({ ...raw, events: [{ type: "sub", minute: 30, injury: true, in: { name: "Balde" }, out: { name: "Espart" } }] }, "123")!;
  expect(d.events?.[0].description).toBe("Balde on, Espart off — injury-related substitution");
});
