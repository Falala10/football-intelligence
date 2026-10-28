import { expect, it } from "vitest";
import { isStatementQuestion, statementSearchTerm, parseStatementSearch } from "./statements";
import { needsFreshResearch } from "./freshness";
const now = Date.parse("2026-10-28T17:00:00Z");
const row = (title: string, link = "https://news.google.com/rss/articles/test", date = "Sun, 25 Oct 2026 23:37:07 GMT") => `<item><title>${title}</title><link>${link}</link><pubDate>${date}</pubDate><source url="https://www.fcbarcelona.com">Official FC Barcelona Website</source></item>`;
it("routes reported speech for verification and extracts the speaker rather than searching the pronoun", () => {
  const q = "what did hansi flick say about their recent form";
  expect(isStatementQuestion(q)).toBe(true); expect(needsFreshResearch(q)).toBe(true);
  expect(statementSearchTerm(q)).toBe("hansi flick football comments");
  expect(statementSearchTerm("What did he say?", [{ role: "user", text: q }])).toBe("hansi flick football comments");
  expect(isStatementQuestion("Why did Barcelona lose?")).toBe(false);
});
it("keeps dated speaker headlines distinct from a full transcript and rejects stale or unrelated hits", () => {
  const xml = `<rss><channel>${row("Hansi Flick: We weren't fresh enough")}${row("Other coach discusses tactics")}${row("Hansi Flick talks", "https://evil.test/path")}${row("Hansi Flick talks", undefined, "Tue, 01 Sep 2026 12:00:00 GMT")}</channel></rss>`;
  const result = parseStatementSearch(xml, "Hansi Flick football comments", now);
  expect(result).toHaveLength(1); expect(result[0].text).toContain("have NOT been retrieved");
  expect(result[0].text).toContain("We weren't fresh enough"); expect(result[0].publishedAt).toBe("2026-10-25T23:37:07.000Z");
});
