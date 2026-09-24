import { describe, expect, it } from "vitest";

import type { LeagueSection, Match, MatchState } from "./fotmob/types";
import { isNavLeagueId, selectLeagues } from "./leagues";

function match(id: string, state: MatchState): Match {
  return { matchId: id, state, home: { name: `Home ${id}` }, away: { name: `Away ${id}` } };
}

function section(leagueId: string, states: MatchState[], sectionId = `s-${leagueId}`): LeagueSection {
  return {
    leagueId,
    sectionId,
    name: `League ${leagueId}`,
    matches: states.map((state, index) => match(`${leagueId}-${index}`, state)),
  };
}

describe("isNavLeagueId", () => {
  it("recognises sidebar league ids only", () => {
    expect(isNavLeagueId("47")).toBe(true);
    expect(isNavLeagueId("130")).toBe(true);
    expect(isNavLeagueId("9999")).toBe(false);
    expect(isNavLeagueId(47)).toBe(false);
    expect(isNavLeagueId(undefined)).toBe(false);
  });
});

describe("selectLeagues", () => {
  const leagues = [
    section("999", ["scheduled"]),
    section("87", ["live", "finished"]),
    section("47", ["scheduled"]),
    section("888", ["finished"]),
  ];

  it("puts sidebar leagues first, in sidebar order, then the rest in FotMob order", () => {
    expect(selectLeagues(leagues).map((l) => l.leagueId)).toEqual(["47", "87", "999", "888"]);
  });

  it("limits to one league", () => {
    expect(selectLeagues(leagues, { leagueId: "87" }).map((l) => l.leagueId)).toEqual(["87"]);
    expect(selectLeagues(leagues, { leagueId: "55" })).toEqual([]);
  });

  it("keeps only live and half-time matches when asked, and drops empty leagues", () => {
    const withHalftime = [...leagues, section("53", ["halftime", "scheduled"])];
    const result = selectLeagues(withHalftime, { liveOnly: true });
    expect(result.map((l) => l.leagueId)).toEqual(["87", "53"]);
    expect(result[0].matches.map((m) => m.state)).toEqual(["live"]);
    expect(result[1].matches.map((m) => m.state)).toEqual(["halftime"]);
  });

  it("keeps sections that share a league id (groups) separate", () => {
    const groups = [section("9806", ["scheduled"], "g2"), section("9806", ["live"], "g4")];
    expect(selectLeagues(groups).map((l) => l.sectionId)).toEqual(["g2", "g4"]);
  });

  it("does not modify its input", () => {
    const before = JSON.stringify(leagues);
    selectLeagues(leagues, { liveOnly: true });
    expect(JSON.stringify(leagues)).toBe(before);
  });
});
