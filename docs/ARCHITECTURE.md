# Architecture

## Implemented at M0

- Node.js 22 and npm, with a committed dependency lockfile.
- Next.js App Router, React, strict TypeScript, and Tailwind CSS.
- `src/app/`: root layout, global styles, and one static foundation page.
- `docs/`: product, architecture, source inventory, and milestones.
- `data/raw/`: unchanged local source datasets, excluded from Git and web assets.
- ESLint and separate typecheck/build commands. Git tracks code and documentation.

At M0 there was no database, backend API, provider client, MCP connection, AI SDK, or ingestion job. The app still does not read the CSVs, and there is still no database or AI SDK.

## Implemented in slice 1 (Matches page)

Data flow: page (server component) → `getMatchesByDate` / `getPlayerProfile` (`use cache`) → server-only `mcp.ts` → a small HTTP client (`mcp-http.ts`) → FotMob MCP in HTTP mode → FotMob. Results are validated (`parse.ts`, `player-parse.ts`); a bad or missing response becomes an explicit "unavailable" state, never an empty day.

- **Failures are never cached.** Only the successful fetch runs inside the cached function; a failure throws out of it (Next does not store a thrown error) and a wrapper turns it into "unavailable". Verified by stopping and restarting the MCP: the first reload after it returned showed live data.
- **The MCP client is deliberately minimal.** It sends POST requests (initialize, initialized, tools/call), then deletes its session. The full MCP client library was removed: it opened a background server-message stream per connection, which leaked and made calls fail intermittently.
- **Routes:** two route groups share the root layout: `(app)` (classic list with sidebar, at `/`) and `(lab)` (dashboard prototype, at `/dashboard`).

- Cache Components is enabled (`next.config.ts`). Anything time- or URL-dependent renders at view time inside `<Suspense>`.
- The live minute is counted forward in the browser from the exact clock FotMob reported (`src/lib/clock.ts`); a 30-second `router.refresh()` corrects it. The server cache lifetime is kept shorter than the refresh interval.
- Theme: `data-theme` on `<html>`, applied by an inline script before first paint; the choice is stored in localStorage.
- Configuration: `FOTMOB_MCP_URL` and `APP_TIMEZONE` (both optional). Day boundaries and kick-off times use one configured timezone.
- Club and league logos are loaded by the browser from FotMob's image host, with initials as a fallback.

## Proposed boundaries for later milestones

UI → server-side application services → selected provider adapters or historical storage.

Introduce shared components and libraries only when a real feature needs them. Future adapters isolate FotMob MCP, historical matches, historical Elo, and StatsBomb details from presentation code. Keep provider credentials and raw data server-side. The existing experimental FotMob MCP is an external ingredient, not automatically available to this web app; its transport and deployment still need to be established.

A later ingestion milestone will audit CSV schemas, duplicates, dates, missing values, and identifiers before choosing a database/schema and importing. Preserve originals. Resolve team/competition identities explicitly; do not assume names or provider IDs match.

A future intelligence router classifies the question by intent, time range and coverage, chooses the smallest relevant source set, and returns evidence with provenance and limitations. Cross-source joins occur only when needed. Freshness, caching, errors and unavailable data will be designed when adapters are implemented.

## Deferred decisions

Database engine, hosting, authentication, AI model/provider, MCP transport, update schedule, and normalized entity model. Avoid infrastructure before its use case exists.

## Tooling references

- https://nextjs.org/docs/app/getting-started/installation
- https://tailwindcss.com/docs/installation/framework-guides/nextjs
