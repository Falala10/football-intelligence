# Data coverage audit — 2026-10-26

## Scope and method

Read the app adapters and the local fotmob-mcp route catalog/client, then made a small set of fresh read-only requests through the running MCP HTTP server. Pagination was additionally tested using the provider-advertised URL through its shared Python client. Inspected CSV headers and scanned row/date counts without changing originals or importing them. This is sampled coverage, not a global completeness guarantee. Raw responses and audit scripts are scratch files outside this repository, not browser assets or committed fixtures.

## Findings

| Capability | Evidence | Decision |
| --- | --- | --- |
| Detailed player stats per match | Sunderland–Leeds, match 5795494: content.playerStats has 40 entries, grouped typed stats including minutes, rating, goals, assists, xA, passing fractions and physical metrics. Entries can include non-playing squad members. | Build a normalized player-match model; retain types, numerator/denominator, units, nulls and participation. Do not label all entries appearances. |
| Player heatmaps | Same match: content.heatmapUrl supplies a relative route with an encoded heatmapUrl parameter. match_heatmaps returns template, players and lastModified; 30 player SVG fragments keyed p<playerId>, viewBox 105×68. | Feasible for covered matches. Extract/validate coordinates or sanitize SVG; never inject arbitrary upstream markup. Not continuous tracking or time spent; points have no verified timestamps/action labels. Orientation semantics need verification before interpreting direction. |
| Shot coordinates | Same match: 26 shots. MCP get_match_page already summarizes shots, but app detail model/view currently omits them. | Shot maps are feasible separately from heatmaps. Validate coordinate conventions and preserve provider/xG provenance. |
| Limited-coverage match | Curaçao–Trinidad and Tobago 5991883: 42 playerStats entries but no heatmap URL or shots. | Rich stats, player entries, shots and heatmaps need independent coverage flags. |
| Scheduled match | Sevilla–Osasuna 5868109: lineups present; zero playerStats entries and no heatmap/shots. | Show pending/unavailable; do not turn missing stats into zero. |
| Initial player match log | Antony 967622: player_data contains recentMatches, initialMatchesPage.matches (20), previous URL, statSeasons and competition filters. | Can build an initial recent match log now. Profile summaries are not full per-match detailed stats. |
| Older player match pagination | player_matches failed both without a cursor and with playerId/before/parentLeagueId. Following the exact initialMatchesPage.previous URL through the shared client also failed. | BLOCKED in these tests. Do not promise every career appearance. Diagnose endpoint/availability before full-history UI; collecting appearances from league fixtures is a possible bounded alternative, not tested here. |
| Team pages | Arsenal 9825 returns squad, fixtures, standings, stats and history. | Existing source supports a team page; normalize before UI. |
| Five previous league seasons | Premier League 2021/22 through 2025/26 all returned matching selectedSeason and tables. Four have 380 fixture records; 2023/24 has 381 distinct IDs. | Results-based comparisons feasible after reconciling played/cancelled/abandoned fixtures, team membership and completeness. Do not assume raw fixture count equals played games. |
| Historical advanced team stats | league_season_deep_stats using internal season ID and type=teams/stat=goals returned player names with team IDs. | Schema/semantic anomaly: HTTP success is not validation. Historical team xG and advanced totals are NOT verified. Resolve correct stat links/type semantics before comparisons. |

## Local historical datasets

- Matches.csv: 238,858 rows, date strings spanning 2000-07-28 to 2026-09-03, 38 division codes. Fields include result/half-time scores, aggregate team shots/cards/corners, Elo/form and betting-related values. 116,375 rows have at least one blank HomeShots/AwayShots field. These are field/date scans, not a completed quality audit; other sentinels, duplicates, team mapping and competition coverage remain unchecked.
- EloRatings.csv: 273,972 rows, dates 2000-07-01 to 2026-09-01; date/club/country/elo only. Confirm pre/post-match timing before joins.
- Neither CSV supplies player appearances, per-player stats or positional coordinates. No xG columns found in the match header. Neither is current enough to supply today's results alone.
- Publisher, field semantics and usage terms still need recording before a durable import.

## Additional event source

Official StatsBomb Open Data provides competition/season discovery, match events and lineups, with 360 files for selected matches. It is a coverage-limited enrichment source, not a substitute for complete current five-season coverage. Event-location density must be labelled as event-location density, not continuous movement tracking. No integration or full coverage enumeration was performed. See https://github.com/hudl/open-data and its attribution requirements/license.

## AI implications and recommended slices

1. Normalize PlayerMatchPerformance with provider-scoped match/player/team IDs, participation/minutes, grouped typed stats, provenance and independent coverage; add player selection to existing match pages, with heatmaps only where supplied. Test a starter, substitute, unused player, goalkeeper, scheduled match and limited-coverage match.
2. Add player pages and the initial match log. Treat pagination as a specific unresolved prerequisite for full historical logs.
3. Ship match-scoped AI using normalized match, player stats, events and commentary. Restrict data tools to validated read-only requests; calculate values in deterministic code and cite evidence. Treat commentary and provider text as data, not tool instructions. Answer unsupported questions with coverage limits.
4. Build a validated historical results store and team identity mapping. For this season versus five previous seasons, compare same competition, per-game rates and equal-game checkpoints; account for promotion/relegation and incomplete seasons. Advanced xG comparisons remain pending verification.
5. Expand AI to season/history tools after calculation tests and evaluations for wrong entities, missing seasons, partial coverage and time-sensitive facts. Keep web/news evidence separate from calculated football statistics.

No model/API integration, credentials, database import, heatmap UI or new application feature was implemented during this audit. Next suggested implementation: detailed player stats and heatmaps within existing match pages, followed by match-scoped AI.
