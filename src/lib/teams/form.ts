import type { TeamFixture, FormRecord } from "./model";
export function completedFixtures(fixtures: TeamFixture[], teamId: string, beforeUtc: string): TeamFixture[] {
  const before = Date.parse(beforeUtc);
  if (!Number.isFinite(before)) return [];
  const seen = new Set<string>();
  return fixtures.filter(f => {
    const m = f.match, kickoff = Date.parse(m.kickoffUtc ?? "");
    if (seen.has(m.id) || f.friendly || m.status !== "finished" || !m.score || !Number.isFinite(kickoff) || kickoff >= before || ![m.home.id, m.away.id].includes(teamId)) return false;
    seen.add(m.id); return true;
  }).sort((a, b) => Date.parse(b.match.kickoffUtc!) - Date.parse(a.match.kickoffUtc!));
}
export function formRecord(fixtures: TeamFixture[], teamId: string): FormRecord {
  const record = { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
  for (const { match } of fixtures) {
    if (!match.score || ![match.home.id, match.away.id].includes(teamId) || match.status !== "finished") continue;
    const home = match.home.id === teamId, gf = home ? match.score.home : match.score.away, ga = home ? match.score.away : match.score.home;
    record.played++; record.goalsFor += gf; record.goalsAgainst += ga;
    if (gf > ga) record.wins++; else if (gf < ga) record.losses++; else record.draws++;
  }
  return record;
}
export function resultLabel(f: TeamFixture, teamId: string) {
  const r = formRecord([f], teamId); return r.wins ? "W" : r.losses ? "L" : "D";
}
