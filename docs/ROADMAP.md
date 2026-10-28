# Roadmap

Updated 2026-10-26 after inspecting the saved code and resuming local verification.

## Built: local current-football prototype

- Foundation: Node 22, Next.js, React, TypeScript, locked dependencies and preserved local raw datasets.
- Classic matches page (`/`): real scores, live clock, refresh, date/league/live filters, themes and mobile layout.
- Dashboard (`/dashboard`): normalized complete match schedule, live ticker/hero, player spotlight, season profile and recent form.
- Date controls: selected day and previous/next week arrows; matches load independently of slower player data.
- Match pages (`/matches/[id]`): match information, events, lineups, team stats and separately loaded commentary, subject to source coverage.
- League pages (`/leagues`, `/leagues/[id]`): seven competition entry points, standings including grouped tables, ten recent results and ten upcoming fixtures.
- Navigation: dashboard rail, classic list, league links, match links, and Home/logo links from the classic view.
- Server-side provider/adapter boundaries for normalized schedules, match details/commentary and league data; explicit missing-data states.

These features have been demonstrated during development. This remains a local prototype, not a production service. See VERIFICATION.md for what was actually checked.

## Resume checkpoint

- [x] Restart the FotMob MCP server on localhost:8000.
- [x] Verify today's dashboard data and dashboard → match navigation.
- [x] Verify league directory → Premier League standings, results and upcoming fixtures.
- [x] Re-run lint, TypeScript, all 112 tests and an isolated alternate production build (webpack).
- [ ] Verify the default Turbopack production build locally without a concurrent dev server in the same folder.

## Next product milestone

The product priority is AI-backed football analysis, detailed player game statistics, heatmaps and multi-season comparisons. The [2026-10-26 coverage audit](DATA-COVERAGE-AUDIT.md) verifies usable match player stats/heatmaps and five Premier League fixture seasons, but identifies failed player-history pagination and unverified historical advanced team stats.

Player stats and covered heatmaps are now implemented within match pages (2026-10-26). The match-scoped Gemini analyst is connected, with live score/statistics answers and source links smoke-tested. Broader factual/adversarial evaluation remains in progress. Next recommended order: broaden match AI evaluation → player pages with recent logs → validated historical results storage/comparisons → broader AI questions. Full player history depends on repairing pagination or validating an alternative. This audit authorizes no new implementation milestone by itself.

Still open: settle dashboard versus classic list as the default entry point, and choose how to source photos when expanding beyond the current spotlight player.

## Not built yet

- Dedicated team and player pages, search and favourites.
- Historical match import/storage and date-correct Elo joins.
- StatsBomb coverage discovery, shot maps and pitch diagrams.
- Broad historical football questions; live-model evaluation of the new match analyst is pending.
- Hosted deployment and operation of the data service outside this Mac.

Review each milestone before starting the next. Preserve original datasets; do not import raw provider payloads into browser code. Public launch, payments and broad infrastructure are outside the current scope.


### Accepted slice: team-form follow-ups in match chat (2026-10-26)

Implemented current team fixture/primary-league retrieval for both match participants, normalized result records and current-season standings evidence. Same-chat follow-ups resolve team references and distinguish all-competition form, league form and form before the viewed game. Real two-turn Barça chat verified; detailed cross-match tactical research and historical multi-season comparisons remain future slices.


### Accepted slice: historical league questions in match chat (2026-10-26)

Implemented on-demand, cached historical league retrieval for either participant (up to five seasons), explicit/relative season resolution and follow-up comparison context. Added identity checks, fixture/table reconciliation, server-computed rates and failure coverage notes. Demonstrated Barça last-season summary, current-versus-last comparison and a five-season summary. Historical advanced statistics, detailed reports for other games, arbitrary-team lookup, promoted/relegated league discovery and durable historical storage remain deferred.


### Ten-season league summaries (2026-10-26)

Expanded historical chat requests to ten seasons, with compact annual context, per-season validation, cached reads and existing missing-coverage behavior. Confirmed all ten LaLiga seasons for Barça/Real Madrid. Historical division discovery and advanced/player-season metrics remain deferred.


### Historical tactical context (2026-10-26)

Fixed vague few/recent season resolution and added a reviewed, dated source library for Barça’s high-line history and related follow-ups. UEFA/Opta observations are distinct from FotMob season totals. This is the first bounded reporting topic, not unrestricted web research; expanding club/topic coverage and a live research provider remain future work.


### General football chat and public research (2026-10-26)

Removed the match-only knowledge restriction, added explicit knowledge/context provenance, research planning and a public lookup/news-feed provider. Global questions can bypass match fetching and continue through source failures. Optional Google-grounded research is integrated but this project's search quota is unavailable; default lookup/news feeds do not depend on it. Further work: broader news/search access and evaluation, authoritative live scores/player-history retrieval for arbitrary entities, production dependency/security updates, and persistent conversations.

- Current-club analysis: canonical-name lookup, recent form/statistics and latest-match narrative are connected to research. Next quality work: broader reporting coverage and a repeatable evaluation set for multi-turn analysis; current smoke checks cannot guarantee every causal answer.

### Chat reliability and evaluation (2026-10-27)

Added whole-request deadlines, cancellation-safe request exclusion, bounded error diagnostics and route-level recovery tests. Narrow standalone football concepts skip match retrieval. Added a seventeen-scenario live evaluation runner with follow-up turns and explicit human-review rubrics. Production/distributed limits and broader reporting coverage remain separate work.

- Long-answer transport now uses bounded local background tasks with short reconnectable status checks. Actual dropped-response simulation passed; original Firefox interruption root cause remains unconfirmed. Durable/distributed task storage is deferred until deployment work.

- Tournament-odds follow-ups now retain competition scope and distinguish on-paper predictions from bookmaker rankings. A verified live bookmaker/market feed is still missing; no numerical current odds should be claimed until one is connected.

### Verified odds connection (2026-10-27)

Connected The Odds API using the private server key. Viewed-match odds include bookmaker names, decimal prices, update timestamps and strict fixture/market/freshness validation, with cached on-demand requests. Actual EFL Cup match quotes verified. EFL Cup outright/finalist markets remain unavailable in this provider's current catalog; another verified source is needed for those markets. No bookmaker transactions or automatic betting are implemented.

- Transfer roundups now include dedicated dated gossip feeds, stricter relevance and rumour labeling. Exact suggested-question live check returned concrete reports. This remains bounded publisher-feed research, not exhaustive web search.

### Competition-wide analyst context (2026-10-27)

Added normalized tournament stages, full fixtures, known ties/advancing teams, active-field coverage checks and reported team routes. EFL Cup is the first verified full knockout format, with season-matched official calendar and same-season Premier League context for contenders. Current-tie final-pair conflicts and simple final-date questions have direct factual answers. FA Cup/Champions League fixture context is partial; complete calendars/rules for other tournaments and a visual bracket remain future work. No future draw links or bookmaker finalist probabilities are invented.

### Competition context expansion — 2026-10-27
Match chat now loads normalized standings, results, fixtures and source-reported playoff ties for any provider-identified viewed competition. Named routing covers all sidebar leagues, FA Cup, EFL Cup, DFB Pokal and Spanish Supercopa; exact-name provider search resolves additional competition names without trusting the first hit. Group/conference standings remain separate; league rounds are not knockout ties. Explicit source playoff matches supplement incomplete flat fixture lists. Current competition-specific qualification rules and calendars still require separately verified sources; EFL's dedicated calendar remains the only custom calendar integration. This is universal data loading, not a claim that every competition's rules or future draws are supplied by the provider.

### Focused match analysis — 2026-10-28
The analyst now assembles question-focused observations from normalized match measurements, formation labels, verified provider ratings, selected player performance and relevant reported incidents. Named-player follow-ups retain verified data/timestamps and selected players beyond the default squad limit are prioritised. Detailed ratings take precedence over rounded lineup displays. Prompt rules distinguish chance quality from causal tactics, live from completed matches, uncertain injury reports from diagnoses, and whole-game totals from before/after substitution evidence. Exact rating-action weights are unavailable and cannot be fabricated. No new tracking, pass networks, shot coordinates or time-split measurements were added in this milestone.

### Recent manager statements (2026-10-28)
Reported-speech questions now explicitly request verification. Public research supplements general publisher feeds with a targeted, dated news-headline search. Results require the speaker terms, valid dates and a safe search-result URL; metadata is labelled as headline-only, not a retrieved article/transcript. Headline quotations cannot be expanded into invented press-conference remarks. Search remains source-dependent, including Google grounding quota availability; no exhaustive press-conference archive is claimed.

### Search/article provider activation pending (2026-10-28)
Implemented optional Tavily search/article retrieval with existing Gemini synthesis. Shared public research synthesis now accepts retrieved article excerpts without mislabelling them as headline-only results. Activation requires the user's Tavily key in ignored `.env.local`; auto mode selects it when present. Integration tests pass; a live end-to-end test remains pending until the key is saved. No Google billing upgrade was performed.

- Tavily activation completed (2026-10-28): live search returned extracted article text, and the exact manager-comments question succeeded through the chatbot. The private key is in ignored `.env.local`; the shared template is blank.
