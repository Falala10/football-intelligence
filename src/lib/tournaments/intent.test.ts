import { expect, it } from "vitest";
import { isTournamentQuestion, tournamentId } from "./intent";
import { mapFotMobDetail } from "../matches/providers/fotmob-detail-map";
const detail = mapFotMobDetail({ matchId: "42", fetchedAtUtc: "2026-10-27T16:00:00Z", status: { state: "scheduled" }, home: { name: "Home" }, away: { name: "Away" }, competition: { id: 938221, parentId: 133, name: "EFL Cup", round: "4" } }, "42")!;
it("selects tournament-wide questions and their follow-ups without stealing match/news questions", () => {
  for (const q of ["Who is left in the EFL Cup?", "Who are the favourites for the entire EFL competition?", "What is Arsenal's route to the final?", "Could Liverpool and Chelsea both reach the final?"]) expect(isTournamentQuestion(q)).toBe(true);
  for (const q of ["Why did Arsenal lose this EFL Cup game in this match?", "latest transfer news", "based on betting odds?", "What is a football tournament?"]) expect(isTournamentQuestion(q)).toBe(false);
  expect(isTournamentQuestion("When is it?", [{ role: "user", text: "Who could be EFL Cup finalists?" }])).toBe(true);
});
it("uses verified parent competition identity and respects an explicit topic change", () => {
  expect(detail.competitionId).toBe("fotmob:133");
  expect(tournamentId("Who remains?", [], detail)).toBe("133");
  expect(tournamentId("FA Cup remaining teams?", [], detail)).toBe("132");
  expect(tournamentId("Who remains in the World Cup?", [], detail)).toBeNull();
});
it("uses any provider-validated parent competition, not just a hand-picked cup list", () => {
  const cup = { ...detail, competitionId: "fotmob:209", competitionName: "DFB Pokal" };
  expect(tournamentId("Which teams remain in this competition?", [], cup)).toBe("209");
  expect(tournamentId("Which teams remain in the World Cup?", [], cup)).toBeNull();
});
it("routes league standings, cup questions and named-topic follow-ups across competitions", () => {
  for (const [q, id] of [["Who leads La Liga?", "87"], ["FA Cup remaining teams?", "132"], ["Who plays in the Supercopa?", "139"], ["Premier League title race?", "47"], ["MLS playoffs?", "130"]]) {
    expect(isTournamentQuestion(q)).toBe(true); expect(tournamentId(q, [], detail)).toBe(id);
  }
  expect(tournamentId("And the next fixtures?", [{ role: "user", text: "Who leads LaLiga?" }], detail)).toBe("87");
});
