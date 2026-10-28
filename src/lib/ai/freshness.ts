import { isStatementQuestion } from "./statements";
import type { ChatMessage } from "./conversation";
/** Conservative triggers: fresh reporting cannot silently fall back to model memory. */
export function needsFreshResearch(question: string, history: ChatMessage[] = [], year = new Date().getUTCFullYear()): boolean {
  const q = question.toLowerCase();
  const years = [...q.matchAll(/\b((?:18|19|20)\d{2})\b/g)].map(m => +m[1]);
  if (years.length && years.every(y => y < year) && !/\b(latest|today|yesterday|currently|right now|this week|breaking|live)\b/.test(q)) return false;
  if (isStatementQuestion(question)) return true;
  if (isOddsQuestion(question) && !/^(?:what (?:is|are)|explain|how (?:do|does))\s+(?:the\s+)?(?:(?:fractional|decimal|american|betting)\s+)?odds(?:\s+(?:work|mean))?\s*[?.!]*$/i.test(question.trim())) return true;
  if (/\b(latest|today|yesterday|tonight|currently|right now|this week|this month|breaking|news|rumou?rs?|transfer(?:s)?|drama|controvers(?:y|ies)|injur(?:y|ies)|current form|recent form)\b/.test(q)) return true;
  if (/\bthis season\b/.test(q) && /why|how|doing|form|perform|struggl|standing|table/.test(q)) return true;
  if (/\b(current|recent|lately|live)\b/.test(q) && /\b(score|results?|form|playing|team|club|manager|coach|squad|contract|standings)\b/.test(q)) return true;
  if (/\b(he|him|his|they|them|their|that|what about)\b/.test(q)) {
    const prior = [...history].reverse().find(m => m.role === "user");
    return prior ? needsFreshResearch(prior.text, [], year) : false;
  }
  return false;
}

/** Keep a specific match discussion on its loaded evidence before considering broader news. */
export function refersToViewedMatch(question: string, history: ChatMessage[] = []): boolean {
  const local = /\b(this match|this game|here|home team|away team|came off|come off|substitution|first goal|second goal|yellow card|red card)\b/i;
  if (local.test(question)) return true;
  const prior = [...history].reverse().find(m => m.role === "user");
  return /\b(he|him|his|they|them|their|that|it)\b/i.test(question) && !!prior && local.test(prior.text);
}

export function isAnalysisQuestion(question: string) {
  return /\b(why|how|explain)\b/i.test(question) && /season|form|doing|perform|struggl|tactic|risk|press|line|defen|attack|scores?|results?/i.test(question);
}

/** Narrow, standalone concepts can be answered without fetching the viewed match. */
export function isStandaloneConcept(question: string): boolean {
  return /^(?:what (?:is|are)|explain|how does)\b/i.test(question.trim()) &&
    /\b(high (?:defensive )?line|offside(?: trap)?|gegenpress(?:ing)?|expected goals|xg|false nine|low block|rest defen[cs]e|inverted full.?back)\b/i.test(question) &&
    !/\b(this|that|they|their|he|his|match|game|season|barca|barcelona|united|madrid)\b/i.test(question);
}

/** Resolve scope from user turns; stop when a new substantive topic intervenes. */
function generalTopicAnchor(history: ChatMessage[]): string | undefined {
  for (const prior of [...history].reverse().filter(m => m.role === "user")) {
    if (refersToViewedMatch(prior.text)) return;
    if (needsFreshResearch(prior.text) || isStandaloneConcept(prior.text) || /ballon|balon|\b(biography|who is|who was)\b/i.test(prior.text)) return prior.text;
    if (!/^(?:but why\b|so why\b|who (?:came|finished) (?:second|third)\b|what about (?:him|her|them)\b|compare that\b)/i.test(prior.text.trim())) return;
  }
}
export function continuesGeneralTopic(question: string, history: ChatMessage[] = []): boolean {
  if (refersToViewedMatch(question, history) || question.trim().split(/\s+/).length > 14 || !/^(?:but\b|so\b|and\b|why\b|how\b|who\b|what about\b|compare\b)/i.test(question.trim())) return false;
  return !!generalTopicAnchor(history);
}
export function awardLookupQuery(question: string, history: ChatMessage[] = []): string | undefined {
  const explicit = /ball?on\s*d[’' ]?or/i.test(question);
  const anchor = generalTopicAnchor(history);
  const prior = anchor && /ball?on\s*d[’' ]?or/i.test(anchor) ? anchor : undefined;
  if (!explicit && (!continuesGeneralTopic(question, history) || !/second|third|runner.up|won|winner/i.test(question))) return;
  const topic = explicit ? question : prior;
  const year = (question.match(/\b(?:19|20)\d{2}\b/) ?? topic?.match(/\b(?:19|20)\d{2}\b/))?.[0];
  if (!year) return;
  const women = /women|female/i.test(question) || (!/\bmen(?:['’]s)?\b/i.test(question) && /women|female/i.test(topic!));
  return `${year} Ballon d'Or ${women ? "women" : "men"} ${question}`;
}

/** Market requests require prices, not a team-strength opinion or a fan poll. */
export function isOddsQuestion(question: string): boolean {
  return /\b(odds|bookmakers?|betting markets?|betting prices|market favourites?|market favorites?)\b/i.test(question);
}
export function oddsResearchQuery(question: string, history: ChatMessage[] = []): string | undefined {
  if (!isOddsQuestion(question)) return;
  const previous = [...history].reverse().find(m => m.role === "user" && !isOddsQuestion(m.text));
  const scope = previous?.text ?? "";
  return `${scope} ${question} Current bookmaker prices; distinguish tournament outright/reach-final markets from individual-match odds.`.trim().slice(0, 650);
}
