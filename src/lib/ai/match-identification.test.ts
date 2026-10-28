import { expect, it } from "vitest";
import { identifyMatch, isMatchIdentification } from "./match-identification";
import { mapFotMobDetail } from "../matches/providers/fotmob-detail-map";
import { buildMatchEvidence } from "./evidence";
const detail = (competition: unknown) => mapFotMobDetail({ matchId: "42", fetchedAtUtc: "2026-10-27T12:00:00Z", status: { state: "scheduled" }, home: { name: "Fleetwood Town" }, away: { name: "Arsenal" }, competition }, "42")!;
it("identifies the viewed match with its verified stage in the first reply", () => {
  const d = detail({ name: "EFL Cup", id: 938221, parentId: 133, round: "4" });
  expect(identifyMatch(d)).toBe("Fleetwood Town vs Arsenal — EFL Cup, Round of 16 (fourth round).");
  expect(buildMatchEvidence(d, null, { status: "none" }).evidence[0].text).toContain("Stage/round: Round of 16");
});
it("preserves named knockout stages and does not invent one from another competition's round number", () => {
  expect(identifyMatch(detail({ name: "Cup", round: "Semi-finals, first leg" }))).toContain("Semi-finals, first leg");
  expect(detail({ name: "League", id: 47, round: 4 }).competitionStage).toBe("Round 4");
  expect(detail({ name: "Cup" }).competitionStage).toBeNull();
  expect(identifyMatch(detail({ name: "Cup" }))).toContain("round isn't available");
});
it("only shortcuts simple identification of the viewed match", () => {
  for (const q of ["what match is this?", "Which game is it?", "What fixture is this?"]) expect(isMatchIdentification(q)).toBe(true);
  for (const q of ["What match is this player best known for?", "What match did Arsenal play yesterday?", "Why did they win this match?"]) expect(isMatchIdentification(q)).toBe(false);
});
it("identifies cup/competition questions across provider IDs and conversational phrasing", () => {
  const d = detail({ id: 936417, parentId: 209, name: "DFB Pokal", round: "2" });
  for (const q of ["what cup even is this?", "Which competition is this match in?", "What's this tournament?", "What round is this?", "Which league is this game in?", "Which cup does this fixture belong to?"]) expect(isMatchIdentification(q)).toBe(true);
  expect(identifyMatch(d)).toContain("DFB Pokal, Round 2");
  for (const q of ["Which cup did Dortmund win in 1997?", "What is a cup competition?", "What competition is Arsenal playing next week?"]) expect(isMatchIdentification(q)).toBe(false);
});
