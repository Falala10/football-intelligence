# Architecture

## Implemented at M0

- Node.js 22 and npm, with a committed dependency lockfile.
- Next.js App Router, React, strict TypeScript, and Tailwind CSS.
- `src/app/`: root layout, global styles, and one static foundation page.
- `docs/`: product, architecture, source inventory, and milestones.
- `data/raw/`: unchanged local source datasets, excluded from Git and web assets.
- ESLint and separate typecheck/build commands. Git tracks code and documentation.

There is no database, backend API, provider client, MCP connection, AI SDK, or ingestion job. The app does not read the CSVs. No credentials or environment variables are required. System fonts avoid a build-time font download.

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
