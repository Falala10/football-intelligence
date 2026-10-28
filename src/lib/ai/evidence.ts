import type { MatchDetail } from "../matches/detail-model";
import type { PlayerGames } from "../matches/player-model";
import type { CommentaryResult } from "../matches/commentary-model";
import type { MatchEvidence } from "./model";

export function buildMatchEvidence(detail: MatchDetail, players: PlayerGames | null, commentary: CommentaryResult) {
  const m = detail.match, path = `/matches/${encodeURIComponent(m.id)}`;
  const evidence: MatchEvidence[] = [];
  const add = (id: string, title: string, section: string, text: string, asOfUtc = detail.fetchedAtUtc) => {
    evidence.push({ id, title, href: `${path}#${section}`, asOfUtc, text });
  };
  add("match", "Match snapshot", "match-summary", `${m.home.name} vs ${m.away.name}. Competition: ${detail.competitionName ?? "unknown"}. Stage/round: ${detail.competitionStage ?? "unknown"}. Status: ${m.status}. Kickoff UTC: ${m.kickoffUtc ?? "unknown"}. Score: ${m.score ? `${m.score.home}–${m.score.away}` : "not available"}. Clock: ${m.live?.minuteLabel ?? "not available"}. Venue: ${detail.venue.stadium ?? "unknown"}.`);
  evidence.push({
    id: "coaching-principles", kind: "coaching-principles", title: "General coaching principles — not observations of this match",
    href: "https://www.fifatrainingcentre.com/en/game/game-analysis/out-of-possession/high-press.php", asOfUtc: "2026-10-26T00:00:00Z",
    text: "General coaching reference, reviewed 2026-10-26, not match footage or a team-specific report. A high defensive line positions the backline further from its own goal. It can support a high press by keeping team units compact and restricting build-up space. A high press and a high defensive line are related but are not the same action. Coordinated pressure, distances between units and goalkeeper positioning matter; if opponents bypass pressure, space can open for forward passes and runs behind the defence. Transition danger or offside counts alone do not establish defensive-line height or prove an offside trap. Use these principles to explain concepts and discuss conditional mechanisms, never to certify that this team used a particular strategy. An inference must identify its actual match observations, plausible mechanism and alternative explanations. Other football concepts may be explained from general football understanding, clearly as general principles rather than verified match facts.",
  });
  for (const [i, group] of (detail.stats ?? []).entries()) {
    add(`team-${i}`, group.title, "team-stats", group.items.map(s => `${s.label}: ${m.home.name} ${s.home ?? "unknown"}; ${m.away.name} ${s.away ?? "unknown"}`).join("\n"));
  }
  for (const side of ["home", "away"] as const) {
    const lineup = detail.lineups[side];
    if (lineup) add(`lineup-${side}`, `${m[side].name} lineup`, "match-lineups", `Formation: ${lineup.formation ?? "unknown"}. Coach: ${lineup.coach ?? "unknown"}. Starting XI: ${lineup.starters.map(p => `${p.name} (${p.position ?? "position unknown"}; provider rating ${p.rating ?? "not supplied"})`).join(", ")}. Substitutes listed (not proof of playing): ${lineup.substitutes.map(p => p.name).join(", ")}.`);
  }
  add("events", "Reported match events", "match-events", detail.events === null ? "Events not provided." : detail.events.length ? detail.events.slice(0, 150).map(e => `${e.minute ?? "minute unknown"} ${e.description}`).join("\n") : "No events reported yet; not proof that none occurred.");
  let commentaryOmitted = 0;
  if (commentary.status === "ok") {
    // Reserve the incident narrative before the large player-stat payload. Keep whole entries.
    const lines: string[] = []; let used = 0;
    for (const item of commentary.data.items) {
      const line = `${item.minute ?? "undated"} ${item.text}`;
      if (used + line.length > 40000) { commentaryOmitted++; continue; }
      lines.push(line); used += line.length;
    }
    add("commentary", `${commentary.data.source === "human" ? "Human-written" : "Automatic"} match commentary`, "match-commentary", `${commentaryOmitted ? `Partial transcript: ${commentaryOmitted} entries omitted by size limit.` : "All commentary entries returned by the source are included; upstream coverage may still be incomplete."} Newest first. Attribute incident descriptions to this source; preserve uncertainty in causal claims.\n${lines.join("\n")}`, commentary.data.fetchedAtUtc);
  }
  if (players?.matchId === m.id) {
    for (const [i, p] of players.players.slice(0, 48).entries()) {
      const stats = p.groups.flatMap(g => g.stats).slice(0, 72).map(s => {
        const percentage = s.total !== null && s.total > 0 ? `; calculated success/share ${Math.round(s.value / s.total * 1000) / 10}%` : "";
        const unit = ["speed", "distance", "distanceWithPercentage"].includes(s.type) ? " (provider units; unit interpretation unverified)" : "";
        return `${s.label}: ${s.value}${s.total !== null ? ` of ${s.total}${percentage}` : ""}${unit}`;
      });
      add(`player-${i}`, `${p.name} · ${p.team}`, "player-performance", `Minutes: ${p.minutes ?? "unknown"}. ${p.goalkeeper ? "Goalkeeper." : ""}\n${stats.length ? stats.join("\n") : "Detailed stats not supplied."}\nHeatmap: ${players.heatmaps[p.id]?.length ? "activity locations available; no time, action type or attacking-direction interpretation verified" : "not available"}.`, players.fetchedAtUtc);
    }
  }
  const limitations = [
    "Match and player data may come from separate fetch times. Ratings are provider assessments, not objective measurements of quality.",
    "Heatmap locations do not establish continuous movement, time spent, tactics or attacking direction.",
  ];
  if (commentaryOmitted) limitations.push(`${commentaryOmitted} commentary entries were omitted by the 40,000-character narrative limit.`);
  if ((detail.events?.length ?? 0) > 150) limitations.push("Only the first 150 reported events are included.");
  if (players?.players.some(p => p.groups.reduce((n, g) => n + g.stats.length, 0) > 72)) limitations.push("Some player statistics were omitted from the answer context.");
  if (!detail.stats?.length) limitations.push("Team stats are unavailable.");
  if (!players?.players.length) limitations.push("Detailed player stats are unavailable.");
  if (players && players.players.length > 48) limitations.push("Player context is limited to the first 48 squad entries.");
  if (commentary.status !== "ok") limitations.push("Commentary is unavailable or not provided.");
  // Bound model input and keep every advertised evidence item complete.
  const bounded: MatchEvidence[] = []; let size = 0;
  for (const item of evidence) {
    const length = JSON.stringify(item).length;
    if (size + length > 100000) { limitations.push("Some evidence was omitted to keep the answer context bounded."); break; }
    bounded.push(item); size += length;
  }
  return { matchId: m.id, evidence: bounded, limitations };
}
