import type { Tournament } from "./model";
const normal = (s: string) => ` ${s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;
/** Answer simple incompatibility questions from actual current ties, not a prediction. */
export function finalPairConflict(question: string, data: Tournament): string | null {
  if (!/^(can|could|will|would|is it possible)\b/i.test(question.trim()) || !/\bfinal(?:ists)?\b/i.test(question)) return null;
  const text = normal(question);
  const tie = data.ties.find(t => t.stage === data.activeStage && t.stage.toLowerCase() !== "final" && t.teams.length === 2 && t.teams.every(team => [team.name, team.shortName].some(n => n && text.includes(normal(n)))));
  return tie ? `${tie.teams[0].name} and ${tie.teams[1].name} face each other in the ${tie.label.toLowerCase()}, so they can't both reach the final. Only one can progress from that tie.` : null;
}
