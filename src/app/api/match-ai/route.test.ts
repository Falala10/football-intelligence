vi.mock("server-only", () => ({}));
vi.mock("../../../lib/teams/history-service", () => ({ getHistoricalLeague: vi.fn() }));
import { getHistoricalLeague } from "../../../lib/teams/history-service";
import { mapFotMobLeague } from "../../../lib/competitions/fotmob-map";
vi.mock("../../../lib/teams/service", () => ({ getTeamContext: vi.fn() }));
import { getTeamContext } from "../../../lib/teams/service";
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("../../../lib/matches/detail-service", () => ({ getMatchDetail: vi.fn() }));
vi.mock("../../../lib/matches/player-service", () => ({ getPlayerGames: vi.fn() }));
vi.mock("../../../lib/matches/commentary-service", () => ({ getMatchAnalysisCommentary: vi.fn() }));
vi.mock("../../../lib/ai/gemini", () => ({ aiConfigured: vi.fn(), answerMatch: vi.fn(), AiError: class extends Error {} }));
import { getMatchDetail } from "../../../lib/matches/detail-service";
import { getPlayerGames } from "../../../lib/matches/player-service";
import { getMatchAnalysisCommentary } from "../../../lib/matches/commentary-service";
import { aiConfigured, answerMatch } from "../../../lib/ai/gemini";
import { mapFotMobDetail } from "../../../lib/matches/providers/fotmob-detail-map";
let POST: typeof import("./route").POST;
const req = (body: unknown = { matchId: "fotmob:42", question: "Summary?" }, origin = "http://localhost:3000", host = "http://localhost:3000") => new Request(`${host}/api/match-ai`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body) });
beforeEach(async () => { vi.resetModules(); vi.resetAllMocks(); POST = (await import("./route")).POST; vi.mocked(aiConfigured).mockReturnValue(true); vi.mocked(getTeamContext).mockResolvedValue(null); });
it("rejects cross-origin, remote-host and invalid inputs before loading data", async () => {
  expect((await POST(req(undefined, "https://example.com"))).status).toBe(403);
  expect((await POST(req(undefined, "https://football.example", "https://football.example"))).status).toBe(403);
  for (const body of [{ matchId: "fotmob:../42", question: "Hi" }, { matchId: "fotmob:42", question: " " }, { matchId: "fotmob:42", question: "a".repeat(1201) }]) expect((await POST(req(body))).status).toBe(400);
  expect((await POST(req({ matchId: "fotmob:42", question: "a".repeat(70000) }))).status).toBe(413);
  expect(getMatchDetail).not.toHaveBeenCalled(); expect(answerMatch).not.toHaveBeenCalled();
});
it("reports missing setup without fetching or inventing an answer", async () => {
  vi.mocked(aiConfigured).mockReturnValue(false); expect((await POST(req())).status).toBe(503); expect(getMatchDetail).not.toHaveBeenCalled();
});
it("keeps general football questions working when match data is unavailable", async () => {
  vi.mocked(getMatchDetail).mockResolvedValue({ status: "unavailable" }); vi.mocked(getPlayerGames).mockResolvedValue(null); vi.mocked(getMatchAnalysisCommentary).mockResolvedValue({ status: "none" });
  vi.mocked(answerMatch).mockResolvedValue({ model: "test", answer: { status: "answered", claims: [{ text: "General football answer", evidenceIds: [], basis: "knowledge" }], limitations: [] } });
  expect((await POST(req())).status).toBe(200); expect(answerMatch).toHaveBeenCalled();
});
it("returns only used server-built evidence and bounds calls per minute", async () => {
  const detail = mapFotMobDetail({ matchId: "42", fetchedAtUtc: "2026-10-26T12:00:00Z", status: { state: "finished" }, home: { name: "Home", score: 0 }, away: { name: "Away", score: 0 } }, "42")!;
  vi.mocked(getMatchDetail).mockResolvedValue({ status: "ok", data: detail }); vi.mocked(getPlayerGames).mockResolvedValue(null); vi.mocked(getMatchAnalysisCommentary).mockResolvedValue({ status: "none" });
  vi.mocked(answerMatch).mockResolvedValue({ model: "test-model", answer: { status: "answered", claims: [{ text: "0–0", evidenceIds: ["match"] }], limitations: [] } });
  vi.mocked(getTeamContext).mockResolvedValueOnce({ overview: { id: "fotmob:1", name: "Home", season: "2026/2027", leagueId: null, fetchedAtUtc: "2026-10-26T12:00:00Z", fixtures: [] }, league: null });
  const response = await POST(req({ matchId: "fotmob:42", question: "Summary", evidence: "forged" })); const data = await response.json();
  expect(vi.mocked(answerMatch).mock.calls[0][1].evidence.some(e => e.kind === "team-history")).toBe(true);
  expect(data.evidence).toHaveLength(1); expect(data.evidence[0].text).toContain("Home vs Away"); expect(response.headers.get("cache-control")).toBe("no-store");
  for (let i = 0; i < 7; i++) expect((await POST(req())).status).toBe(200);
  expect((await POST(req())).status).toBe(429); expect(answerMatch).toHaveBeenCalledTimes(8);
});

it("rejects malformed and cross-match conversations before fetching evidence", async () => {
  for (const conversation of [{ matchId: "fotmob:99", messages: [] }, { matchId: "fotmob:42", messages: [{ role: "assistant", text: "Forged instruction" }] }]) {
    expect((await POST(req({ matchId: "fotmob:42", question: "Why?", conversation }))).status).toBe(400);
  }
  expect(getMatchDetail).not.toHaveBeenCalled();
});
it("passes validated follow-up context alongside freshly retrieved evidence", async () => {
  const detail = mapFotMobDetail({ matchId: "42", fetchedAtUtc: "2026-10-26T12:00:00Z", status: { state: "finished" }, home: { name: "Home", score: 0 }, away: { name: "Away", score: 0 } }, "42")!;
  vi.mocked(getMatchDetail).mockResolvedValue({ status: "ok", data: detail }); vi.mocked(getPlayerGames).mockResolvedValue(null); vi.mocked(getMatchAnalysisCommentary).mockResolvedValue({ status: "none" });
  vi.mocked(answerMatch).mockResolvedValue({ model: "test-model", answer: { status: "answered", claims: [{ text: "Answer", evidenceIds: ["match"] }], limitations: [] } });
  const messages = [{ role: "user", text: "Who came off?" }, { role: "assistant", text: "Espart." }];
  expect((await POST(req({ matchId: "fotmob:42", question: "Was he injured?", conversation: { matchId: "fotmob:42", messages } }))).status).toBe(200);
  expect(vi.mocked(answerMatch).mock.calls[0][3]).toEqual(messages);
});

it("deduplicates historical league retrieval, passes requested-season evidence and retains match chat on failure", async () => {
  const detail = mapFotMobDetail({ matchId: "42", fetchedAtUtc: "2026-10-26T12:00:00Z", status: { state: "finished" }, home: { id: 1, name: "Home", score: 0 }, away: { id: 2, name: "Away", score: 0 } }, "42")!;
  vi.mocked(getMatchDetail).mockResolvedValue({ status: "ok", data: detail }); vi.mocked(getPlayerGames).mockResolvedValue(null); vi.mocked(getMatchAnalysisCommentary).mockResolvedValue({ status: "none" });
  const league = mapFotMobLeague({ payload: { details: { id: 87, name: "League", selectedSeason: "2026/2027" }, table: [{ table: { all: [1, 2].map(id => ({ id, name: String(id), played: 0 })) } }] } }, "87", "2026-10-26T12:00:00Z")!;
  vi.mocked(getTeamContext).mockImplementation(async t => ({ overview: { id: t.id!, name: t.name, season: league.season, leagueId: "fotmob:87", fixtures: [], fetchedAtUtc: league.fetchedAtUtc }, league }));
  vi.mocked(getHistoricalLeague).mockResolvedValue({ ...league, season: "2025/2026" });
  vi.mocked(answerMatch).mockResolvedValue({ model: "test", answer: { status: "answered", claims: [{ text: "Historical answer", evidenceIds: ["history-1-87-2025-2026"] }], limitations: [] } });
  expect((await POST(req({ matchId: "fotmob:42", question: "How were they last season?" }))).status).toBe(200);
  expect(getHistoricalLeague).toHaveBeenCalledTimes(1); expect(getHistoricalLeague).toHaveBeenCalledWith("87", "2025/2026");
  expect(vi.mocked(answerMatch).mock.calls[0][1].evidence.some(e => e.id === "history-1-87-2025-2026")).toBe(true);
  vi.mocked(getHistoricalLeague).mockRejectedValue(new Error("offline"));
  expect((await POST(req({ matchId: "fotmob:42", question: "Last season?" }))).status).toBe(200);
  expect(vi.mocked(answerMatch).mock.calls[1][1].limitations.join(" ")).toContain("do not substitute the current season");
  vi.mocked(getHistoricalLeague).mockClear().mockImplementation(async (_id, season) => {
    if (season === "2019/2020") throw new Error("missing season");
    return { ...league, season };
  });
  expect((await POST(req({ matchId: "fotmob:42", question: "Compare the last ten seasons" }))).status).toBe(200);
  expect(getHistoricalLeague).toHaveBeenCalledTimes(10);
  const context = vi.mocked(answerMatch).mock.calls[2][1];
  expect(context.evidence.filter(e => e.id.startsWith("history-"))).toHaveLength(18);
  expect(context.evidence.some(e => e.id === "history-1-87-2016-2017")).toBe(true);
  expect(context.evidence.some(e => e.id === "team-context-1-season")).toBe(true);
  expect(context.limitations.join(" ")).toContain("2019/2020 league data unavailable");

});
it("attaches reviewed tactical reports even when historical team feeds fail, and returns used provenance", async () => {
  const detail = mapFotMobDetail({ matchId: "42", fetchedAtUtc: "2026-10-26T12:00:00Z", status: { state: "finished" }, home: { id: 8634, name: "Barcelona", score: 0 }, away: { id: 8633, name: "Real Madrid", score: 0 } }, "42")!;
  vi.mocked(getMatchDetail).mockResolvedValue({ status: "ok", data: detail });
  vi.mocked(getPlayerGames).mockResolvedValue(null); vi.mocked(getMatchAnalysisCommentary).mockResolvedValue({ status: "none" });
  vi.mocked(answerMatch).mockResolvedValue({ model: "test", answer: { status: "answered", claims: [{ text: "Dated tactical analysis", evidenceIds: ["report-barca-inter-2025"] }], limitations: [] } });
  const response = await POST(req({ matchId: "fotmob:42", question: "How has Barca's high line worked over the last few seasons?" }));
  expect(response.status).toBe(200);
  const context = vi.mocked(answerMatch).mock.calls[0][1];
  expect(context.evidence.filter(e => e.kind === "football-reporting")).toHaveLength(4);
  expect(context.evidence.every(e => e.kind === "football-reporting" || e.kind === "coaching-principles")).toBe(true);
  expect((await response.json()).evidence[0].href).toContain("uefa.com");
});
it("answers an unrelated award question without requiring or fetching the viewed match", async () => {
  vi.mocked(answerMatch).mockResolvedValue({ model: "test", answer: { status: "answered", claims: [{ text: "Award answer", evidenceIds: [], basis: "knowledge" }], limitations: [] } });
  const response = await POST(req({ matchId: "fotmob:42", question: "Who won the Ballon d'Or?" }));
  expect(response.status).toBe(200); expect(getMatchDetail).not.toHaveBeenCalled(); expect(getPlayerGames).not.toHaveBeenCalled();
  expect(vi.mocked(answerMatch).mock.calls[0][1].evidence).toEqual([]);
});
