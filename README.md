# Football Intelligence

M0 foundation for a personal football intelligence product. One static page; no product features or data connections yet.

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

No API keys, database, CSV import, or environment setup is required. If port 3000 is occupied, use `npm run dev -- --port 3001` and open that port.

If your environment reports `EMFILE` while watching files, stop the server and run `WATCHPACK_POLLING=true npm run dev`. This was needed in the restricted verification environment.

## Verify

```sh
npm run lint
npm run typecheck
npm run build
npm start
```

`npm run check` runs lint, typecheck and build together. `npm start` serves the production build. Typecheck generates Next.js route types before checking TypeScript, so it also works on a fresh clone. No test framework is added for a static placeholder; introduce behavior tests with actual features.

## Where things live

- `src/app/page.tsx`: the foundation page.
- `src/app/layout.tsx` and `globals.css`: page wrapper and styling.
- [Product](docs/PRODUCT.md): intent and M0 scope.
- [Architecture](docs/ARCHITECTURE.md): present structure and future boundaries.
- [Data sources](docs/DATA-SOURCES.md): current/recent, historical, Elo and event-data plan.
- [Roadmap](docs/ROADMAP.md): review gate and later milestones.
- `data/raw/`: local original CSVs, ignored by Git; no database or processing.
- [Verification](docs/VERIFICATION.md): actual checks performed.

Dependencies are locked in `package-lock.json`; use `npm ci` for repeatable installation. Generated output, datasets and secrets are ignored by Git. This is a local repository with no remote or deployment configured.

**Stop at M0 for review before building M1.**
