import "server-only";
import type { MatchDetail } from "../matches/detail-model";
import type { ChatMessage } from "../ai/conversation";
import type { ResearchDisplay } from "../ai/research";
const obj = (v: unknown): Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const rows = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
const name = (v: unknown) => typeof v === "string" ? v.trim() : "";
const normalize = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\bfc\b/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const leagues: [RegExp, string, string][] = [
  [/\b(efl(?: cup)?(?!\s+championship)|carabao|league cup)\b/i, "soccer_england_efl_cup", "EFL Cup"],
  [/\b(premier league|epl)\b/i, "soccer_epl", "Premier League"],
  [/\bchampions league\b/i, "soccer_uefa_champs_league", "Champions League"],
  [/\bla ?liga\b/i, "soccer_spain_la_liga", "LaLiga"],
  [/\bserie a\b/i, "soccer_italy_serie_a", "Serie A"],
  [/\bbundesliga\b/i, "soccer_germany_bundesliga", "Bundesliga"],
  [/\bligue 1\b/i, "soccer_france_ligue_one", "Ligue 1"],
  [/\bfa cup\b/i, "soccer_fa_cup", "FA Cup"],
];
export function oddsIntent(question: string, history: ChatMessage[], detail: MatchDetail | null) {
  const prior = [...history].reverse().find(m => m.role === "user" && !/\b(odds|bookmakers?)\b/i.test(m.text))?.text ?? "";
  const pairNamed = !!detail && normalize(question).includes(normalize(detail.match.home.name)) && normalize(question).includes(normalize(detail.match.away.name));
  const explicitMatch = pairNamed || /\b(this match|this game|match odds|match winner|match-winner|90 minutes)\b/i.test(question);
  const context = explicitMatch ? question : `${prior} ${question}`;
  const scope: "outrights" | "h2h" = /\b(outright|finalists?|entire|tournament|competition|reach.{0,15}final|win.{0,15}cup)\b/i.test(context) && !explicitMatch ? "outrights" : "h2h";
  const league = leagues.find(([pattern]) => pattern.test(question)) ?? leagues.find(([pattern]) => pattern.test(prior)) ?? leagues.find(([pattern]) => pattern.test(detail?.competitionName ?? ""));
  return { scope, league, prior, explicitMatch };
}
const cache = new Map<string, { until: number; value: unknown }>();
const pending = new Map<string, Promise<unknown>>();
async function load(path: string, params: Record<string, string>, ttl: number, signal?: AbortSignal): Promise<unknown> {
  const key = process.env.ODDS_API_KEY?.trim(); if (!key) throw new Error("setup");
  const cacheKey = `${key}:${path}:${JSON.stringify(params)}`, found = cache.get(cacheKey);
  if (found && found.until > Date.now()) return found.value;
  const existing = pending.get(cacheKey); if (existing) return existing;
  const work = (async () => {
    const url = new URL(`https://api.the-odds-api.com/v4/${path}`);
    for (const [k, v] of Object.entries({ ...params, apiKey: key })) url.searchParams.set(k, v);
    let response: Response;
    try { response = await fetch(url, { cache: "no-store", redirect: "error", signal: AbortSignal.any([AbortSignal.timeout(12000), ...(signal ? [signal] : [])]) }); }
    catch { throw new Error("unavailable"); }
    if (!response.ok) throw new Error(response.status === 429 ? "quota" : [401, 403].includes(response.status) ? "setup" : "unavailable");
    const data: unknown = await response.json();
    if (!Array.isArray(data)) throw new Error("invalid");
    if (cache.size >= 24) cache.delete(cache.keys().next().value!);
    cache.set(cacheKey, { until: Date.now() + ttl, value: data }); return data;
  })();
  pending.set(cacheKey, work);
  try { return await work; } finally { pending.delete(cacheKey); }
}
export function matchEvent(data: unknown, detail: MatchDetail) {
  const kickoff = Date.parse(detail.match.kickoffUtc ?? ""); if (!Number.isFinite(kickoff)) return null;
  const matches = rows(data).map(obj).filter(e => normalize(name(e.home_team)) === normalize(detail.match.home.name) && normalize(name(e.away_team)) === normalize(detail.match.away.name) && Math.abs(Date.parse(name(e.commence_time)) - kickoff) <= 300000);
  return matches.length === 1 ? matches[0] : null;
}
export type Quote = { bookmaker: string; updated: string; outcomes: { name: string; price: number }[] };
export function quotes(event: Record<string, unknown>, market: "h2h" | "outrights", now = Date.now()): Quote[] {
  return rows(event.bookmakers).map(obj).flatMap(book => {
    const data = rows(book.markets).map(obj).find(m => m.key === market); if (!data || !name(book.title)) return [];
    const updated = name(data.last_update) || name(book.last_update), time = Date.parse(updated);
    if (!Number.isFinite(time) || time > now + 60000 || now - time > 15 * 60000) return [];
    const outcomes = rows(data.outcomes).map(obj).map(o => ({ name: name(o.name), price: o.price })).filter((o): o is { name: string; price: number } => !!o.name && typeof o.price === "number" && Number.isFinite(o.price) && o.price > 1);
    if (outcomes.length !== rows(data.outcomes).length || new Set(outcomes.map(o => normalize(o.name))).size !== outcomes.length) return [];
    if (market === "h2h" && (outcomes.length !== 3 || ![name(event.home_team), name(event.away_team), "Draw"].every(team => outcomes.some(o => normalize(o.name) === normalize(team))))) return [];
    if (market === "outrights" && outcomes.length < 2) return [];
    return [{ bookmaker: name(book.title), updated, outcomes: outcomes.sort((a, b) => a.price - b.price) }];
  }).sort((a, b) => a.bookmaker.localeCompare(b.bookmaker)).slice(0, 3);
}
export async function answerOdds(question: string, history: ChatMessage[], detail: MatchDetail | null, signal?: AbortSignal) {
  const intent = oddsIntent(question, history, detail), title = intent.league?.[2] ?? "this competition";
  const finish = (text: string, answered = false, sourced = false) => ({ model: "verified-odds", answer: { status: answered ? "answered" as const : "insufficient_evidence" as const, claims: answered ? [{ text, evidenceIds: [] as string[], basis: "research" as const }] : [], limitations: answered ? [] : [text] }, research: { sources: sourced ? [{ title: "The Odds API · current market data", url: "https://the-odds-api.com/" }] : [], suggestionsHtml: "", checkedAtUtc: new Date().toISOString() } satisfies ResearchDisplay });
  if (!process.env.ODDS_API_KEY?.trim()) {
    const priorOpinion = history.some(m => m.role === "assistant" && /favourit|favorit|paper picks?|strongest|contenders?/i.test(m.text));
    return finish(`I can't verify live ${title === "this competition" ? "" : `${title} `}bookmaker prices here yet.${priorOpinion ? " My earlier picks were an on-paper assessment, not a bookmaker ranking." : ""} We'd need current tournament winner or reach-the-final prices, rather than odds for this one match.`);
  }
  if (!intent.league) return finish("Which competition and match do you mean? I need to match the prices to the right event and market.");
  try {
    signal?.throwIfAborted();
    const catalog = rows(await load("sports/", { all: "true" }, 1800000, signal)).map(obj);
    signal?.throwIfAborted();
    const base = catalog.find(s => s.key === intent.league![1]);
    const sport = intent.scope === "outrights" ? catalog.find(s => s.key === `${intent.league![1]}_winner` && s.has_outrights === true) ?? (base?.has_outrights === true ? base : undefined) : base;
    if (!sport || intent.scope === "outrights" && sport.has_outrights !== true) return finish(`The connected feed doesn't offer ${title} tournament-winner or reach-the-final odds. It covers match prices, so I can't use it to give an odds-based finalist ranking.`, false, true);
    if (sport.active !== true || typeof sport.key !== "string" || !/^soccer_[a-z0-9_]+$/.test(sport.key)) return finish(`The ${title} odds market isn't active in the connected feed right now.`);
    if (intent.scope === "h2h" && (!detail || detail.competitionName && !intent.league[0].test(detail.competitionName))) return finish("Open the match you mean, then ask for its odds. I won't substitute prices for a different fixture.");
    if (intent.scope === "h2h" && detail) {
      const q = normalize(question);
      const pairNamed = q.includes(normalize(detail.match.home.name)) && q.includes(normalize(detail.match.away.name));
      const contextual = /\b(this match|this game|here|based on)\b/i.test(question) || /^(?:(?:what are the|show me|give me|compare)\s+)?(?:(?:current|live|latest|betting|bookmaker|match)\s+)*(?:odds|prices)\s*[?.!]*$/i.test(question.trim());
      if (!pairNamed && !contextual) return finish("Do you mean odds for the match you're viewing? Name both teams if you mean a different fixture.");
    }
    const data = await load(`sports/${sport.key}/odds/`, { regions: "uk", markets: intent.scope, oddsFormat: "decimal" }, 120000, signal);
    signal?.throwIfAborted();
    const validEvents = rows(data).map(obj).filter(e => e.sport_key === sport.key);
    const event = intent.scope === "h2h" ? matchEvent(validEvents, detail!) : validEvents.length === 1 ? validEvents[0] : null;
    if (!event) return finish(`I couldn't match a single ${title} market to this request. I won't substitute another event's prices.`);
    const prices = quotes(event, intent.scope);
    if (!prices.length) return finish("I couldn't find a complete, recently updated bookmaker quote for that market. I won't show old or partial prices as current.");
    const lines = prices.map(q => `${q.bookmaker}, updated ${new Date(q.updated).toISOString().replace("T", " ").replace(".000Z", " UTC")}: ${q.outcomes.slice(0, intent.scope === "outrights" ? 6 : 3).map(o => `${o.name} ${o.price.toFixed(2)}`).join(", ")}.`);
    return finish(`${intent.scope === "h2h" ? `${name(event.home_team)} vs ${name(event.away_team)} — 90-minute match-winner odds` : `${title} — tournament-winner odds`}, in decimal format.\n\n${lines.join("\n\n")}\n\n${intent.scope === "h2h" ? "The shortest price in each quote indicates that bookmaker's favourite for this match; these aren't cup-winner or qualification odds." : "These rank tournament-winning favourites, not the probabilities of reaching the final or a confirmed final pairing."}`, true, true);
  } catch (e) {
    if (signal?.aborted) throw e;
    const code = e instanceof Error ? e.message : "unavailable";
    return finish(code === "quota" ? "The odds provider's usage limit has been reached. I can't refresh the prices right now." : code === "setup" ? "The odds provider couldn't authenticate the saved key. The local key setting needs checking." : "The odds feed couldn't be reached just now. I won't guess the prices—try again shortly.");
  }
}
