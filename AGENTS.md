# Project scope

M0 is accepted and slice 1 of M1/M2 (the Matches page with live FotMob data) is built and awaiting review. Read README.md and docs/ROADMAP.md. Do not implement later slices or milestones without user authorization. Preserve raw datasets; never commit them or import them into browser code. Use Node 22 and run npm run check for code changes.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
