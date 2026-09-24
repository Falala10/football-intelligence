# Roadmap

## M0 — Foundation (accepted)

- [x] Node 22, Next.js, React, TypeScript, Tailwind and npm lockfile.
- [x] Minimal page, VS Code workspace, Git and local setup instructions.
- [x] Product, architecture and source documentation.
- [x] Preserve uploaded CSV sources without importing them.
- [x] User review and acceptance.

Verification results for M0 are recorded in `VERIFICATION.md`.

## M1/M2 slice 1 — Matches page (built; awaiting review)

- [x] Live scores from the FotMob MCP over HTTP, cached briefly on the server (about 10 seconds).
- [x] Live minute that keeps counting between refreshes, score-change highlight, automatic refresh (30 seconds while matches are live).
- [x] Date navigation, "Live now" filter, sidebar league filters (Premier League, LaLiga, Serie A, Bundesliga, Ligue 1, Champions League, MLS).
- [x] Light theme by default with a dark toggle; loading, error and empty states; phone layout.
- [x] Unit tests for the data checks, clock, dates, URLs and league ordering.
- [ ] User review and acceptance.

### Dashboard prototype (`/dashboard`; built, awaiting a design decision)

- [x] Dark cinematic look: live-scores ticker, live hero card, player spotlight with photo, season rings, recent form, day counts, match cards, week strip and league pills.
- [x] Real data, including the new `get_player_profile` MCP tool; motion for entrances, counters, rings, bars and live badges, all off under "reduce motion".
- [ ] Decide which direction to keep (dashboard or classic list), the default theme, and how photos are sourced for more players.

Not in this slice: match pages (commentary, events, lineups, stats, shot maps), league pages (tables and fixtures), player and team pages, chat.

## Later milestones — not started

1. **M1: Basic product shell.** Agree the first useful screen and navigation before implementation.
2. **M2: Current football.** Validate and connect one narrow FotMob use case, including loading, failures and coverage.
3. **M3: Historical matches.** Audit Matches.csv, choose storage and identifiers, then implement a reproducible import and limited read path.
4. **M4: Historical Elo.** Audit and map EloRatings.csv; establish date-correct joins.
5. **M5: Detailed events.** Add StatsBomb coverage discovery and enrichment for supported matches.
6. **M6: Shared data layer.** Consolidate learned adapter contracts, identities, provenance and coverage handling.
7. **M7: Intelligence.** Route questions to relevant sources with evidence, limits and evaluations; do not query all sources indiscriminately.

Review each milestone before starting the next. No production deployment, public launch, payments, or broad infrastructure is part of M0.
