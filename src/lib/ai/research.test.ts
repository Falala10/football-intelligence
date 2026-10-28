import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("./tavily", () => ({ tavilyResearch: vi.fn() }));
import { researchFootball } from "./research";
const grounded = () => ({ candidates: [{ finishReason: "STOP", content: { role: "model", parts: [{ text: "A verified football answer." }] }, groundingMetadata: { groundingChunks: [{ web: { title: "Official announcement", uri: "https://example.com/official" } }], searchEntryPoint: { renderedContent: '<div><a href="https://www.google.com/search?q=football">Google Search</a></div>' } } }] });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it("uses a search-capable Gemini model, preserves the grounded text and returns attribution", async () => {
  vi.stubEnv("FOOTBALL_RESEARCH_PROVIDER", "google"); vi.stubEnv("GEMINI_API_KEY", "test-secret"); vi.stubEnv("GEMINI_SEARCH_MODEL", "gemini-search-test");
  const fetcher = vi.fn().mockResolvedValue(Response.json(grounded())); vi.stubGlobal("fetch", fetcher);
  const result = await researchFootball("Latest transfer news?", []);
  expect(result.answer.claims[0].text).toBe("A verified football answer."); expect(result.research.sources[0].url).toBe("https://example.com/official");
  const [url, options] = fetcher.mock.calls[0]; const body = JSON.parse(options.body);
  expect(url).not.toContain("test-secret"); expect(options.headers["x-goog-api-key"]).toBe("test-secret");
  expect(body.tools).toEqual([{ google_search: {} }]); expect(body).not.toHaveProperty("generationConfig.responseFormat");
});
it("rejects ungrounded memory replies, unsafe URLs, truncated output and failed searches", async () => {
  vi.stubEnv("FOOTBALL_RESEARCH_PROVIDER", "google"); vi.stubEnv("GEMINI_API_KEY", "test-secret");
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  const noGrounding = grounded(); noGrounding.candidates[0].groundingMetadata.groundingChunks = [];
  const unsafe = grounded(); unsafe.candidates[0].groundingMetadata.groundingChunks[0].web.uri = "javascript:alert(1)";
  const truncated = grounded(); truncated.candidates[0].finishReason = "MAX_TOKENS";
  for (const body of [noGrounding, unsafe, truncated]) {
    fetcher.mockResolvedValueOnce(Response.json(body)); await expect(researchFootball("News?", [])).rejects.toThrow("research_unavailable");
  }
  fetcher.mockResolvedValueOnce(new Response("private upstream details", { status: 429 })); await expect(researchFootball("News?", [])).rejects.toThrow("research_unavailable");
});
it("backs off quota failures instead of repeatedly calling unavailable Google search", async () => {
  vi.stubEnv("GEMINI_API_KEY", "quota-test-only"); vi.stubEnv("GEMINI_SEARCH_MODEL", "gemini-test-backoff");
  const { searchFootballWeb } = await import("./research");
  const fetcher = vi.fn().mockResolvedValue(new Response("quota", { status: 429 })); vi.stubGlobal("fetch", fetcher);
  await expect(searchFootballWeb("stadium?", [])).rejects.toThrow("research_unavailable");
  await expect(searchFootballWeb("venue?", [])).rejects.toThrow("research_unavailable");
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it("prefers configured article search in auto mode before Google grounding", async () => {
  vi.stubEnv("FOOTBALL_RESEARCH_PROVIDER", "auto"); vi.stubEnv("TAVILY_API_KEY", "test-configured");
  const { tavilyResearch } = await import("./tavily");
  vi.mocked(tavilyResearch).mockResolvedValue({ model: "test", answer: { status: "answered", claims: [{ text: "Verified report.", evidenceIds: [], basis: "research" }], limitations: [] }, research: { sources: [], suggestionsHtml: "", checkedAtUtc: "2026-10-28T18:00:00Z" } });
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  expect((await researchFootball("Latest manager comments?", [])).answer.claims[0].text).toBe("Verified report.");
  expect(fetcher).not.toHaveBeenCalled();
});
