# Product

A personal football intelligence web product, initially running locally, for understanding current football and exploring historical matches. Start small, use it, and let actual coverage gaps guide future work. Public launch and monetization are outside the current plan.

## Current status (2026-10-26)

A local current-football prototype is built: classic matches, a dashboard, match details/commentary and league standings/results/fixtures. Live data depends on the separately running FotMob MCP service. Dedicated team/player pages, historical imports, a database and AI chat remain future work. See ROADMAP.md for the current checkpoint and VERIFICATION.md for checks and limitations.

## Future direction

Eventually explore matches, competitions, teams and players, and ask football questions backed by relevant evidence. Distinguish unavailable data from zero values. Show source provenance and coverage limits rather than implying every match has detailed statistics.

The future intelligence layer should select relevant sources based on the question, time period, and available coverage. It must not query every provider for every question. Broader ideas such as player evolution and deeper investigations remain exploratory.

## Review gate

M0 was accepted. Review each new milestone before starting the next. The order below is a plan, not authorization to implement it.
