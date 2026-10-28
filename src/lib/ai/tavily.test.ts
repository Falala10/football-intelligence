import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { mapTavilySources, tavilyResearch } from "./tavily";
const now = Date.parse("2026-10-28T18:00:00Z");
const result = { title: "Coach's post-match comments", url: "https://www.fcbarcelona.com/en/news/test", published_date: "2026-10-27T12:00:00Z", content: "Short search summary", raw_content: "The coach said the team needed to recover after two defeats. This is retrieved page text." };
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });
it("keeps dated article excerpts distinct from summaries and rejects unsafe, stale and undated fresh results", () => {
  const data = mapTavilySources({ results: [result, { ...result, url: "https://127.0.0.1/test" }, { ...result, url: "https://example.com/old", published_date: "2025-10-27" }, { ...result, url: "https://example.com/no-date", published_date: null }, { ...result, url: "https://example.com/summary", raw_content: null }] }, true, now);
  expect(data).toHaveLength(2); expect(data[0].text).toContain("Retrieved page-text excerpt"); expect(data[0].text).toContain("not proof of event date"); expect(data[1].text).toContain("Search-result summary only");
});
it("keeps keys server-side, requests basic search and raw text, and reuses recent search results", async () => {
  vi.useFakeTimers(); vi.setSystemTime(now); vi.stubEnv("TAVILY_API_KEY", "private-tavily-test"); vi.stubEnv("GEMINI_API_KEY", "private-model-test");
  const fetcher = vi.fn().mockImplementation(async (url: string) => url.includes("tavily.com") ? Response.json({ results: [result] }) : Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ answered: true, reply: "He said they needed to recover [lookup-0].", sourceIds: ["lookup-0"] }) }] } }] }));
  vi.stubGlobal("fetch", fetcher);
  const reply = await tavilyResearch("What did the coach say today?", []);
  expect(reply.answer.claims[0].text).toBe("He said they needed to recover.");
  const [url, options] = fetcher.mock.calls[0]; expect(url).not.toContain("private"); expect(options.headers.Authorization).toBe("Bearer private-tavily-test");
  expect(JSON.parse(options.body)).toMatchObject({ search_depth: "basic", include_raw_content: "text", include_answer: false, topic: "news", auto_parameters: false });
  const modelBody = JSON.parse(fetcher.mock.calls[1][1].body); expect(JSON.stringify(modelBody)).toContain(result.raw_content); expect(JSON.stringify(modelBody)).not.toContain("private-tavily-test");
  await tavilyResearch("What did the coach say today?", []);
  expect(fetcher.mock.calls.filter(([url]) => url.includes("tavily.com"))).toHaveLength(1);
});
it("requires a configured key and rejects quota errors without forwarding private provider messages", async () => {
  vi.stubEnv("TAVILY_API_KEY", ""); await expect(tavilyResearch("latest football news", [])).rejects.toThrow("research_setup");
  vi.stubEnv("TAVILY_API_KEY", "quota-test-key"); vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private diagnostic", { status: 432 })));
  await expect(tavilyResearch("latest football news", [])).rejects.toThrow("research_unavailable");
});
