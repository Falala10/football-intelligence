import type { ChatMessage } from "../ai/conversation";
/** Explicit season labels are the authority; never infer a football season from today's month. */
export function seasonStart(label: string | null): number | null {
  const m = /^(20\d{2})(?:\/(20\d{2}))?$/.exec(label ?? "");
  return m && (!m[2] || +m[2] === +m[1] + 1) ? +m[1] : null;
}
export function resolveSeasons(question: string, current: string | null, history: ChatMessage[] = []): { seasons: string[]; note: string } {
  const base = seasonStart(current), split = current?.includes("/");
  const label = (year: number) => split ? `${year}/${year + 1}` : String(year);
  const explicit = (text: string) => [...text.matchAll(/\b((?:19|20)\d{2})\s*[-/–]\s*(20\d{2}|\d{2})\b/g)].map(m => {
    const end = m[2].length === 2 ? 2000 + +m[2] : +m[2];
    return end === +m[1] + 1 ? +m[1] : NaN;
  });
  let text = question.toLowerCase();
  const temporal = /\b(last|previous|past|prior|recent)\b|\b20\d{2}\b/;
  if (/\b(?:season|year) before\b/.test(text)) {
    const anchor = [...history].reverse().find(m => m.role === "user" && temporal.test(m.text.toLowerCase()));
    const reference = anchor ? resolveSeasons(anchor.text, current, []).seasons : [];
    const year = reference.length === 1 ? seasonStart(reference[0]) : null;
    if (year === null || year <= 2000) return { seasons: [], note: "The earlier season is ambiguous or outside coverage; ask which season to compare." };
    return { seasons: [reference[0], label(year - 1)], note: `Compare the referenced ${reference[0]} season with ${label(year - 1)}, the season immediately before it. Current league season is ${current}.` };
  }
  // Only user turns resolve scope. An assistant's mistaken season cannot select retrieval.
  if (!temporal.test(text) && (!/\b(?:this|current)\s+season\b/.test(text) || /\bcompar/.test(text)) && /\b(compare|comparison|that season|same period|same seasons|what about|then|their|they|goals|points|better|worse)\b/.test(text)) {
    const previous = [...history].reverse().find(m => m.role === "user" && temporal.test(m.text.toLowerCase()));
    if (previous) text = previous.text.toLowerCase();
  }
  if (!temporal.test(text)) return { seasons: [] as string[], note: "" };
  if (base === null) return { seasons: [] as string[], note: "The current league season is unknown, so relative seasons cannot be resolved safely." };
  let years = explicit(text);
  // Support calendar seasons and a bare starting year for split-year leagues.
  if (!years.length) years = [...text.matchAll(/\b((?:19|20)\d{2})\b/g)].map(m => +m[1]);
  const vague = /\b(?:(?:last|past|previous)\s+(?:few|couple of|several)|recent)\s+seasons?\b/.test(text);
  const many = /\b(?:last|past|previous)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|few|couple of|several)\s+seasons?\b/.exec(text);
  if (many) {
    const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, few: 3, "couple of": 2, several: 3 };
    const count = words[many[1]] ?? +many[1];
    if (count < 1 || count > 10) return { seasons: [], note: "Ask for up to ten historical seasons at a time." };
    years.push(...Array.from({ length: count }, (_, i) => base - i - 1));
  } else if (vague) years.push(base - 1, base - 2, base - 3);
  else if (/\b(?:last|previous|prior)\s+(?:year|season)\b/.test(text)) years.push(base - 1);
  const unique = [...new Set(years)].filter(y => y !== base);
  if (unique.some(y => !Number.isInteger(y) || y < 2000 || y > base) || unique.length > 10) return { seasons: [], note: "That season request is invalid or outside the supported 2000-to-current range (maximum ten past seasons)." };
  return { seasons: unique.map(label), note: unique.length ? ` ${vague ? "For this question, a few/recent seasons means up to three completed seasons (a couple means two), alongside current context. State this scope briefly if it matters. " : ""}Current league season is ${current}. Requested historical seasons: ${unique.map(label).join(", ")}. Last season means ${label(base - 1)}, never ${current}.` : "" };
}
