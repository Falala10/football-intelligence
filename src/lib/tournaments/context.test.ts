import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("./resolve", () => ({ searchCompetition: vi.fn().mockResolvedValue(null) }));
vi.mock("./service", () => ({ getTournament: vi.fn() }));
vi.mock("../competitions/service", () => ({ getLeagueSeason: vi.fn() }));
import { getTournament } from "./service";
import { loadTournamentContext } from "./context";
import { mapFotMobDetail } from "../matches/providers/fotmob-detail-map";
const detail = mapFotMobDetail({ matchId: "42", fetchedAtUtc: "2026-10-27T18:00:00Z", status: { state: "scheduled" }, home: { name: "Dortmund" }, away: { name: "Bremen" }, competition: { name: "DFB Pokal", parentId: 209, round: "2" } }, "42")!;
afterEach(() => vi.resetAllMocks());
it("retains known match identity when tournament loading fails", async () => {
  vi.mocked(getTournament).mockRejectedValue(new Error("Unavailable"));
  const context = await loadTournamentContext("Which teams remain in this competition?", [], detail);
  expect(getTournament).toHaveBeenCalledWith("209");
  expect(context.evidence[0].text).toContain("Competition: DFB Pokal"); expect(context.evidence[0].text).toContain("Stage/round: Round 2");
});
it("retains page facts as background when another competition needs general research", async () => {
  const context = await loadTournamentContext("Who won the World Cup in 2006?", [], detail);
  expect(context.fallbackToResearch).toBe(true); expect(context.evidence[0].text).toContain("DFB Pokal");
  expect(context.limitations.join(" ")).toContain("without substituting"); expect(getTournament).not.toHaveBeenCalled();
});
