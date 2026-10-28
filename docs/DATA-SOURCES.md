# Data sources

Current FotMob data is integrated. See [the coverage audit](DATA-COVERAGE-AUDIT.md) dated 2026-10-26 for live sample findings, historical CSV counts and known blockers. The table below preserves the original M0 inventory; its M0 status is historical, not current.

| Source | Intended role | M0 status | Coverage caution |
| --- | --- | --- | --- |
| FotMob MCP | Current, recent, and live football | Existing experiment described in prior work; not connected here | Verify endpoints, fields, transport, and availability during integration. Do not assume universal historical coverage. |
| Matches.csv | Broad 2000–2026 historical club-league matches | Original uploaded dataset preserved locally | 2000–2026 is the planning range, not a fresh audit. Check exact dates, competitions, duplicates, and missing statistics before import. Do not assume cups, player-level data, or detailed events. |
| EloRatings.csv | Historical club Elo/strength context | Original uploaded dataset preserved locally | Audit dates, team identities, rating semantics and timing before joining to matches. Avoid using future ratings for past questions. |
| StatsBomb Open Data | Deeper event data where available | Planned; not downloaded or connected | Selected competitions/matches only; never assume complete historical coverage. |

## Source files

The two uploaded CSV files are copied byte-for-byte into `data/raw/`. `data/raw/manifest.json` records filenames, byte sizes and SHA-256 hashes. CSVs are intentionally ignored by Git and stay out of `public/`, the browser bundle and deployment assets. A fresh Git clone requires separate copies of these datasets only when later data work begins; M0 runs without them.

No CSV content was parsed, transformed, imported, or used to build a database at M0. Preserve the originals and record future transformations separately. The original dataset publisher/version, field dictionary and usage terms still need recording before ingestion; do not infer them from filenames.

## Future source selection examples

- A live score question: current-data adapter, subject to coverage.
- A historical league result: historical match store after import.
- Historical club strength: Elo, joined to matches only when relevant.
- A detailed passing or shot question: check StatsBomb match coverage first.

Missing coverage is an explicit outcome. The intelligence layer should not query everything by default or fabricate detail from broad match results.
