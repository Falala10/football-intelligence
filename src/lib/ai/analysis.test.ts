import { expect, it } from "vitest";
import { analysisFocus, focusMatchAnalysis, ratingFormulaReply } from "./analysis";
import { buildMatchEvidence } from "./evidence";
import { mapFotMobDetail } from "../matches/providers/fotmob-detail-map";
import type { PlayerGames } from "../matches/player-model";
const detail = () => mapFotMobDetail({ matchId: "42", fetchedAtUtc: "2026-10-28T12:00:00Z", home: { id: 1, name: "Home", score: 0 }, away: { id: 2, name: "Away", score: 2 }, status: { state: "finished" }, available: { stats: true }, stats: [{ title: "Top", items: [{ title: "Expected goals (xG)", home: 1.2, away: 1.9 }] }], lineups: { home: { formation: "4-3-3", starters: [{ id: 7, name: "Alex Example", rating: 6.2 }] } } }, "42")!;
const players: PlayerGames = { matchId: "fotmob:42", fetchedAtUtc: "2026-10-28T12:01:00Z", heatmaps: {}, heatmapStatus: "not-provided", players: [{ id: "fotmob:7", name: "Alex Example", team: "Home", minutes: 65, goalkeeper: false, groups: [{ title: "Passing", stats: [{ key: "passes", label: "Accurate passes", value: 20, total: 30, type: "fractionWithPercentage" }] }] }] };
it("packages supplied chance quality and ratings without fabricating tactical or rating causes", () => {
  const d = detail(), context = focusMatchAnalysis(buildMatchEvidence(d, players, { status: "none" }), d, players, { status: "none" }, "Why did we lose this game?", []);
  const observations = context.evidence.find(e => e.id === "analysis-observations")!.text;
  expect(observations).toContain("Home 1.2; Away 1.9"); expect(observations).toContain("provider rating 6.2");
  expect(observations).toContain("not before/after substitution splits");
  expect(observations).not.toContain("high press caused");
});
it("resolves a player follow-up from user context and keeps its original timestamp and fractions", () => {
  const d = detail(), context = focusMatchAnalysis(buildMatchEvidence(d, players, { status: "none" }), d, players, { status: "none" }, "Why did he get a 6.2?", [{ role: "user", text: "How was Alex Example?" }, { role: "assistant", text: "He got a 9.9" }]);
  const player = context.evidence.find(e => e.id === "analysis-player-7")!;
  expect(player.asOfUtc).toBe(players.fetchedAtUtc); expect(player.text).toContain("20 of 30"); expect(player.text).toContain("rating 6.2"); expect(player.text).not.toContain("9.9");
});
it("retains a requested player beyond the old first-48 limit within the evidence budget", () => {
  const d = detail(), all = { ...players, players: [...Array.from({ length: 49 }, (_, i) => ({ ...players.players[0], id: `fotmob:${100+i}`, name: `Other ${i}` })), players.players[0]] };
  const context = focusMatchAnalysis(buildMatchEvidence(d, all, { status: "none" }), d, all, { status: "none" }, "Explain Alex Example's rating", []);
  expect(context.evidence.find(e => e.id === "analysis-player-7")).toBeDefined();
  expect(JSON.stringify(context.evidence).length).toBeLessThan(100001);
});
it("rejects mismatched player snapshots and preserves uncertainty in selected incidents", () => {
  const d = detail(), commentary = { status: "ok" as const, data: { source: "human" as const, fetchedAtUtc: "2026-10-28T12:02:00Z", items: [{ id: "1", minute: "30", text: "Example seemingly succumbs to an injury and is replaced." }] } };
  const context = focusMatchAnalysis(buildMatchEvidence(d, null, commentary), d, { ...players, matchId: "fotmob:999" }, commentary, "Why was Example subbed?", []);
  expect(context.evidence.some(e => e.id === "analysis-player-7")).toBe(false);
  expect(context.evidence.find(e => e.id === "analysis-incidents")?.text).toContain("seemingly");
});
it("leaves non-analysis topics on their existing path", () => {
  expect(analysisFocus("Who won the Ballon d'Or?")).toBeNull();
  expect(analysisFocus("Why did he get a 7.4?")).toBe("rating");
  expect(analysisFocus("Did the substitution help?")).toBe("substitution");
});
it("keeps short analysis follow-ups on their evidence while leaving a new topic alone", () => {
  const d = detail(), base = buildMatchEvidence(d, players, { status: "none" });
  expect(analysisFocus("What about their midfield?")).toBe("match");
  expect(focusMatchAnalysis(base, d, players, { status: "none" }, "Did it help?", [{ role: "user", text: "Why was Example subbed?" }]).evidence.some(e => e.id === "analysis-observations")).toBe(true);
  expect(focusMatchAnalysis(base, d, players, { status: "none" }, "Who won the award?", []).evidence.some(e => e.id === "analysis-observations")).toBe(false);
});

it("answers exact rating-weight questions without inventing action points or intercepting table points", () => {
  expect(ratingFormulaReply("How many rating points did each goal add?")).toContain("don't reveal the scoring weights");
  expect(ratingFormulaReply("How many points did each goal add?", [{ role: "user", text: "Explain his rating" }])).not.toBeNull();
  expect(ratingFormulaReply("How many points are Barcelona ahead?")).toBeNull();
});

it("keeps their midfield anchored to the team in the user's question, not the assistant's opponent discussion", () => {
  const d = detail(), base = buildMatchEvidence(d, players, { status: "none" });
  const c = focusMatchAnalysis(base, d, players, { status: "none" }, "What about their midfield?", [{ role: "user", text: "Why did Home lose this game?" }, { role: "assistant", text: "Away were effective." }]);
  expect("analysisRequest" in c && c.analysisRequest.subjectTeams.map(t => t.name)).toEqual(["Home"]);
});
