import { focusMatchAnalysis, ratingFormulaReply } from "../../../lib/ai/analysis";
import { isVenueQuestion, answerVenue } from "../../../lib/venues/service";
import { finalPairConflict } from "../../../lib/tournaments/facts";
import { isTournamentQuestion } from "../../../lib/tournaments/intent";
import { loadTournamentContext } from "../../../lib/tournaments/context";
import { answerOdds } from "../../../lib/odds/service";
import { isLocalSameOrigin } from "../../../lib/ai/local-origin";
import { identifyMatch, isMatchIdentification } from "../../../lib/ai/match-identification";
import { createRequestGate, RequestFailure } from "../../../lib/ai/request-lifecycle";
import { needsFreshResearch, refersToViewedMatch, isStandaloneConcept, continuesGeneralTopic, isOddsQuestion } from "../../../lib/ai/freshness";
import { getFootballReporting } from "../../../lib/football-reporting/retrieve";
import { resolveSeasons } from "../../../lib/teams/seasons";
import { getHistoricalLeague } from "../../../lib/teams/history-service";
import { buildHistoricalEvidence } from "../../../lib/ai/history-evidence";
import { getTeamContext } from "../../../lib/teams/service";
import { buildTeamEvidence } from "../../../lib/ai/team-evidence";
import { parseConversation } from "../../../lib/ai/conversation";
import { getMatchDetail } from "../../../lib/matches/detail-service";
import { getPlayerGames } from "../../../lib/matches/player-service";
import { getMatchAnalysisCommentary } from "../../../lib/matches/commentary-service";
import { buildMatchEvidence } from "../../../lib/ai/evidence";
import { aiConfigured, AiError, answerMatch } from "../../../lib/ai/gemini";
const headers = { "Cache-Control": "no-store" };
const error = (code: string, message: string, status: number) => Response.json({ code, message }, { status, headers });
const runRequest = createRequestGate();

export async function POST(request: Request) {
  // This prototype has no accounts. Keep the paid endpoint local and same-origin.
  if (!isLocalSameOrigin(request)) return error("forbidden", "AI is available only from this local website.", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return error("invalid", "Send a question as JSON.", 415);
  let body: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return error("invalid", "Enter a question.", 400);
    const chunks: Uint8Array[] = []; let bytes = 0;
    while (true) {
      const part = await reader.read(); if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 65536) { await reader.cancel(); return error("invalid", "This conversation is too long. Start a new chat.", 413); }
      chunks.push(part.value);
    }
    const all = new Uint8Array(bytes); let offset = 0;
    for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.byteLength; }
    body = JSON.parse(new TextDecoder().decode(all));
  } catch { return error("invalid", "Enter a valid question.", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return error("invalid", "Enter a valid question.", 400);
  const { matchId, question } = body as Record<string, unknown>;
  if (typeof matchId !== "string" || !/^fotmob:[1-9]\d{0,11}$/.test(matchId) || typeof question !== "string" || !question.trim() || question.length > 1200) return error("invalid", "Choose a valid match and enter a question of up to 1,200 characters.", 400);
  let history;
  try { history = parseConversation((body as Record<string, unknown>).conversation, matchId); }
  catch { return error("invalid", "This conversation could not be read. Start a new chat.", 400); }
  if (!aiConfigured()) return error("setup", "AI isn’t connected yet. The project owner needs to finish the server setup.", 503);
  const started = Date.now(), requestId = crypto.randomUUID();
  try {
    return await runRequest(request.signal, async signal => {
      const ratingMethod = ratingFormulaReply(question, history);
      if (ratingMethod) return Response.json({ model: "rating-method", answer: { status: "answered", claims: [{ text: ratingMethod, evidenceIds: [], basis: "knowledge" }], limitations: [] }, evidence: [], coverage: [], answeredAtUtc: new Date().toISOString() }, { headers });
      if (isVenueQuestion(question, history)) {
        const detail = await getMatchDetail(matchId);
        signal.throwIfAborted();
        if (detail.status !== "ok") return error("unavailable", "I couldn't load this match's identity to check its venue. Try again in a moment.", 502);
        const result = await answerVenue(question, history, detail.data, signal);
        return Response.json({ ...result, coverage: [], answeredAtUtc: new Date().toISOString() }, { headers });
      }
      if (isMatchIdentification(question)) {
        const detail = await getMatchDetail(matchId);
        signal.throwIfAborted();
        if (detail.status !== "ok") return error("unavailable", "I couldn't load this match's details. Try again in a moment.", 502);
        const context = buildMatchEvidence(detail.data, null, { status: "none" });
        return Response.json({ answer: { status: "answered", claims: [{ text: identifyMatch(detail.data), evidenceIds: ["match"], basis: "context" }], limitations: [] }, model: "match-facts", evidence: context.evidence.filter(e => e.id === "match"), coverage: [], answeredAtUtc: new Date().toISOString() }, { headers });
      }
      if (isOddsQuestion(question) && needsFreshResearch(question, history)) {
        const detail = await getMatchDetail(matchId);
        signal.throwIfAborted();
        const result = await answerOdds(question, history, detail.status === "ok" ? detail.data : null, signal);
        return Response.json({ ...result, evidence: [], coverage: [], answeredAtUtc: new Date().toISOString() }, { headers });
      }
      if (isTournamentQuestion(question, history)) {
        const detail = await getMatchDetail(matchId);
        signal.throwIfAborted();
        const context = await loadTournamentContext(question, history, detail.status === "ok" ? detail.data : null, signal);
        if (context.fallbackToResearch) {
          const result = await answerMatch(question.trim(), { evidence: context.evidence, limitations: context.limitations }, signal, history);
          const used = new Set(result.answer.claims.flatMap(c => c.evidenceIds));
          return Response.json({ ...result, evidence: context.evidence.filter(e => used.has(e.id)), coverage: [], answeredAtUtc: new Date().toISOString() }, { headers });
        }
        if (!context.evidence.length) return Response.json({ answer: { status: "insufficient_evidence", claims: [], limitations: context.limitations }, model: "competition-context", evidence: [], coverage: [], answeredAtUtc: new Date().toISOString() }, { headers });
        const dates = [...new Set(context.data?.fixtures.filter(f => f.stage?.toLowerCase() === "final" && f.match.kickoffUtc).map(f => f.match.kickoffUtc!.slice(0, 10)))];
        const finalDate = context.data?.calendar?.finalDate ?? (dates.length === 1 ? dates[0] : null);
        if (finalDate && /^(?:when|what date|which date)\b.*\bfinal\b/i.test(question.trim()) && !/\b(who|why|predict|finalists)\b/i.test(question)) {
          const formatted = new Date(`${finalDate}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" });
          const source = context.data?.calendar?.finalDate ? "tournament-calendar" : "tournament";
          return Response.json({ answer: { status: "answered", claims: [{ text: `The ${context.data?.season} ${context.data?.name} final is scheduled for ${formatted}.`, evidenceIds: [source], basis: "context" }], limitations: [] }, model: "competition-facts", evidence: context.evidence.filter(e => e.id === source), coverage: [], answeredAtUtc: new Date().toISOString() }, { headers });
        }
        const conflict = context.data && finalPairConflict(question, context.data);
        if (conflict) return Response.json({ answer: { status: "answered", claims: [{ text: conflict, evidenceIds: ["tournament"], basis: "context" }], limitations: [] }, model: "competition-facts", evidence: context.evidence.filter(e => e.id === "tournament"), coverage: [], answeredAtUtc: new Date().toISOString() }, { headers });
        const result = await answerMatch(question.trim(), context, signal, history);
        const used = new Set(result.answer.claims.flatMap(c => c.evidenceIds));
        return Response.json({ ...result, evidence: context.evidence.filter(e => used.has(e.id)), coverage: [], answeredAtUtc: new Date().toISOString() }, { headers });
      }
      const explicitMatchReference = refersToViewedMatch(question, history);
      const broadTopic = /ballon|balon|\b(awards?|biography|biographies|profile|who is|who was|tell me about)\b/i.test(question);
      if (!explicitMatchReference && (broadTopic || continuesGeneralTopic(question, history) || isStandaloneConcept(question) || needsFreshResearch(question, history))) {
        const result = await answerMatch(question.trim(), { evidence: [], limitations: [] }, signal, history);
        return Response.json({ ...result, evidence: [], coverage: [], answeredAtUtc: new Date().toISOString() }, { headers });
      }
      const [detail, players, commentary] = await Promise.all([getMatchDetail(matchId), getPlayerGames(matchId), getMatchAnalysisCommentary(matchId)]);
      if (detail.status !== "ok") {
        const result = await answerMatch(question.trim(), { evidence: [], limitations: ["Viewed match data is unavailable. Do not invent its details; general football questions can still be answered or researched."] }, signal, history);
        return Response.json({ ...result, evidence: [], coverage: [], answeredAtUtc: new Date().toISOString() }, { headers });
      }
      signal.throwIfAborted();
      const context = focusMatchAnalysis(buildMatchEvidence(detail.data, players, commentary), detail.data, players, commentary, question, history);
      const reporting = getFootballReporting(question, history, [detail.data.match.home, detail.data.match.away], new Date().toISOString());
      const historicalTactics = reporting.length > 0 && /\b(seasons?|years?|start|began|begin|since|history|historical)\b/i.test(question) && !/\b(points|goals|results|wins|losses|table|position|record|xg|titles|trophies)\b/i.test(question);
      context.evidence.push(...reporting);
      const teams = await Promise.all([getTeamContext(detail.data.match.home), getTeamContext(detail.data.match.away)]);
      signal.throwIfAborted();
      const historical = [];
      const seasonNotes: string[] = [];
      // Only verified participant/league IDs select endpoints. Deduplicate shared leagues.
      const loads = new Map<string, ReturnType<typeof getHistoricalLeague>>();
      for (const team of teams) {
        if (!team?.league) continue;
        const selection = resolveSeasons(question, team.league.season, history);
        if (selection.note) seasonNotes.push(`${team.overview.name}: ${selection.note}`);
        for (const season of selection.seasons) {
          const key = `${team.league.competition.id}:${season}`;
          if (!loads.has(key)) loads.set(key, getHistoricalLeague(team.league.competition.id.slice(7), season));
        }
      }
      const loaded = new Map(await Promise.all([...loads].map(async ([key, promise]) => {
        try { return [key, await promise] as const; } catch { return [key, null] as const; }
      })));
      signal.throwIfAborted();
      for (const team of teams) {
        if (!team?.league) continue;
        for (const season of resolveSeasons(question, team.league.season, history).seasons) {
          const league = loaded.get(`${team.league.competition.id}:${season}`);
          const item = league ? buildHistoricalEvidence(league, { id: team.overview.id, name: team.overview.name, shortName: null, crestUrl: null }, new Date().toISOString(), loads.size > 5) : null;
          if (item) historical.push(item);
          else seasonNotes.push(`${team.overview.name}: ${season} league data unavailable or team not present; do not substitute the current season or infer historical membership.`);
        }
      }
      context.limitations.push(...seasonNotes);
      const teamContext = buildTeamEvidence(teams, detail.data.match, new Date().toISOString());
      // Team history has a separate small budget, preserving the detailed match narrative.
      let teamSize = 0;
      for (const item of [...historical, ...teamContext.evidence]) {
        const size = JSON.stringify(item).length;
        if (teamSize + size > 40000) { teamContext.limitations.push("Some team context was omitted by the size limit."); continue; }
        context.evidence.push(item); teamSize += size;
      }
      context.limitations.push(...teamContext.limitations);
      if (historicalTactics) {
        // Historical tactical reports answer this topic; a score table cannot establish its mechanisms.
        context.evidence = context.evidence.filter(e => e.kind === "football-reporting" || e.kind === "coaching-principles");
        context.limitations = seasonNotes;
      }
      signal.throwIfAborted();
      const result = await answerMatch(question.trim(), context, signal, history);
      const used = new Set(result.answer.claims.flatMap(c => c.evidenceIds));
      return Response.json({ ...result, evidence: context.evidence.filter(e => used.has(e.id)), coverage: context.limitations, answeredAtUtc: new Date().toISOString() }, { headers });
    });
  } catch (e) {
    const code = e instanceof AiError || e instanceof RequestFailure ? e.code : "unavailable";
    console.warn(`[ai-request] id=${requestId} code=${code} elapsedMs=${Date.now() - started}`);
    if (code === "busy") return error(code, "Another answer is still finishing. Wait a moment and send again.", 429);
    if (code === "timeout") return error(code, "That took too long. Your question is saved—try sending again.", 504);
    if (code === "cancelled") return error(code, "The request was stopped.", 499);
    const message = code === "research_unavailable" ? "I couldn’t verify that from the available research sources just now. Try naming the player, team or competition more specifically; research access or quota may also be unavailable." : code === "setup" ? "AI couldn’t connect. Check the server’s API key and model access." : code === "rate_limit" ? "The AI service is busy or has reached its usage limit. Try again later." : code === "invalid_answer" ? "The AI returned an incomplete or invalid reply. Your question is saved—try sending again." : "The AI service couldn’t finish the answer. Your question is saved—try sending again.";
    return error(code, message, code === "setup" ? 503 : code === "rate_limit" ? 429 : 502);
  }
}
