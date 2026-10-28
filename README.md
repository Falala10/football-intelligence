# Football Intelligence

**Work in progress — local development prototype.** This repository contains a football scores and analysis interface built with Next.js, React and TypeScript. It is not a production service. Live data requires a separately installed and running FotMob MCP server; that server is not included here.

A personal football intelligence product. The local prototype includes a real-data dashboard, a classic matches list, match detail/commentary pages and league standings/results/fixtures. Match chat includes AI analysis, current team form and on-demand historical league summaries. See docs/ROADMAP.md for the current checkpoint.

## Open in VS Code

Open this folder with **File → Open Folder**, or open `football-intelligence.code-workspace`.

## Run locally

Use Node.js **22**. With nvm installed:

```sh
nvm install
nvm use
npm ci
npm run dev
```

Open http://localhost:3000. Stop the server with Ctrl+C. If Node 22 is installed through Homebrew instead, run `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"` in the VS Code terminal first. Confirm `node --version` starts with `v22.`. npm rejects other major versions to keep the environment consistent.

The Matches page reads live data from the FotMob MCP server, which must be running first. From the `fotmob-mcp` repository:

```sh
.venv/bin/fotmob-mcp --transport streamable-http --host 127.0.0.1 --port 8000
```

Use the current version of that server: the dashboard also needs its `get_player_profile` tool, and a server started before that tool existed must be restarted. If it is not reachable, the page says the data is unavailable and retries; that state is never cached. Optional environment variables: `FOTMOB_MCP_URL` (default `http://127.0.0.1:8000/mcp`) and `APP_TIMEZONE` (default `America/New_York`, used for day boundaries and kick-off times). No API keys, database, or CSV import are required. If port 3000 is occupied, use `npm run dev -- --port 3001` and open that port.

If your environment reports `EMFILE` while watching files, stop the server and run `WATCHPACK_POLLING=true npm run dev`. This was needed in the restricted verification environment.

## Verify

```sh
npm run lint
npm run typecheck
npm run build
npm start
```

`npm run test` runs the unit tests (Vitest). `npm run check` runs lint, typecheck, tests and build together. `npm start` serves the production build. Typecheck generates Next.js route types before checking TypeScript, so it also works on a fresh clone. Do not run `npm run build` while `npm run dev` is running in the same folder; both write to `.next`.

## Where things live

- `src/app/(app)/`: the classic Matches page at `/` (date, league and live filters come from the URL) inside the sidebar layout.
- `src/app/(lab)/`: the dashboard prototype at `/dashboard` with its own dark, full-screen look (`lab.css`). Compare it with the classic page before choosing which direction to keep.
- `src/app/layout.tsx` and `globals.css`: root layout, fonts, and the classic page's light/dark theme colours.
- `src/components/`: classic sidebar, match rows, the ticking live minute, score flash, auto refresh, and theme toggle. `src/components/lab/`: the dashboard's live hero, player spotlight, rings, form list, match cards, and animated counters.
- `src/lib/fotmob/`: the only code that talks to the FotMob MCP (a small HTTP client, validation, cached `getMatchesByDate` and `getPlayerProfile`). Server-side only.
- `public/players/`: player photos used by the spotlight (currently one, supplied by the project owner). `src/lib/players.ts` says which player and photo the spotlight uses.
- `src/lib/`: dates, league list and ordering, URL handling, and the live clock maths, each with unit tests.
- [Product](docs/PRODUCT.md): intent and M0 scope.
- [Architecture](docs/ARCHITECTURE.md): present structure and future boundaries.
- [Data sources](docs/DATA-SOURCES.md): current/recent, historical, Elo and event-data plan.
- [Roadmap](docs/ROADMAP.md): review gate and later milestones.
- `data/raw/`: local original CSVs, ignored by Git; no database or processing.
- [Verification](docs/VERIFICATION.md): actual checks performed.

Dependencies are locked in `package-lock.json`; use `npm ci` for repeatable installation. Generated output, datasets and secrets are ignored by Git. No hosted deployment is included. Raw football datasets are local-only and are not required to start the interface.

**Development status:** The roadmap was reconciled with the saved code on 2026-10-26. This remains a local prototype with source-dependent coverage; verification results and build limitations are recorded in docs/VERIFICATION.md.

## Normalized dashboard match schedule

`/dashboard` now reads matches through `src/lib/matches/service.ts` → the FotMob `MatchProvider` → the existing cached and validated FotMob fetch → `mapFotMobDay`. Its hero, ticker and complete schedule consume the normalized model. The full schedule includes every selected match, grouped by competition stage; stage keys remain separate and competition counts are distinct competition IDs. Existing date/league URLs and live refresh behavior are preserved. Provider failures stay distinct from successfully empty days.

The classic `/` page and the dashboard player spotlight retain their existing data paths. The normalized contract in this milestone covers matches only.

## Match detail page

Dashboard cards and the featured match link to `/matches/fotmob:<id>`. The server validates the provider-scoped ID, calls the existing `get_match_page` MCP tool, and maps its response to `MatchDetail`. The page shows match information, events, starting lineups/substitutes and grouped team stats. Missing coverage is explicit; missing scores/stats never become zero. Live matches refresh every 30 seconds; scheduled matches every 90 seconds. Only successful details are cached briefly; unavailable responses retry. Invalid IDs show the not-found page. Commentary is implemented in the current working tree and depends on the MCP `get_match_commentary` tool. Shot maps and pitch diagrams remain deferred.

## League pages

The sidebar trophy opens `/leagues`, listing the seven main competitions. `/leagues/fotmob:<id>` shows the current season, overall standings (separate conference/stage tables where supplied), latest ten results and next ten scheduled fixtures, plus live matches when present. Match cards link to the existing detail pages. A server-only fetch uses the MCP `fetch_fotmob_route` leagues route; `src/lib/competitions/` validates and normalizes the response. Missing statistics remain unknown rather than zero, and absent standings/fixtures have explicit messages. League data is cached briefly; live league pages refresh every 90 seconds and unavailable pages retry. Historical season selection and league statistics remain deferred.

## Publication verification (2026-10-26)

Lint, TypeScript checks and all 112 unit tests passed under Node 22. The production build could not be verified in the publishing sandbox: Turbopack was blocked from binding a local port (`Operation not permitted`). Run `npm run check` locally before treating this prototype as production-ready. Live MCP integration was not exercised during publication.

## Player performance within match pages

Match pages include a player selector with game-specific statistics and activity heatmaps where provided. The panel streams independently and adapts to phone screens. Coverage is per match/player; missing values remain unavailable. Heatmap locations are safely normalized and do not imply continuous tracking or verified attacking direction. AI integration and complete historical player logs remain future work.

## Match AI analyst (local setup)

Match pages now have an “Ask AI about this match” panel. It sends a server-built evidence snapshot (match/team/player statistics, lineups, events and bounded full-match commentary, separately fetched from the display excerpt) to Google Gemini only when a question is submitted. Replies appear as a chat conversation. Knowledge/match answers stay uncluttered; researched replies show the sources used. Context evidence references are validated on the server; general knowledge is explicitly marked separately rather than assigned fake match citations. Recent question/answer pairs are sent as ordered conversation turns with follow-ups so pronouns and context can be resolved; prior answers are explicitly untrusted context, not facts. Chat remains in page memory and resets on reload or New chat. It can explain general football concepts and offer explicitly qualified tactical interpretations. It now loads recent competitive results and the current league season for both teams in the viewed match, including last-five form, goals and standings. Follow-ups can switch between match analysis and team form. Historical league summaries and comparisons now retrieve explicit seasons on demand (up to ten past seasons per question), with season identity checks and cached results. “Last season” is resolved from the current league season, not the viewed match date. A reviewed reporting library now supplies dated Barça high-line analysis from UEFA, Opta and the club for tactical/history questions and follow-ups. This is curated coverage, not unrestricted live web search. The assistant also answers general football knowledge and uses public factual lookups plus current BBC/Guardian football feeds for research. This broadens entity/topic coverage without a per-team answer whitelist; it is not exhaustive live web search.

Set `GEMINI_API_KEY` in the root `.env.local` file; `.env.example` shows the configuration. Get a key in Google AI Studio (https://aistudio.google.com/apikey). Never use a `NEXT_PUBLIC_` variable for this key and never commit it. `GEMINI_MODEL` defaults to `gemini-3.5-flash-lite`, listed with structured outputs and free-tier input/output on Google's pricing page as checked 2026-10-26. Access/quotas depend on your Google project. Restart the website if environment changes do not reload.

The server calls Google's native `generateContent` endpoint with a bounded input/output and validates the returned evidence references. No model request is made without a configured key. Free-tier content may be used to improve Google's products. The app cannot enforce Google's billing tier: use an eligible free-tier project if you want to stay within free access, and check its quotas. No paid fallback or automatic provider switch is configured. The Gemini connection was activated and basic real match answers/evidence links were verified on 2026-10-26. Broader answer-quality evaluations remain ongoing; provider timeouts can occur.

This endpoint is deliberately local-only and same-origin, matching the current prototype. It permits one in-flight request and eight attempts per minute per process. These are local safeguards, not shared production rate limiting. Authentication and deployment controls must be designed before a hosted AI launch.

See docs/AI-MATCH-ANALYST.md for boundaries and evaluation questions.


## General football and research

Chat accepts association-football questions about awards, players, teams, history, tactics, forms, transfers and controversies beyond the viewed match. Stable known facts can be answered from model knowledge; uncertain facts can trigger public lookup. General questions no longer require the match feed to succeed.

`FOOTBALL_RESEARCH_PROVIDER=open` uses the public English Wikipedia API (including infobox/table data) for factual lookup and dated BBC Sport/Guardian football RSS summaries for news. Publisher snippets are not full articles. Fresh-news requests do not use old encyclopedia text as verified news. Some teams/topics will have no relevant recent feed coverage; the assistant should state that specific gap instead of fabricating. Sources are shown on researched replies, and rumours/allegations must remain labelled. This does not guarantee factual accuracy or complete live scores/player-form coverage.

`FOOTBALL_RESEARCH_PROVIDER=auto` prioritises Tavily when `TAVILY_API_KEY` is configured, then tries Google grounding, then falls back to public lookups. `tavily` requires the search/article provider and reports failure rather than silently substituting headline research. `google` requires eligible Google grounding access. Google's current Gemini 3.5 Flash-Lite pricing lists Search grounding as unavailable on the free API tier; the configured key returns HTTP 429 on grounded requests. No billing settings were changed.

### Activate search and article retrieval

1. Create a free account at https://app.tavily.com and copy its API key.
2. In this project's ignored `.env.local`, fill in `TAVILY_API_KEY=`. Do not put it in chat, browser code or `.env.example`.
3. Leave `FOOTBALL_RESEARCH_PROVIDER=auto` (or use `tavily` to require it). Restart the development server if it does not reload the environment.

Gemini still writes the answers. Tavily receives the search question and relevant context and returns result summaries plus extracted page text when available. Basic searches, no automatic advanced mode, at most five results and a two-minute bounded cache reduce repeated usage. Fresh news requires a valid recent publication date; inaccessible or missing article text is labelled as a summary, never a full transcript. An API key is required before a live Tavily verification is possible. Free-plan eligibility/credits are described at https://www.tavily.com/pricing.

Current-club AI questions can resolve a club outside the viewed match and load its league record, recent results, two recent match-stat summaries and latest-match incident excerpts. Answers distinguish observed facts from football interpretation; recent samples are not season-wide tactical evidence. Public reporting remains coverage-limited, so arbitrary news topics may still have gaps.

## Chat reliability and evaluation

Chat requests have an 80-second server deadline, cancellation recovery and separate busy/quota messages. Standalone tactical definitions bypass match loading. `npm run eval:chat` runs a repeatable live question suite; results require factual and conversational review. See [chat evaluation](docs/CHAT-EVALUATION.md).

## Bookmaker odds

Set `ODDS_API_KEY` only in `.env.local`. The Odds API adapter reads its sports catalog and fetches UK-region decimal odds on demand for the viewed match. Matching requires both team identities, home/away orientation and kickoff time; ambiguous or mismatched events are not substituted. Quotes include bookmaker and update timestamp, must be complete and no older than 15 minutes, and retain the exact market. Match prices cache for two minutes; the sports catalog caches for thirty minutes. There is no background odds polling.

“Show odds for this match” returns three-way 90-minute match-winner quotes where covered. Tournament requests first check outright availability. The actual connected catalog currently reports EFL Cup match coverage but no tournament-winner market; no reach-the-final market is supplied by this integration. Match odds, fan polls, winner odds and finalist probabilities are never interchangeable. Missing markets, quota exhaustion and authentication failures are explicit.

## Competition-wide chat context

Cup questions can retrieve the complete competition fixture list, reported stages and explicit playoff tie results instead of only the viewed match. EFL Cup context validates the active last-16/later knockout field, lists current ties and each remaining team's reported cup results/next tie. It excludes verified losers, preserves unresolved shootouts/aggregates and never infers a fixed bracket from list order. When relevant, current Premier League standings provide separate, same-season context for remaining top-flight clubs.

The EFL's official calendar supplies the final date and round scheduling windows when it matches the loaded season. Week-commencing dates are not exact kickoffs. Future opponents remain unknown unless the feed explicitly names them. Named FA Cup/Champions League feeds can supply fixture/stage context but their full progression rules/calendars are not yet connected; other competitions and historical questions can still use general chat/research.

Match identity and competition-rule coverage are separate: any provider-validated viewed match supplies its teams, competition and reported round. Generic tournament loading accepts the verified parent competition ID, while unknown progression rules remain conservative. General-research and unavailable-tournament fallbacks preserve known match facts; a missing bracket must never become a missing competition name.

Football research defaults to `FOOTBALL_RESEARCH_PROVIDER=auto`: attempt Google-grounded search, then use public-source lookups if unavailable. Quota failures have a short backoff. `open` skips Google; `google` requires Google grounding. A club profile's usual home ground is kept separate from a confirmed match venue.
