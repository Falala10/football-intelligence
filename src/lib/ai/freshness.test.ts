import { expect, it } from "vitest";
import { needsFreshResearch, refersToViewedMatch } from "./freshness";
it("requires verification for news, form, transfers and relevant follow-ups", () => {
  for (const q of ["latest transfer news", "Messi's current form", "what is the latest drama?", "live score tonight"]) expect(needsFreshResearch(q, [], 2026)).toBe(true);
  expect(needsFreshResearch("What about his contract?", [{ role: "user", text: "Latest transfer news for Player?" }], 2026)).toBe(true);
  for (const q of ["What is a high line?", "Who won the 2006 World Cup?", "Tell me about Neymar’s transfer in 2017", "who won the balon dor 2025?", "Why did he come off in this match?"]) expect(needsFreshResearch(q, [], 2026)).toBe(false);
});

it("retains match-specific follow-ups without trapping a new general news topic", () => {
  const history = [{ role: "user" as const, text: "Why did he come off so early?" }];
  expect(refersToViewedMatch("Was his injury the reason?", history)).toBe(true);
  expect(refersToViewedMatch("Latest transfer news", history)).toBe(false);
  expect(refersToViewedMatch("What is the live score in this match?", [])).toBe(true);
});
it("treats this-season team-performance questions as current analysis rather than a stale fact", async () => {
  const { isAnalysisQuestion } = await import("./freshness");
  const question = "why are man united not doing well this season >";
  expect(needsFreshResearch(question, [], 2026)).toBe(true);
  expect(isAnalysisQuestion(question)).toBe(true);
  expect(isAnalysisQuestion("Who won the 2025 Ballon d'Or?")).toBe(false);
});

it("bypasses match loads for narrow standalone concepts while preserving match questions", async () => {
  const { isStandaloneConcept } = await import("./freshness");
  for (const q of ["What is a high defensive line?", "Explain expected goals", "How does gegenpressing work?"]) expect(isStandaloneConcept(q)).toBe(true);
  for (const q of ["How does Barca's high line work?", "What is their expected goals this season?", "Explain the high line in this match", "Why did he come off?"]) expect(isStandaloneConcept(q)).toBe(false);
});
it("keeps general follow-ups on their topic and resolves dated awards from user history", async () => {
  const { continuesGeneralTopic, awardLookupQuery } = await import("./freshness");
  const united = [{ role: "user" as const, text: "Why are Manchester United not doing well this season?" }];
  expect(continuesGeneralTopic("But why, beyond the scores?", united)).toBe(true);
  expect(continuesGeneralTopic("Why did he come off in this match?", united)).toBe(false);
  const award = [{ role: "user" as const, text: "Who won the men's Ballon d'Or in 2025?" }, { role: "assistant" as const, text: "Unverified winner in 2024" }];
  expect(awardLookupQuery("Who came second?", award)).toContain("2025 Ballon d'Or men");
  expect(awardLookupQuery("Who won the women's Ballon d'Or in 2025?", [])).toContain("2025 Ballon d'Or women");
  expect(awardLookupQuery("What is a false nine?", award)).toBeUndefined();
  expect(awardLookupQuery("Who came third?", [...award, { role: "user", text: "Who came second?" }, { role: "assistant", text: "A response" }])).toContain("2025 Ballon d'Or");
  expect(awardLookupQuery("Who came second?", [...award, { role: "user", text: "What is a false nine?" }])).toBeUndefined();
  expect(awardLookupQuery("Who came second for women in 2024?", award)).toContain("2024 Ballon d'Or women");
});
it("requires current bookmaker evidence and retains the tournament in an odds follow-up", async () => {
  const { oddsResearchQuery } = await import("./freshness");
  const history = [{ role: "user" as const, text: "who could be the finalists for the entire efl competition?" }, { role: "assistant" as const, text: "Arsenal look strong on paper." }];
  expect(needsFreshResearch("based on betting odds?", history, 2026)).toBe(true);
  const query = oddsResearchQuery("based on betting odds?", history)!;
  expect(query).toContain("entire efl competition"); expect(query).toContain("outright/reach-final");
  expect(oddsResearchQuery("What is a high line?", history)).toBeUndefined();
  expect(needsFreshResearch("What are fractional odds?", [], 2026)).toBe(false);
  expect(needsFreshResearch("What are the betting odds for the EFL Cup?", [], 2026)).toBe(true);
});
