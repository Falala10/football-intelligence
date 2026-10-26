# Football Intelligence

**Work in progress — local development prototype.** This repository contains a football scores and analysis interface built with Next.js, React and TypeScript. It is not a production service. Live data requires a separately installed and running FotMob MCP server; that server is not included here.

A personal football intelligence product. M0 (foundation) is accepted. The first slice of M1/M2 is built and awaiting review: a live Matches page using real FotMob data, with scores, a ticking live minute, automatic refresh, league filters, and a light/dark theme.

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

**Development status:** The current working tree also includes match detail, commentary and league pages. These additions are work in progress; their presence does not imply user acceptance or successful verification. The roadmap records an earlier milestone and may lag the current code.

## Normalized dashboard match schedule

`/dashboard` now reads matches through `src/lib/matches/service.ts` → the FotMob `MatchProvider` → the existing cached and validated FotMob fetch → `mapFotMobDay`. Its hero, ticker and complete schedule consume the normalized model. The full schedule includes every selected match, grouped by competition stage; stage keys remain separate and competition counts are distinct competition IDs. Existing date/league URLs and live refresh behavior are preserved. Provider failures stay distinct from successfully empty days.

The classic `/` page and the dashboard player spotlight retain their existing data paths. The normalized contract in this milestone covers matches only.

## Match detail page

Dashboard cards and the featured match link to `/matches/fotmob:<id>`. The server validates the provider-scoped ID, calls the existing `get_match_page` MCP tool, and maps its response to `MatchDetail`. The page shows match information, events, starting lineups/substitutes and grouped team stats. Missing coverage is explicit; missing scores/stats never become zero. Live matches refresh every 30 seconds; scheduled matches every 90 seconds. Only successful details are cached briefly; unavailable responses retry. Invalid IDs show the not-found page. Commentary is implemented in the current working tree and depends on the MCP `get_match_commentary` tool. Shot maps and pitch diagrams remain deferred.

## League pages

The sidebar trophy opens `/leagues`, listing the seven main competitions. `/leagues/fotmob:<id>` shows the current season, overall standings (separate conference/stage tables where supplied), latest ten results and next ten scheduled fixtures, plus live matches when present. Match cards link to the existing detail pages. A server-only fetch uses the MCP `fetch_fotmob_route` leagues route; `src/lib/competitions/` validates and normalizes the response. Missing statistics remain unknown rather than zero, and absent standings/fixtures have explicit messages. League data is cached briefly; live league pages refresh every 90 seconds and unavailable pages retry. Historical season selection and league statistics remain deferred.

## Publication verification (2026-10-26)

Lint, TypeScript checks and all 112 unit tests passed under Node 22. The production build could not be verified in the publishing sandbox: Turbopack was blocked from binding a local port (`Operation not permitted`). Run `npm run check` locally before treating this prototype as production-ready. Live MCP integration was not exercised during publication.
