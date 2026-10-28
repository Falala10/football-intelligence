/** Remove known internal coverage boilerplate, while retaining specific user-relevant uncertainty. */
const internalSentences = [
  "Detailed player performance covers the viewed match; historical incidents are available only where a separate dated football report explicitly describes them.",
  "Team results and league form are available only when separate team-history evidence is attached.",
  "External injury reports and news are not loaded.",
  "Match and player data may come from separate fetch times. Ratings are provider assessments, not objective measurements of quality.",
  "Heatmap locations do not establish continuous movement, time spent, tactics or attacking direction.",
];
export function publicAnswerText(text: string): string {
  let result = text.replace(/\[lookup-\d+(?:\s*[,;]\s*lookup-\d+)*\]/gi, "");
  for (const sentence of internalSentences) {
    const pattern = sentence.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    result = result.replace(new RegExp(pattern, "gi"), "");
  }
  return result.replace(/[ \t]+([.,;:!?])/g, "$1").replace(/\n[ \t]+\n/g, "\n\n").replace(/\n{3,}/g, "\n\n").trim();
}
