import type { ChatMessage } from "./conversation";
import type { MatchDetail } from "../matches/detail-model";
import type { PlayerGames } from "../matches/player-model";
import type { CommentaryResult } from "../matches/commentary-model";
import type { MatchEvidence } from "./model";
const normal = (s: string) => ` ${s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
export function ratingFormulaReply(question: string, history: ChatMessage[] = []): string | null {
  const prior = [...history].reverse().find(m => m.role === "user")?.text ?? "";
  if (!/rating|rated/i.test(`${question} ${prior}`) || !/\b(points?|weights?|deductions?|formula|algorithm)\b/i.test(question) || !/\b(how many|how much|exact|each|formula|algorithm|weights?)\b/i.test(question)) return null;
  return "There isn't a verified points-per-action breakdown in our data, so I can't say how many rating points each goal added or what share of the score it explains. The goals and other recorded stats help explain the performance; they don't reveal the scoring weights.";
}
export function analysisFocus(question: string): "rating" | "substitution" | "match" | null {
  if (/\b(rating|rated|ratings)\b/i.test(question) || /\bwhy\b.*\b(?:get|got|given)\b.*\b\d[.,]\d\b/i.test(question)) return "rating";
  if (/\b(substitution|subbed|came off|come off|taken off|replaced|substitutions)\b/i.test(question)) return "substitution";
  return /\b(why|how|explain|analyse|analyze|analysis|what went wrong|turning point|what about)\b/i.test(question) && /\b(match|game|lose|lost|win|won|draw|drew|defeat|press|pressing|shape|chance|chances|defen\w*|attack\w*|midfield|left|right)\b/i.test(question) ? "match" : null;
}
/** Reorder verified observations for the question; do not derive tactics or rating weights. */
export function focusMatchAnalysis(context: { matchId: string; evidence: MatchEvidence[]; limitations: string[] }, detail: MatchDetail, players: PlayerGames | null, commentary: CommentaryResult, question: string, history: ChatMessage[]) {
  const priorQuestion = [...history].reverse().find(m => m.role === "user")?.text;
  const followup = /^(?:did (?:it|that) help|and (?:him|her|why)|what about (?:him|her)|why (?:him|her|so))\s*[?.!]*$/i.test(question.trim());
  if (!analysisFocus(question) && !(followup && priorQuestion && analysisFocus(priorQuestion))) return context;
  const validPlayers = players?.matchId === detail.match.id ? players : null;
  const roster = validPlayers?.players ?? [];
  const namesIn = (text: string) => roster.filter(p => {
    const name = normal(p.name).trim(), surname = name.split(" ").at(-1)!;
    return normal(text).includes(` ${name} `) || surname.length >= 4 && normal(text).includes(` ${surname} `);
  });
  let selected = namesIn(question);
  // User history resolves references only. It never supplies measurements or diagnoses.
  if (!selected.length && /\b(he|him|his|that rating|what about|and why)\b/i.test(question)) {
    const prior = [...history].reverse().find(m => m.role === "user");
    if (prior) selected = namesIn(prior.text);
  }
  const teams = [detail.match.home, detail.match.away];
  const referencedTeams = (text: string) => teams.filter(t => {
    const full = normal(t.name).trim(), last = full.split(" ").at(-1)!;
    return normal(text).includes(` ${full} `) || last.length >= 5 && normal(text).includes(` ${last} `);
  });
  let subjects = referencedTeams(question);
  if (!subjects.length && /\b(their|they|them|that team|its)\b/i.test(question)) {
    for (const message of [...history].reverse().filter(m => m.role === "user")) {
      const found = referencedTeams(message.text); if (found.length) { subjects = found; break; }
    }
  }
  const matchPath = `/matches/${encodeURIComponent(detail.match.id)}`;
  const observations: MatchEvidence[] = [];
  const lineups = (['home', 'away'] as const).flatMap(side => {
    const lineup = detail.lineups[side];
    return lineup ? [...lineup.starters, ...lineup.substitutes].filter(p => p.rating !== null).map(p => `${p.name} (${detail.match[side].name}): provider rating ${p.rating}.`) : [];
  });
  const stats = (detail.stats ?? []).flatMap(g => g.items.filter(s => /expected goals|\bxg\b|shots|big chances|possession|saves|touches.*box|passes.*third/i.test(s.label)).map(s => `${s.label}: ${detail.match.home.name} ${s.home ?? "not supplied"}; ${detail.match.away.name} ${s.away ?? "not supplied"}.`));
  observations.push({ id: "analysis-observations", kind: "match-observation", title: "Match analysis observations", href: `${matchPath}#match-summary`, asOfUtc: detail.fetchedAtUtc, text: `Match status: ${detail.match.status}. Whole-match totals are not before/after substitution splits or proof of tactical causation.\nKey supplied team measurements:\n${stats.join("\n") || "No relevant team measurements supplied."}\nReported formation labels (not continuous tracking): ${detail.match.home.name} ${detail.lineups.home?.formation ?? "not supplied"}; ${detail.match.away.name} ${detail.lineups.away?.formation ?? "not supplied"}.\nProvider lineup ratings:\n${lineups.join("\n") || "No lineup ratings supplied."}\nRating formula/weights and exact point deductions are not supplied. A user-stated rating is not a verified measurement. The listed lineup formation does not establish shape changes, pressing intensity or defensive line height.` });
  for (const p of selected.slice(0, 4)) {
    const stats = p.groups.flatMap(g => g.stats).slice(0, 100);
    const detailedRating = stats.find(s => /^(?:rating_title|fotmob_rating|rating)$/.test(s.key))?.value;
    const rating = (['home', 'away'] as const).flatMap(side => [...(detail.lineups[side]?.starters ?? []), ...(detail.lineups[side]?.substitutes ?? [])]).find(row => row.id === p.id)?.rating;
    observations.push({ id: `analysis-player-${p.id.slice(7)}`, kind: "match-observation", title: `${p.name} · focused performance`, href: `${matchPath}#player-performance`, asOfUtc: validPlayers!.fetchedAtUtc, text: `${p.name}; ${p.groups.flatMap(g => g.stats).length > 100 ? "Partial stats: first 100 supplied measurements. " : ""}team ${p.team}; minutes ${p.minutes ?? "not supplied"}; ${p.goalkeeper ? "goalkeeper" : "outfield player"}; detailed provider rating ${detailedRating ?? "not supplied"}; lineup rating ${rating ?? "not supplied"}.\n${stats.map(s => `${s.label} [${s.key}]: ${s.value}${s.total !== null ? ` of ${s.total}` : ""}; type ${s.type}`).join("\n")}\nThese are observed contributions, not an explanation of the provider's exact rating calculation. Missing stats are unknown, not zero. Provider distance/speed units are unverified.` });
  }
  if (commentary.status === "ok") {
    const relevant = commentary.data.items.filter(item => /goal|chance|save|penalty|red card|sent off|injur|replac|substitut|press|counter|through.ball|cross|offside/i.test(item.text) || selected.some(p => normal(item.text).includes(normal(p.name).trim())));
    let size = 0;
    const lines = relevant.flatMap(item => { const line = `${item.minute ?? "undated"}: ${item.text}`; if (size + line.length > 16000) return []; size += line.length; return [line]; });
    observations.push({ id: "analysis-incidents", kind: "match-observation", title: "Relevant reported incidents", href: `${matchPath}#match-commentary`, asOfUtc: commentary.data.fetchedAtUtc, text: `Selected ${lines.length} of ${commentary.data.items.length} returned entries, source ${commentary.data.source}; not a complete match timeline. Source order retained; preserve words expressing uncertainty.\n${lines.join("\n") || "No relevant narrative entries supplied."}` });
  }
  const ranked = [...context.evidence.filter(e => e.id === "match"), ...observations, ...context.evidence.filter(e => e.id !== "match")];
  let size = 0; const evidence = ranked.filter(item => { const length = JSON.stringify(item).length; if (size + length > 100000) return false; size += length; return true; });
  return { ...context, analysisRequest: { focus: analysisFocus(question) ?? (priorQuestion ? analysisFocus(priorQuestion) : null), subjectTeams: subjects.map(t => ({ id: t.id, name: t.name })), selectedPlayers: selected.map(p => ({ id: p.id, name: p.name })), ambiguousSubject: subjects.length > 1 }, evidence, limitations: [...context.limitations, ...(evidence.length < ranked.length ? ["Some lower-priority evidence was omitted from focused analysis."] : [])] };
}
