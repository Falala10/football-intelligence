import type { MatchDetail } from "../matches/detail-model";
/** A factual identification does not require a generative model or season history. */
export function isMatchIdentification(question: string): boolean {
  const q = question.trim().replace(/[’']/g, "'").replace(/^what's\b/i, "what is").replace(/\b(?:even|exactly|actually|again|please|anyway)\b/gi, "").replace(/\s+/g, " ").trim().replace(/[?.!]+$/, "").trim();
  const noun = "(?:match|game|fixture|cup|competition|league|tournament|round|stage)";
  return new RegExp(`^(?:what|which) ${noun} (?:is|was) (?:this|it)(?: (?:match|game|fixture))?(?: in| part of| for)?$`, "i").test(q) ||
    new RegExp(`^what (?:is|was) this ${noun}$`, "i").test(q) ||
    new RegExp(`^(?:what|which) ${noun} (?:is|was) (?:this|the) (?:match|game|fixture) (?:in|part of|for)$`, "i").test(q) ||
    new RegExp(`^(?:what|which) ${noun} (?:does|did) this (?:match|game|fixture) (?:belong to|count towards)$`, "i").test(q);
}
export function identifyMatch(detail: MatchDetail): string {
  const teams = `${detail.match.home.name} vs ${detail.match.away.name}`;
  const competition = detail.competitionName ?? "competition unknown";
  return `${teams} — ${competition}${detail.competitionStage ? `, ${detail.competitionStage}` : ". The round isn't available yet"}.`;
}
