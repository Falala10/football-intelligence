import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { openFootballResearch, parseFootballFeed } from "./open-research";
const now = Date.parse("2026-10-27T00:00:00Z");
const feed = (url = "https://www.bbc.com/sport/football/example", date = "Mon, 26 Oct 2026 18:00:00 GMT") => `<rss><channel><item><title>Transfer interest reported</title><link>${url}</link><pubDate>${date}</pubDate><description>Club interest is unconfirmed.</description></item></channel></rss>`;
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });
it("keeps only recent, dated publisher links and rejects arbitrary/private URLs", () => {
  expect(parseFootballFeed(feed(), "BBC", now)).toHaveLength(1);
  expect(parseFootballFeed(feed("https://127.0.0.1/private"), "BBC", now)).toEqual([]);
  expect(parseFootballFeed(feed(undefined, "Sun, 01 Jan 2023 00:00:00 GMT"), "BBC", now)).toEqual([]);
  expect(parseFootballFeed(feed(undefined, "Mon, 01 Jan 2029 00:00:00 GMT"), "BBC", now)).toEqual([]);
});
it("retrieves a new award fact from article infobox data instead of requiring it in model memory", async () => {
  vi.useFakeTimers(); vi.setSystemTime(now); vi.stubEnv("GEMINI_API_KEY", "test-key");
  const fetcher = vi.fn().mockImplementation(async (url: string, options?: { body: string }) => {
    void options;
    if (url.includes("wikipedia.org")) return Response.json({ query: { pages: { "1": { title: "2025 Ballon d'Or", revisions: [{ slots: { main: { "*": "Association football award. |award1_winner=Test Player" } } }] } } } });
    if (url.includes("googleapis.com")) return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ answered: true, reply: "Test Player won.", sourceIds: ["lookup-0"] }) }] } }] });
    return new Response("<rss><channel/></rss>");
  }); vi.stubGlobal("fetch", fetcher);
  const r = await openFootballResearch("who won the balon dor 2025?", []);
  expect(r.answer.claims[0].text).toBe("Test Player won."); expect(r.research.sources[0].title).toContain("Wikipedia");
  const [, options] = fetcher.mock.calls.find(([url]) => url.includes("googleapis.com"))!;
  expect(JSON.parse(options!.body).contents[0].parts[0].text).toContain("award1_winner=Test Player");
});
it("does not answer current news from encyclopedia memory when publisher feeds are unavailable", async () => {
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })));
  await expect(openFootballResearch("latest transfer news", [])).rejects.toThrow("research_unavailable");
});

it("uses a conversation-resolved lookup query for a short award follow-up", async () => {
  vi.stubEnv("GEMINI_API_KEY", "test-key"); let query = "";
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string) => {
    if (url.includes("wikipedia.org")) {
      query = new URL(url).searchParams.get("titles")!;
      return Response.json({ query: { pages: { "1": { title: "2025 football award", revisions: [{ slots: { main: { "*": "football | runner-up = Test Player" } } }] } } } });
    }
    if (url.includes("googleapis.com")) return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ answered: true, reply: "Test Player was second.", sourceIds: ["lookup-0"] }) }] } }] });
    return new Response("<rss><channel/></rss>");
  }));
  await openFootballResearch("Who came second?", [], undefined, "2025 Ballon d'Or runner-up");
  expect(query).toBe("2025 Ballon d'Or");
});
it("targets the dated award article rather than a winner biography", async () => {
  vi.stubEnv("GEMINI_API_KEY", "test-key"); let target = "";
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string) => {
    if (url.includes("wikipedia.org")) { target = new URL(url).searchParams.get("titles")!; return Response.json({ query: { pages: {} } }); }
    return new Response("<rss><channel/></rss>");
  }));
  await expect(openFootballResearch("Who came second?", [], undefined, "2025 Ballon d'Or men runner-up")).rejects.toThrow();
  expect(target).toBe("2025 Ballon d'Or");
});
it("does not treat an unrelated match headline as transfer reporting", async () => {
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  const fetcher = vi.fn().mockImplementation(async (url: string) => url.includes("wikipedia.org") ? Response.json({ query: { pages: {} } }) : new Response(feed().replaceAll("Transfer interest reported", "Barcelona match result").replaceAll("Club interest is unconfirmed.", "Barcelona lost the match.")));
  vi.stubGlobal("fetch", fetcher);
  const response = await openFootballResearch("latest transfer news about Barcelona", []);
  expect(response.answer.status).toBe("insufficient_evidence");
  expect(response.answer.limitations[0]).toContain("couldn't confirm");
  expect(response.research.sources).toEqual([]);
  expect(fetcher.mock.calls.some(([url]) => String(url).includes("googleapis.com"))).toBe(false);
});
it("does not invent tournament odds or turn an earlier opinion into a bookmaker ranking", async () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  const history = [{ role: "user" as const, text: "Who could be finalists for the entire EFL competition?" }, { role: "assistant" as const, text: "Arsenal are among the strongest paper picks." }];
  const result = await openFootballResearch("based on betting odds?", history);
  expect(result.answer.status).toBe("insufficient_evidence");
  const text = result.answer.limitations.join(" "); expect(text).toContain("EFL Cup"); expect(text).toContain("not a bookmaker ranking"); expect(text).toContain("rather than odds for this one match");
  expect(text).not.toContain("provided match data"); expect(fetcher).not.toHaveBeenCalled();
});
it("uses the dedicated transfer feed when general football headlines have no relevant updates", async () => {
  vi.useFakeTimers(); vi.setSystemTime(now); vi.stubEnv("GEMINI_API_KEY", "test-key"); let selected: {title:string;text:string}[] = [];
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string, options?: {body:string}) => {
    if (url.includes("wikipedia.org")) return Response.json({query:{pages:{}}});
    if (url.includes("googleapis.com")) {
      selected=JSON.parse(JSON.parse(options!.body).contents.at(-1).parts[0].text).sources;
      return Response.json({candidates:[{finishReason:"STOP",content:{parts:[{text:JSON.stringify({answered:true,reply:"Reports dated 26 October link Test Player with Liverpool; the move isn't confirmed.",sourceIds:["lookup-0"]})}]}}]});
    }
    if (url.includes("/gossip/")) return new Response(feed("https://www.bbc.com/sport/football/gossip-example").replaceAll("Transfer interest reported","Liverpool linked with Test Player - transfer gossip"));
    return new Response("<rss><channel/></rss>");
  }));
  const result=await openFootballResearch("What's the latest transfer news?",[]);
  expect((await openFootballResearch("What are the latest transfer stories?",[])).answer.status).toBe("answered");
  expect(result.answer.status).toBe("answered"); expect(selected[0].title).toContain("BBC transfer gossip");
  expect(selected[0].text).toContain("claims are unconfirmed"); expect(selected[0].text).toContain("Published 2026-10-26");
});
it("doesn't send podcasts, newsletter signups or award-shortlist joins as transfer evidence", async () => {
  vi.useFakeTimers(); vi.setSystemTime(now); vi.stubEnv("GEMINI_API_KEY", "test-key");
  for (const title of ["Football Daily", "Sign up for our newsletter", "Player joins award shortlist"]) {
    const fetcher = vi.fn().mockImplementation(async (url: string) => url.includes("wikipedia.org") ? Response.json({query:{pages:{}}}) : new Response(feed().replaceAll("Transfer interest reported",title).replaceAll("Club interest is unconfirmed.","Mark is joined by a guest to discuss awards.")));
    vi.stubGlobal("fetch",fetcher);
    expect((await openFootballResearch("latest transfer news",[])).answer.status).toBe("insufficient_evidence");
    expect(fetcher.mock.calls.some(([url])=>String(url).includes("googleapis.com"))).toBe(false);
  }
});
it("doesn't supply unrelated clubs' rumours for a specific club request", async () => {
  vi.useFakeTimers(); vi.setSystemTime(now); vi.stubEnv("GEMINI_API_KEY","test-key");
  const fetcher=vi.fn().mockImplementation(async (url:string)=>url.includes("wikipedia.org")?Response.json({query:{pages:{}}}):new Response(feed().replaceAll("Transfer interest reported","Liverpool transfer gossip")));
  vi.stubGlobal("fetch",fetcher);
  const result=await openFootballResearch("latest transfer news about Barcelona",[]);
  expect(result.answer.status).toBe("insufficient_evidence");
  expect(fetcher.mock.calls.some(([url])=>String(url).includes("googleapis.com"))).toBe(false);
});
