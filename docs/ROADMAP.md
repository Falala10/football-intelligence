# Roadmap

## M0 — Foundation (current; ready for review after verification)

- [x] Node 22, Next.js, React, TypeScript, Tailwind and npm lockfile.
- [x] Minimal page, VS Code workspace, Git and local setup instructions.
- [x] Product, architecture and source documentation.
- [x] Preserve uploaded CSV sources without importing them.
- [ ] User review and acceptance.

Verification results are recorded in `VERIFICATION.md`. Stop here until review; later milestones are unstarted proposals.

## Later milestones — not started

1. **M1: Basic product shell.** Agree the first useful screen and navigation before implementation.
2. **M2: Current football.** Validate and connect one narrow FotMob use case, including loading, failures and coverage.
3. **M3: Historical matches.** Audit Matches.csv, choose storage and identifiers, then implement a reproducible import and limited read path.
4. **M4: Historical Elo.** Audit and map EloRatings.csv; establish date-correct joins.
5. **M5: Detailed events.** Add StatsBomb coverage discovery and enrichment for supported matches.
6. **M6: Shared data layer.** Consolidate learned adapter contracts, identities, provenance and coverage handling.
7. **M7: Intelligence.** Route questions to relevant sources with evidence, limits and evaluations; do not query all sources indiscriminately.

Review each milestone before starting the next. No production deployment, public launch, payments, or broad infrastructure is part of M0.
