# M0 verification

Verified locally on 2026-09-23 using Node 22.23.2 and npm 10.9.8.

- `npm run lint`: passed, no warnings.
- `npm run typecheck`: passed, including generated Next.js route types.
- `npm run build`: passed; foundation and not-found pages prerendered.
- Production server: HTTP 200 and expected foundation content; browser confirmed page title, heading and M0 text.
- Development server: HTTP 200 and expected content using `WATCHPACK_POLLING=true` on port 3102. Default file watching hit an environment-level EMFILE limit; README documents the polling workaround.
- Both original CSV copies verified byte-for-byte with SHA-256. No parsing or database import.
- npm install audit: zero reported vulnerabilities.

ESLint 9.39.5 is pinned for compatibility with the Next.js lint plugin dependency tree. npm marks this version deprecated; an attempted ESLint 10 upgrade produced peer dependency warnings and was reverted. Revisit when the lint plugins support the newer major cleanly.

No product behavior tests apply to the static M0 placeholder. No later milestone has started.

## Normalized dashboard schedule (2026-10-01)

- Node 22.23.2: lint and TypeScript checks passed; 13 test files / 90 tests passed.
- Default Turbopack build was blocked by the verification sandbox when a CSS worker tried to bind a local port. No project build configuration was changed.
- Alternate verification with `next build --webpack` passed compilation, TypeScript, static generation and build tracing for `/` and `/dashboard`.
- Production dashboard with the MCP offline rendered the explicit unavailable message.
- A temporary local MCP fixture exercised the complete production server → provider → mapper → dashboard path. Browser verification showed all eight matches in two groups, every supported status, zero scores, missing-score placeholders and timezone-formatted kickoff times. Existing league filtering and date navigation preserving the league were verified.
- Fixture data was used only for verification, never added to application code. Temporary servers and the preview tab were closed afterward.
- Real FotMob browser verification remains pending until the user's MCP server is running.

## Match detail page (2026-10-01)

- Lint passed; 15 test files / 98 tests passed. Isolated production build with `next build --webpack` passed TypeScript, compilation and route generation including `/matches/[id]`.
- `npm run check` was attempted in an isolated copy to preserve the user's running dev server; its Turbopack phase rejected the external node_modules symlink. The alternate build required no application configuration changes.
- Real browser verification followed a dashboard card to Curaçao–Trinidad and Tobago (5991883): score, finished status, match information, events, both lineups and grouped stats rendered successfully.
- Browser verification caught encoded dynamic route IDs; the route now decodes once before validating the provider ID.
- Tests cover missing coverage, missing scores/stats, zero values, malformed/mismatched responses, substitutions, assists, penalties, stoppage time, unsafe IDs and failure recovery.

## Dashboard responsiveness (2026-10-01)

The header/date/league controls render without awaiting football data. The match schedule and ticker stream separately, and the spotlight/season/form sections have their own Suspense boundaries sharing one player request. Card entrance animation is 200ms with no stagger delay.

Controlled production streaming test with a six-second failing player request: date controls arrived at 0.122s, all eight fixture matches at 0.133s, and player failure panels at 6.148s. This verifies independence, not real upstream latency. Real dashboard browser rendering was checked with FotMob data. Lint, TypeScript, 98 tests and the alternate production build passed in an isolated copy without disturbing the user's dev server.

## Match commentary (2026-10-01)

Real browser verification on Curaçao–Trinidad and Tobago (5991883) showed automatic commentary newest first, including 90+3 and 90+1 stoppage-time labels, goals and substitutions. Commentary loads in a separate Suspense boundary and uses the existing live match refresh. Unit tests cover human/automatic source mapping, no coverage versus empty updates versus failures, malformed/wrong-match data, and recovery. Lint, TypeScript, all 104 tests and the alternate isolated production build passed.

## League pages (2026-10-01)

Lint, TypeScript, all 112 tests and the alternate isolated production build passed, including `/leagues` and `/leagues/[id]`. Real browser verification showed 20 Premier League standings rows, ten latest results and ten upcoming fixtures. MLS rendered Eastern, Western and Supporters Shield tables separately. A result card opened Fulham–Manchester United correctly. Tests cover missing data, zero/negative table values, table groups, scores before kickoff, statuses, fixture ordering/limits, ID validation and failure recovery.
