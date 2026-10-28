export type MatchEvidence = { kind?: "match-observation" | "coaching-principles" | "team-history" | "football-reporting" | "competition-context"; id: string; title: string; href: string; asOfUtc: string; text: string };
export type MatchAnswer = {
  status: "answered" | "insufficient_evidence";
  claims: { text: string; evidenceIds: string[]; basis?: "context" | "knowledge" | "research" }[];
  limitations: string[];
};
export type MatchAiResponse = { answer: MatchAnswer; evidence: MatchEvidence[]; answeredAtUtc: string; model: string };
