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
