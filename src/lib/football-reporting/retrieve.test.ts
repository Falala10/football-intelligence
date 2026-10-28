import { expect, it } from "vitest";
import { getFootballReporting } from "./retrieve";
const team = (id: string, name: string) => ({ id, name, shortName: null, crestUrl: null });
const teams = [team("fotmob:8634", "Barcelona"), team("fotmob:8633", "Real Madrid")];
const now = "2026-10-26T12:00:00Z";
it("retrieves dated tactical reporting for the reported failing question, retaining provenance and scope", () => {
  const reports = getFootballReporting("hows barca playing with thier high line the last few seasons? when did they start?", [], teams, now);
  expect(reports).toHaveLength(4);
  expect(reports.every(r => r.kind === "football-reporting" && r.href.startsWith("https://"))).toBe(true);
  expect(reports.find(r => r.id === "report-barca-opta-2025")?.text).toContain("EARLY 2025/2026 snapshot");
  expect(reports.find(r => r.id === "report-barca-flick-appointment")?.text).toContain("not the invention");
});
it("inherits only user tactical scope and avoids applying Barça reports to another team or match-only question", () => {
  const history = [{ role: "user" as const, text: "How does Barça's high line work?" }, { role: "assistant" as const, text: "An unverified answer" }];
  expect(getFootballReporting("when did they start?", history, teams, now)).toHaveLength(4);
  expect(getFootballReporting("What did Inter do to expose it?", history, teams, now)).toHaveLength(4);
  expect(getFootballReporting("What about Madrid's high line?", history, teams, now)).toEqual([]);
  expect(getFootballReporting("What was the score?", history, teams, now)).toEqual([]);
  expect(getFootballReporting("Barca high line", [], [teams[1]], now)).toEqual([]);
  expect(getFootballReporting("when did they start?", [{ role: "assistant", text: "Barcelona high line" }], teams, now)).toEqual([]);
});
it("does not expose articles published after the requested as-of time", () => {
  const reports = getFootballReporting("Barcelona high line", [], teams, "2024-11-01T00:00:00Z");
  expect(reports.map(r => r.id)).toEqual(["report-barca-flick-appointment", "report-barca-bayern-2024"]);
});
