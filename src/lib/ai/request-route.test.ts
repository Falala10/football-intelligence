vi.mock("../tournaments/context", () => ({ loadTournamentContext: vi.fn() }));
import { loadTournamentContext } from "../tournaments/context";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("./gemini", async importOriginal => {
  const original = await importOriginal<typeof import("./gemini")>();
  return { ...original, aiConfigured: () => true, answerMatch: vi.fn() };
});
vi.mock("../matches/detail-service", () => ({ getMatchDetail: vi.fn() }));
vi.mock("../matches/player-service", () => ({ getPlayerGames: vi.fn() }));
vi.mock("../matches/commentary-service", () => ({ getMatchAnalysisCommentary: vi.fn() }));
import { answerMatch } from "./gemini";
import { getMatchDetail } from "../matches/detail-service";
const result = { answer: { status: "answered" as const, claims: [{ text: "A concept.", evidenceIds: [], basis: "knowledge" as const }], limitations: [] }, model: "test" };
const request = (controller = new AbortController()) => new Request("http://localhost:3000/api/match-ai", { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" }, body: JSON.stringify({ matchId: "fotmob:42", question: "What is a high line?" }), signal: controller.signal });
beforeEach(() => { vi.resetModules(); vi.mocked(answerMatch).mockReset(); vi.mocked(getMatchDetail).mockClear(); });
afterEach(() => vi.useRealTimers());
it("answers standalone concepts without match-data calls", async () => {
  vi.mocked(answerMatch).mockResolvedValue(result);
  const { POST } = await import("../../app/api/match-ai/route");
  expect((await POST(request())).status).toBe(200); expect(getMatchDetail).not.toHaveBeenCalled();
});
it("returns a bounded timeout and allows the next request to answer", async () => {
  vi.useFakeTimers(); vi.mocked(answerMatch).mockImplementationOnce(() => new Promise(() => {})).mockResolvedValue(result);
  const { POST } = await import("../../app/api/match-ai/route");
  const first = POST(request()); await vi.advanceTimersByTimeAsync(80001);
  expect((await first).status).toBe(504);
  expect((await POST(request())).status).toBe(200);
});
it("distinguishes busy, cancellation and retry at the actual endpoint", async () => {
  vi.mocked(answerMatch).mockImplementationOnce(() => new Promise(() => {})).mockResolvedValue(result);
  const { POST } = await import("../../app/api/match-ai/route"); const parent = new AbortController();
  const first = POST(request(parent));
  // Let body parsing and the gate begin before starting a concurrent request.
  await vi.waitFor(() => expect(answerMatch).toHaveBeenCalled());
  const busy = await POST(request()); expect(busy.status).toBe(429); expect((await busy.json()).code).toBe("busy");
  parent.abort(); expect((await first).status).toBe(499);
  expect((await POST(request())).status).toBe(200);
});

it("preserves local-only access before model calls", async () => {
  const { POST } = await import("../../app/api/match-ai/route");
  const req = new Request("http://localhost:3000/api/match-ai", { method: "POST", headers: { origin: "https://untrusted.example", "content-type": "application/json" }, body: "{}" });
  expect((await POST(req)).status).toBe(403); expect(answerMatch).not.toHaveBeenCalled();
});

it("keeps a current-club follow-up out of the unrelated viewed match", async () => {
  vi.mocked(answerMatch).mockResolvedValue(result);
  const { POST } = await import("../../app/api/match-ai/route");
  const req = new Request("http://localhost:3000/api/match-ai", { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" }, body: JSON.stringify({ matchId: "fotmob:42", question: "But why, beyond the scores?", conversation: { matchId: "fotmob:42", messages: [{ role: "user", text: "Why are Manchester United not doing well this season?" }, { role: "assistant", text: "Recent form needs investigation." }] } }) });
  expect((await POST(req)).status).toBe(200); expect(getMatchDetail).not.toHaveBeenCalled();
  expect(vi.mocked(answerMatch).mock.calls[0][1].evidence).toEqual([]);
});
it("answers what match is this with its stage without asking Gemini or loading player history", async () => {
  const { mapFotMobDetail } = await import("../matches/providers/fotmob-detail-map");
  vi.mocked(getMatchDetail).mockResolvedValue({ status: "ok", data: mapFotMobDetail({ matchId: "42", fetchedAtUtc: "2026-10-27T12:00:00Z", status: { state: "scheduled" }, home: { name: "Fleetwood Town" }, away: { name: "Arsenal" }, competition: { name: "EFL Cup", parentId: 133, round: "4" } }, "42")! });
  const { POST } = await import("../../app/api/match-ai/route");
  const req = new Request("http://localhost:3000/api/match-ai", { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" }, body: JSON.stringify({ matchId: "fotmob:42", question: "what match is this?" }) });
  const response = await POST(req); const data = await response.json();
  expect(response.status).toBe(200); expect(data.answer.claims[0].text).toContain("Round of 16");
  expect(data.evidence[0].text).toContain("Stage/round: Round of 16"); expect(answerMatch).not.toHaveBeenCalled();
});
it("accepts 127.0.0.1 after Next normalizes the request URL to localhost", async () => {
  const { POST } = await import("../../app/api/match-ai/route");
  const req = new Request("http://localhost:3000/api/match-ai", { method: "POST", headers: { origin: "http://127.0.0.1:3000", host: "127.0.0.1:3000", "content-type": "application/json" }, body: "{}" });
  const response = await POST(req); expect(response.status).toBe(400); expect((await response.json()).code).toBe("invalid");
});

it("routes a tournament-odds follow-up through the market adapter", async () => {
  vi.mocked(answerMatch).mockResolvedValue(result);
  const { POST } = await import("../../app/api/match-ai/route");
  const req = new Request("http://localhost:3000/api/match-ai", { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" }, body: JSON.stringify({ matchId: "fotmob:42", question: "based on betting odds?", conversation: { matchId: "fotmob:42", messages: [{ role: "user", text: "Who could be finalists for the entire EFL competition?" }, { role: "assistant", text: "Arsenal look strong on paper." }] } }) });
  expect((await POST(req)).status).toBe(200); expect(getMatchDetail).toHaveBeenCalledTimes(1); expect(answerMatch).not.toHaveBeenCalled();
});

it("answers a supplied competition final date directly without inventing a kickoff", async () => {
  const { mapTournament } = await import("../tournaments/map");
  const { tournamentEvidence } = await import("../tournaments/evidence");
  const data = mapTournament({ payload: { details: { id: 133, name: "EFL Cup", selectedSeason: "2026/2027" }, fixtures: { allMatches: [], fixtureInfo: { activeRound: { roundId: "4" } } } } }, "133", "2026-10-27T12:00:00Z")!;
  data.calendar = { finalDate: "2027-03-21", dates: [], sourceUrl: "https://www.efl.com/competitions/carabao-cup/", checkedAtUtc: "2026-10-27T12:00:00Z" };
  vi.mocked(getMatchDetail).mockResolvedValue({ status: "unavailable" });
  vi.mocked(loadTournamentContext).mockResolvedValue({ fallbackToResearch: false, data, evidence: tournamentEvidence(data), limitations: [] });
  const { POST } = await import("../../app/api/match-ai/route");
  const req = new Request("http://localhost:3000/api/match-ai", { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" }, body: JSON.stringify({ matchId: "fotmob:42", question: "When is the EFL Cup final?" }) });
  const response = await POST(req), body = await response.json();
  expect(response.status).toBe(200); expect(body.answer.claims[0].text).toContain("21 March 2027");
  expect(body.answer.claims[0].evidenceIds).toEqual(["tournament-calendar"]); expect(answerMatch).not.toHaveBeenCalled();
});

it("does not block general research for a competition outside the connected fixture adapters", async () => {
  vi.mocked(getMatchDetail).mockResolvedValue({ status: "unavailable" });
  vi.mocked(loadTournamentContext).mockResolvedValue({ fallbackToResearch: true, evidence: [], limitations: [] });
  vi.mocked(answerMatch).mockResolvedValue(result);
  const { POST } = await import("../../app/api/match-ai/route");
  const req = new Request("http://localhost:3000/api/match-ai", { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" }, body: JSON.stringify({ matchId: "fotmob:42", question: "Who won the World Cup in 2006?" }) });
  expect((await POST(req)).status).toBe(200); expect(answerMatch).toHaveBeenCalled();
  expect(vi.mocked(answerMatch).mock.calls[0][1].evidence).toEqual([]);
});

it("identifies any viewed cup before specialised tournament routing", async () => {
  const { mapFotMobDetail } = await import("../matches/providers/fotmob-detail-map");
  vi.mocked(getMatchDetail).mockResolvedValue({ status: "ok", data: mapFotMobDetail({ matchId: "42", fetchedAtUtc: "2026-10-27T12:00:00Z", status: { state: "scheduled" }, home: { name: "Borussia Dortmund" }, away: { name: "Werder Bremen" }, competition: { id: 936417, parentId: 209, name: "DFB Pokal", round: "2" } }, "42")! });
  const { POST } = await import("../../app/api/match-ai/route");
  const req = new Request("http://localhost:3000/api/match-ai", { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" }, body: JSON.stringify({ matchId: "fotmob:42", question: "what cup even is this?" }) });
  const response = await POST(req), body = await response.json();
  expect(response.status).toBe(200); expect(body.answer.claims[0].text).toBe("Borussia Dortmund vs Werder Bremen — DFB Pokal, Round 2.");
  expect(answerMatch).not.toHaveBeenCalled();
});
