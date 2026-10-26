import { describe, expect, it } from "vitest";

import { pickFeaturedMatch, pickOtherMatches } from "./featured";
import type { CompetitionGroup, Match, MatchStatus } from "./matches/model";

function match(id: string, state: MatchStatus, kickoffUtc?: string): Match {
  return { id, provider: "fotmob", providerMatchId: id, status: state, kickoffUtc: kickoffUtc ?? null, home: { id: null, name: `Home ${id}`, shortName: null, crestUrl: null }, away: { id: null, name: `Away ${id}`, shortName: null, crestUrl: null }, score: null, redCards: { home: 0, away: 0 }, live: null };
}

function league(leagueId: string, matches: Match[]): CompetitionGroup {
  return { id: `s-${leagueId}`, competition: { id: `fotmob:${leagueId}`, name: `League ${leagueId}`, parentName: null, country: null, logoUrl: null }, matches };
}

describe("pickFeaturedMatch", () => {
  it("prefers a live match, taking the first one in the given order", () => {
    const leagues = [
      league("47", [match("a", "scheduled", "2026-09-24T18:00:00Z")]),
      league("87", [match("b", "live"), match("c", "live")]),
    ];
    const featured = pickFeaturedMatch(leagues);
    expect(featured?.kind).toBe("live");
    expect(featured?.match.id).toBe("b");
  });

  it("counts half-time as live", () => {
    expect(pickFeaturedMatch([league("999", [match("a", "halftime")])])?.kind).toBe("live");
  });

  it("with nothing live, picks the earliest kick-off among the sidebar leagues even if another league is earlier", () => {
    const leagues = [
      league("47", [match("late", "scheduled", "2026-09-24T19:00:00Z"), match("early", "scheduled", "2026-09-24T15:00:00Z")]),
      league("999", [match("earliest", "scheduled", "2026-09-24T09:00:00Z")]),
    ];
    const featured = pickFeaturedMatch(leagues);
    expect(featured?.kind).toBe("next");
    expect(featured?.match.id).toBe("early");
  });

  it("falls back to the earliest kick-off overall when no sidebar league has one", () => {
    const leagues = [
      league("999", [match("b", "scheduled", "2026-09-24T12:00:00Z")]),
      league("888", [match("a", "scheduled", "2026-09-24T10:00:00Z")]),
    ];
    expect(pickFeaturedMatch(leagues)?.match.id).toBe("a");
  });

  it("ignores scheduled matches with no kick-off time", () => {
    expect(pickFeaturedMatch([league("47", [match("a", "scheduled")])])).toBeNull();
  });

  it("with only finished matches, prefers a sidebar league", () => {
    const leagues = [league("999", [match("x", "finished")]), league("87", [match("y", "finished")])];
    const featured = pickFeaturedMatch(leagues);
    expect(featured?.kind).toBe("result");
    expect(featured?.match.id).toBe("y");
  });

  it("returns null when there is nothing to feature", () => {
    expect(pickFeaturedMatch([])).toBeNull();
    expect(pickFeaturedMatch([league("47", [match("a", "postponed")])])).toBeNull();
  });
});

describe("pickOtherMatches", () => {
  const leagues = [
    league("47", [match("done", "finished"), match("soon", "scheduled", "2026-09-24T15:00:00Z")]),
    league("87", [match("now", "live"), match("later", "scheduled", "2026-09-24T18:00:00Z")]),
  ];

  it("puts live first, then upcoming, then finished, keeping order within each group", () => {
    expect(pickOtherMatches(leagues, null, 10).map((e) => e.match.id)).toEqual(["now", "soon", "later", "done"]);
  });

  it("leaves out the featured match", () => {
    const featured = pickFeaturedMatch(leagues);
    expect(pickOtherMatches(leagues, featured, 10).map((e) => e.match.id)).not.toContain("now");
  });

  it("respects the limit and never returns a negative slice", () => {
    expect(pickOtherMatches(leagues, null, 2)).toHaveLength(2);
    expect(pickOtherMatches(leagues, null, 0)).toEqual([]);
    expect(pickOtherMatches(leagues, null, -3)).toEqual([]);
  });
});
