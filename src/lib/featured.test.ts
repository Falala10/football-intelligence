import { describe, expect, it } from "vitest";

import { pickFeaturedMatch, pickOtherMatches } from "./featured";
import type { LeagueSection, Match, MatchState } from "./fotmob/types";

function match(id: string, state: MatchState, kickoffUtc?: string): Match {
  return { matchId: id, state, kickoffUtc, home: { name: `Home ${id}` }, away: { name: `Away ${id}` } };
}

function league(leagueId: string, matches: Match[]): LeagueSection {
  return { leagueId, sectionId: `s-${leagueId}`, name: `League ${leagueId}`, matches };
}

describe("pickFeaturedMatch", () => {
  it("prefers a live match, taking the first one in the given order", () => {
    const leagues = [
      league("47", [match("a", "scheduled", "2026-09-24T18:00:00Z")]),
      league("87", [match("b", "live"), match("c", "live")]),
    ];
    const featured = pickFeaturedMatch(leagues);
    expect(featured?.kind).toBe("live");
    expect(featured?.match.matchId).toBe("b");
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
    expect(featured?.match.matchId).toBe("early");
  });

  it("falls back to the earliest kick-off overall when no sidebar league has one", () => {
    const leagues = [
      league("999", [match("b", "scheduled", "2026-09-24T12:00:00Z")]),
      league("888", [match("a", "scheduled", "2026-09-24T10:00:00Z")]),
    ];
    expect(pickFeaturedMatch(leagues)?.match.matchId).toBe("a");
  });

  it("ignores scheduled matches with no kick-off time", () => {
    expect(pickFeaturedMatch([league("47", [match("a", "scheduled")])])).toBeNull();
  });

  it("with only finished matches, prefers a sidebar league", () => {
    const leagues = [league("999", [match("x", "finished")]), league("87", [match("y", "finished")])];
    const featured = pickFeaturedMatch(leagues);
    expect(featured?.kind).toBe("result");
    expect(featured?.match.matchId).toBe("y");
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
    expect(pickOtherMatches(leagues, null, 10).map((e) => e.match.matchId)).toEqual(["now", "soon", "later", "done"]);
  });

  it("leaves out the featured match", () => {
    const featured = pickFeaturedMatch(leagues);
    expect(pickOtherMatches(leagues, featured, 10).map((e) => e.match.matchId)).not.toContain("now");
  });

  it("respects the limit and never returns a negative slice", () => {
    expect(pickOtherMatches(leagues, null, 2)).toHaveLength(2);
    expect(pickOtherMatches(leagues, null, 0)).toEqual([]);
    expect(pickOtherMatches(leagues, null, -3)).toEqual([]);
  });
});
