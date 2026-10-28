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

## Normalized dashboard schedule (2026-10-01)

- Node 22.23.2: lint and TypeScript checks passed; 13 test files / 90 tests passed.
- Default Turbopack build was blocked by the verification sandbox when a CSS worker tried to bind a local port. No project build configuration was changed.
- Alternate verification with `next build --webpack` passed compilation, TypeScript, static generation and build tracing for `/` and `/dashboard`.
- Production dashboard with the MCP offline rendered the explicit unavailable message.
- A temporary local MCP fixture exercised the complete production server → provider → mapper → dashboard path. Browser verification showed all eight matches in two groups, every supported status, zero scores, missing-score placeholders and timezone-formatted kickoff times. Existing league filtering and date navigation preserving the league were verified.
- Fixture data was used only for verification, never added to application code. Temporary servers and the preview tab were closed afterward.
- Real FotMob browser verification remains pending until the user's MCP server is running.

## Match detail page (2026-10-01)

- Lint passed; 15 test files / 98 tests passed. Isolated production build with `next build --webpack` passed TypeScript, compilation and route generation including `/matches/[id]`.
- `npm run check` was attempted in an isolated copy to preserve the user's running dev server; its Turbopack phase rejected the external node_modules symlink. The alternate build required no application configuration changes.
- Real browser verification followed a dashboard card to Curaçao–Trinidad and Tobago (5991883): score, finished status, match information, events, both lineups and grouped stats rendered successfully.
- Browser verification caught encoded dynamic route IDs; the route now decodes once before validating the provider ID.
- Tests cover missing coverage, missing scores/stats, zero values, malformed/mismatched responses, substitutions, assists, penalties, stoppage time, unsafe IDs and failure recovery.

## Dashboard responsiveness (2026-10-01)

The header/date/league controls render without awaiting football data. The match schedule and ticker stream separately, and the spotlight/season/form sections have their own Suspense boundaries sharing one player request. Card entrance animation is 200ms with no stagger delay.

Controlled production streaming test with a six-second failing player request: date controls arrived at 0.122s, all eight fixture matches at 0.133s, and player failure panels at 6.148s. This verifies independence, not real upstream latency. Real dashboard browser rendering was checked with FotMob data. Lint, TypeScript, 98 tests and the alternate production build passed in an isolated copy without disturbing the user's dev server.

## Match commentary (2026-10-01)

Real browser verification on Curaçao–Trinidad and Tobago (5991883) showed automatic commentary newest first, including 90+3 and 90+1 stoppage-time labels, goals and substitutions. Commentary loads in a separate Suspense boundary and uses the existing live match refresh. Unit tests cover human/automatic source mapping, no coverage versus empty updates versus failures, malformed/wrong-match data, and recovery. Lint, TypeScript, all 104 tests and the alternate isolated production build passed.

## League pages (2026-10-01)

Lint, TypeScript, all 112 tests and the alternate isolated production build passed, including `/leagues` and `/leagues/[id]`. Real browser verification showed 20 Premier League standings rows, ten latest results and ten upcoming fixtures. MLS rendered Eastern, Western and Supporters Shield tables separately. A result card opened Fulham–Manchester United correctly. Tests cover missing data, zero/negative table values, table groups, scores before kickoff, statuses, fixture ordering/limits, ID validation and failure recovery.

## Resume verification (2026-10-26)

- Restarted the local FotMob MCP on 127.0.0.1:8000; retained the existing dev server on 3000.
- Real browser dashboard loaded 98 matches across 50 competitions plus the player spotlight. Counts are a point-in-time observation, not fixed expectations.
- Dashboard → Sevilla–Osasuna showed scheduled status, venue and lineups, with explicit missing events/commentary/stats.
- League directory → Premier League loaded 20 standings rows, ten recent results and ten upcoming fixtures.
- A league result opened Sunderland–Leeds (5795494), with full-time 0–0, events, human-written commentary, lineups/ratings and grouped team stats. No application repair was required in these sampled paths.
- Node 22: lint and all 112 tests passed in the repository. An isolated copy passed lint, route type generation, TypeScript, all tests and production webpack compilation/generation.
- Default Turbopack build in that copy failed because its node_modules symlink points outside the project filesystem root. This does not verify or diagnose the default build in the original checkout. The running dev server's .next output was left alone. No build configuration was changed.
- Reconciled README, PRODUCT and ROADMAP with the saved implementation; no new product milestone was implemented.

## Player match stats and heatmaps (2026-10-26)

Added independently streamed player performance to match pages: team-grouped selector, typed grouped statistics and safe coordinate-only heatmap rendering. Heatmaps join through the explicit Opta ID in each FotMob player record; a regression test uses different IDs. Raw SVG is never embedded. Missing/unavailable maps remain separate from player stats, and failed map loads can retry without caching a failure. Physical units not yet verified are explicitly labelled provider units.

Real browser verification on Sunderland–Leeds (5795494): Xhaka and Hume selection updated both statistics and heatmaps; goalkeeper Roefs and substitute Alderete also showed maps. Unused squad member Ellborg showed unavailable minutes, no map and no stats. Phone layout verified at 390px with stacked content, then viewport reset. A transient source failure occurred during checking and recovered on reload.

Lint, TypeScript, all 118 tests and isolated alternate production webpack build passed. The original dev server was kept running; default Turbopack build remains unverified. Tests include zero/missing values, fractions, match identity, coordinate bounds, unknown players, invalid route rejection and heatmap failure recovery. No AI or historical player pagination was added.

## Match AI integration (2026-10-26; activation pending)

Added a match-scoped question form with suggestions, an on-demand same-origin local API handler, normalized evidence snapshots and OpenAI Responses structured output. Claims require known source IDs; UI includes evidence text/timestamps and coverage limits. No live AI answer was generated: no API key is configured. A blank ignored .env.local and tracked .env.example were prepared; credentials/model access and live factual/prompt-injection evaluations remain pending. Tests use explicitly mocked provider replies, not a simulated production AI mode.

130 tests across 25 files, lint, route TypeScript generation and the isolated alternate production webpack build passed. The default Turbopack build was not rerun; the existing dev server was preserved. Initial build detected an unsupported route runtime declaration under Cache Components; it was removed, and the final full checks passed. Browser checking caught and corrected a duplicate sibling React key.

Real browser checked the disconnected panel, suggested-question filling, disabled submit and phone layout at 390px; viewport reset. Live HTTP tests verified missing setup returns 503 without a model request and cross-origin requests return 403. Unit tests exercise successful API response parsing, exact server evidence selection, zero/missing values, deterministic percentages, known/unknown citations, unsupported-answer schema, invalid IDs/body/origin/host, local attempt limits, provider limits/auth failures, incomplete output and transport failure. Citation validation checks references, not semantic entailment. End-to-end answer UI and live model quality still require credentials. See AI-MATCH-ANALYST.md for evaluation cases.

## Gemini provider switch (2026-10-26; activation pending)

At the user's request, replaced the active OpenAI adapter with native Google Gemini generateContent. Configuration now uses GEMINI_API_KEY/GEMINI_MODEL; default gemini-3.5-flash-lite was verified against Google's model/pricing documentation as supporting structured output and a free tier. Actual project quotas, access and billing are not controlled by this app. Existing nonblank credentials in local configuration were preserved, not printed; empty OpenAI configuration was replaced. No Gemini key was configured or live answer generated.

The key travels in x-goog-api-key, never a URL or client bundle. Bounded structured JSON responses retain the existing evidence validator. Only one STOP-completed model candidate is accepted; thoughts, safety blocks, incomplete replies, invalid model IDs and unknown citations are handled. No provider fallback is enabled.

133 tests, lint, TypeScript and isolated alternate production webpack build passed. The running app displayed the updated Gemini disclosure and honest disconnected state. A live HTTP call without a key returned setup/503 without a generation request. The default Turbopack build and live factual/prompt-injection evaluations remain pending.

## Live Gemini activation (2026-10-26)

Confirmed a nonblank local Gemini key without printing it. Restarted the stopped website under Node 22; file watching hit EMFILE, so the agent-owned dev process was restarted using the documented WATCHPACK_POLLING=true setting. The existing MCP service was retained. No application code changed.

Real Gemini calls through the app returned: (1) Sunderland–Leeds 0–0 with match/commentary references; (2) browser answer with shots 15–11, on-target shots 4–4 and xG 0.83–0.76, explicitly distinguishing conflicting commentary xG figures; (3) a scope question correctly returned insufficient_evidence and empty claims for five-season comparisons. The browser citation jumped to the source, and expanding it showed the matching values and retrieval time. Saved a screenshot of the real answer.

One concurrent request was rejected by the intended in-flight guard (429), and an initial season-history request timed out (502); the later scope question succeeded. These are smoke checks, not a completed reliability or adversarial evaluation. Existing 133-test/build results remain the latest code checks; no code changes required another build. Credential values were neither displayed nor committed.

## Analyst incident retrieval and depth (2026-10-26)

Investigated match 5868105 using full fresh MCP commentary (89 entries) and match-page events. The 10-minute Espart/Tchouameni challenge, 29-minute injury update and 30-minute substitution commentary were beyond the prior newest-50/newest-12 windows. The substitution event supplied injury:true, which the app mapper discarded. Analysis now fetches full commentary separately, reserves bounded narrative context before player stats and preserves the injury indicator. Prompt instructions request explanatory paragraphs with source attribution rather than disconnected statistic bullets.

136 tests, lint, TypeScript and isolated alternate production webpack build passed. New regressions cover incidents beyond the old commentary caps, separate full-analysis fetching and injury flags without invented diagnoses. The dev server required a restart to stop serving prior code. A real Gemini retest returned the injury-related Espart substitution and qualified earlier-challenge connection, alongside the low-block account and the 41/61/87-minute goal sequence. These are source-backed narrative explanations, not independent proof of tactical causality or a medical diagnosis. Default production Turbopack remains unverified.

A browser retest exposed a further semantic error: an output attached Valverde's walking-gingerly observation to Espart. Instructions were tightened to preserve subjects in multi-player commentary and avoid accepting user premises as evidence. A subsequent browser answer reported Espart's injury-related substitution and qualified challenge connection without that misattribution. Live generation still varies and is not independently entailed/medically verified; further semantic evaluations are needed. Final 136 tests, lint, TypeScript and alternate build passed after the instruction change.

## Conversational match analyst (2026-10-26)

Replaced the report-style answer panel with a user/assistant message log, composer and New chat reset. Removed visible citation links, evidence/coverage accordions and answer metadata. References remain validated on the server. Recent conversation context (up to six complete pairs/48KB) is bounded, match-scoped, role-validated and explicitly untrusted alongside fresh source evidence. Body cap is now 64KB. Draft recovery keeps earlier messages after failures; Enter sends and Shift+Enter inserts a newline. State is page-local, not durable storage.

141 tests, lint, TypeScript and isolated alternate production webpack build passed. Tests cover bounded Unicode history, turn ordering/roles, match identity and forwarding history separately from fresh evidence. The final build retains the running user's app without touching its .next output; default Turbopack production remains unverified.

Live browser verified a two-turn Gemini exchange: “Who replaced Xavi Espart?” → Balde, then “What happened to him before he came off?” → Espart's challenge/injury timeline, without restating the name in the follow-up. Both messages remained visible and no source links/panels appeared in the chat. Initial generation failures restored the draft; a later retry and follow-up succeeded. New chat reset and 390px phone layout were checked, viewport reset, and a screenshot saved. Google response reliability and generic limitation wording remain separate quality concerns; conversation context does not establish answer truth.

## Bounded tactical reasoning and general concepts (2026-10-26)

Revised literal-match-only instructions so the analyst can distinguish reported match facts, explicitly qualified interpretations and general football concepts. Added a separately typed general coaching reference (kind:coaching-principles), which is expressly not proof that a team used a tactic. Possession, formation, offside totals and an isolated counter are not accepted as measurements of a high defensive line. Unsupported current/historical team/player facts remain unavailable; no cross-match/news retrieval was added.

Live browser tests on Barcelona–Real Madrid answered the high-line question with reported counter/run-in-behind incidents and the general trade-off while preserving uncertainty about actual line height. A general high-line versus high-press question was also answered without a match-only refusal. An output leaked bracketed internal reference labels into prose; instructions and server normalization now remove known evidence markers from conversational text while preserving reference validation. A regression covers that rendering boundary.

144 tests, lint, TypeScript and the isolated alternate production webpack build passed. These tests validate boundaries and request construction; they do not prove semantic correctness of tactical inferences. General coaching references were checked against FIFA Training Centre; specific observations remain drawn from the match source. Default Turbopack production remains unverified.

## Natural chat voice (2026-10-26)

Updated generation instructions to lead with the football answer and avoid routinely naming commentary, datasets, match snapshots or other provenance machinery. Qualification remains natural (for example, "looks linked") and source discussion remains available when asked or needed to explain a material conflict. No source facts, citation validation or data-access boundaries were removed; no wording was mechanically stripped from factual text.

The initial wording instruction still produced "Commentary notes" in a live test, so a final explicit conversational wording rule was added. A fresh browser retest of the Espart question then returned the injury-related substitution and qualified challenge link with no commentary/source terminology. Final 144 tests, lint, TypeScript and isolated alternate production webpack build passed. Style quality remains model-dependent; this smoke test is not a guarantee over all prompts. Default Turbopack production remains unverified.

A tactical follow-up initially became too definite about an aggressive high-pushing setup while avoiding source jargon. The final instruction now explicitly says natural tone does not override uncertainty and requires precise supported action descriptions. The final live retest discussed transition difficulties and the 87-minute move without claiming confirmed line height or mentioning commentary. Final full checks again passed (144 tests, lint, TypeScript, alternate build). Replies may still sound formal in places; this is a style improvement with factual guardrails, not a guarantee of perfect phrasing or inference.


### Team-form chat — 2026-10-26

- 149 tests across 29 files pass, including team identity validation, score selection, home/away record calculation, deduplication, exclusions, pre-match cutoff, separate league/all-competition scopes, table mismatch warnings, partial fetch failures and server-only team evidence in the chat endpoint.
- Lint, generated route types, TypeScript and production webpack build pass in the isolated verification copy. Its build script uses next build --webpack; default Turbopack production build was not reverified in this slice. Original dev server remains running separately.
- Live browser/Gemini: “How have Barça done in their last five competitive games?” returned W3 L2, 15 goals for/9 against, with the five correct opponents/results. Follow-up “And how are they doing in LaLiga this season?” retained Barça and returned 2026/27, first, played10/W9/D0/L1/27points and 40–11 goals (4/1.1 per game). Compared against fetched team and league responses.
- Screenshot: chat workspace outputs/team-form-chat.png. No visible citations or source panels. Tests and these two live replies do not establish accuracy for every league or question; mismatched/missing fixtures remain explicit gaps. No commit created.


### Historical-season chat — 2026-10-26

- 157 tests / 32 files pass. New checks cover short/full/calendar/relative season labels, maximum-five bounds, invalid/future labels, follow-up scope and explicit current-season switches, assistant-history distrust, exact returned season checks, historical rates/fixture-table disagreement, missing team membership, per-request league-season deduplication and fetch-failure degradation.
- Lint, generated route types, TypeScript and production build pass in the isolated verification copy using next build --webpack. Default Turbopack production build remains unverified in this slice.
- Fresh MCP LaLiga 2025/2026 returned the matching selectedSeason and 380 fixtures. Barça’s overall table was played38/W31/D1/L6/94points/+59; its 38 fixture scores totalled 95 for/36 against.
- Real browser/Gemini: “How were Barça last season?” correctly selected 2025/2026, gave the matching table/goals and calculated 2.47 points/game, 2.5 goals/game, 0.95 conceded/game. “Compare that with this season. Are they doing better?” retained Barça and compared current 10-game rates against those 38-game rates. Screenshot in chat workspace outputs/historical-season-chat.png.
- Real endpoint/Gemini five-season query returned distinct cited evidence for 2021/2022 through 2025/2026. No model-selected endpoint or secret exposed. These smoke tests do not prove all leagues/seasons or every generated claim; semantic answer validation remains limited. No commit created.


### Ten-season expansion — 2026-10-26

- Fresh MCP reads for LaLiga 2016/2017 through 2025/2026 returned the requested selectedSeason, 380 fixtures per season and Barcelona/Real Madrid overall table records. Recomputed played/W/D/L/goal difference from scored fixtures reconciled with all 20 team-season table records. Scratch responses remain outside the repository.
- Resolver accepts one to ten in digits/words, preserves calendar labels and inherited scope, and rejects eleven. Tests cover ten-season deduplication, retained current context and per-season partial failure. Compact historical evidence omits recent-game examples while retaining records/rates/coverage warnings.
- Initial browser smoke request returned invalid_answer under the old eight-claim/reference bounds. Expanded bounded validation to 24 claims/references, with tests accepting twenty known team-season records and rejecting excessive/unknown references. Repeated live browser request returned all ten Barça seasons with correct positions/points. Screenshot in chat workspace outputs/ten-season-chat.png.
- Subsequent real endpoint/Gemini request for both teams returned two compact paragraphs with all twenty validated historical references and matching positions/points, from 2016/2017 through 2025/2026. No claim is made that every team/league has identical coverage or that historical division changes are discovered automatically.
- Final isolated npm run check passes: lint, route generation, TypeScript, 160 tests in 32 files and production webpack build. The temporary verification copy uses next build --webpack; default Turbopack production build remains unverified here. No commit created.


### More conversational analyst — 2026-10-26

- Refactored conversation policy into src/lib/ai/conversation-style.ts and revised the Gemini prompt/schema descriptions to favor brief opinion/disagreement responses, correction of actual earlier overstatements and plain language without repetitive match recaps. Factual/schema/reference checks are retained.
- Recent validated history now uses native ordered user/model turns. Current evidence and the latest user message occupy separate final-user parts; a server-built prior-assistant flag discourages imaginary first-turn apologies. Updated transport test checks role mapping, separate fresh evidence/latest question and prior-reply state. The API still validates history length/roles/match association before this call. Official reference consulted: https://ai.google.dev/api/generate-content.
- Real endpoint evaluation seeded an unsupported prior claim that clever running forced the first-goal clearance, then sent correction/overrated/lucky follow-ups. Replies became shorter and corrected the causal overstatement. Iterations also exposed source jargon, an imagined apology and a reputation/finishing defence; these drove further policy refinements. Responses remain model-generated, and semantic grounding/tone are not guaranteed by reference validation.
- Final browser three-turn check: initial criticism of first-goal praise returned a brief fortunate-deflection response without an imagined prior apology. “Mbappe is overrated” got a short disagreement; “I mean the praise for this game, not his entire career” correctly narrowed to the two finishes in a single paragraph. The disagreement still used evaluative phrasing about movement/scoring, so broader semantic/tone evaluation remains open. Screenshot: chat workspace outputs/natural-football-chat.png.
- Final isolated npm run check passes: lint, route generation, TypeScript, 160 tests in 32 files and production webpack build. The temporary check copy uses next build --webpack; default Turbopack production build remains unverified here. No commit created.


### Historical tactical-reporting fix — 2026-10-26

- Original screenshot question reproduced missing vague-season retrieval and missing team-specific tactical context. Added few/several/recent=three completed seasons and couple=two; numeric and explicit season behavior retained.
- Reviewed primary reporting: FC Barcelona Flick appointment (29 May 2024); UEFA Barcelona/Bayern analysis (24 October 2024); UEFA Inter/high-line analysis (9 May 2025); Opta Analyst high-line comparison (6 November 2025). Short dated paraphrases and original source URLs are stored in the reviewed catalog. This is curated source retrieval, not live general web research, and currently covers Barcelona's high-line topic. No new paid service/key or source panel added.
- Tests cover entity/topic selection, relevant USER follow-ups (including Inter), avoiding an explicit other-team switch, score-only topic switches, future-publication exclusion, evidence attachment when team feeds fail, and report-only context for historical tactical questions.
- Final isolated npm run check passes lint, generated route types, TypeScript, 165 tests/33 files and production webpack build (temporary copy uses next build --webpack; default Turbopack production build remains unverified here).
- Live browser/Gemini: the exact “hows barca playing with thier high line the last few seasons? when did they start?” now answers with Flick's arrival for 2024/2025, coordination/compactness, early-2025/2026 transition exposure and a distinction from the club's first-ever use. Follow-up “What did Inter do to expose it?” describes central regains, quick forward/diagonal passes, runs between defenders and Dumfries' wide contribution. No match-only refusal. Screenshot: chat workspace outputs/tactical-history-fixed.png.
- Model wording still needs semantic evaluation (for example, a match win is not proof it was caused by the high line). Report dates and early-season sample limitations remain explicit in model context. This smoke test is not coverage for every team, era or tactical question. No commit created.


### General football scope and public research — 2026-10-26

- Removed the blanket prohibition on football knowledge outside match evidence. Context claims require known references; knowledge claims use no invented IDs. General award/biography/news questions bypass FotMob, and general answers continue if the match feed is unavailable. The model can request research for facts outside deterministic freshness triggers.
- Added default public factual lookup through the Wikipedia API (revision infobox/table text, not just extracts), plus dated BBC Sport/Guardian football RSS summaries for news. Publisher reads are bounded, non-cached, fixed-endpoint and have no automatic redirects; XML entities are disabled. Feed links require approved HTTPS publisher hosts and no credentials. Source IDs are checked and insufficient coverage cannot be presented as verified breaking news.
- Google discovery listed older 2.5 models, but live calls returned HTTP404 unavailable to new users. The accessible 3.5 model returned HTTP429 quota exceeded when Google Search was enabled. A separate knowledge-only probe also declined the 2025 award from memory. These checks explain why relaxing a prompt alone did not solve that question. No billing settings or credentials changed; optional Google Search is not the default and there is no paid fallback.
- Live public-lookup chat returned the 2025 men's/women's Ballon d'Or winners from the retrieved award infobox, then answered an unrelated Ronaldinho playing-style question from knowledge. Latest football news was answered from current publisher feeds with dates, and latest transfer news from a BBC gossip report was phrased as interest/reports rather than completed deals. These were real Gemini calls, not hardcoded winners.
- Source expansion/collapse was checked in the browser. Public-source attribution is behind Sources; the optional Google provider retains its required visible suggestions. Researched text uses safe Markdown; provider HTML is sanitized in a Shadow DOM, without scripts/iframes. Research metadata is excluded from subsequent chat-history requests.
- Final tests/checks: lint, route generation, TypeScript, 178 tests/36 files and isolated production webpack build pass. The original default Turbopack build was also attempted with dev stopped; it failed during CSS processing because its subprocess could not bind a port (Operation not permitted). The original build script remains unchanged and the dev server was restarted.
- npm audit reports seven existing advisories involving Next/sharp/source-map-js/vite/vitest/zod, including a critical Next advisory. Newly added Markdown/sanitizer/XML libraries were not identified as the advisory sources. No broad framework upgrade/audit-fix --force was performed as part of this feature; production dependency hardening remains open.
- Limits: public feeds are a limited rolling source set and snippets are not full articles; encyclopedia entries are secondary and can be stale or incorrect. Arbitrary live scores, every player-form statistic, exhaustive transfer coverage and semantic correctness are not guaranteed. More comprehensive web search requires working provider access. No commit created.


Final follow-up smoke check: “Who won the Ballon d’Or in 2025?” returned Ousmane Dembélé/Aitana Bonmatí; “Who came second in the men’s award?” retained the year/event and returned Lamine Yamal. Source controls were collapsed by default, expanded to the Wikipedia award article, then collapsed again. The model-planned research query carried the event/year instead of looking up the short follow-up literally. Screenshot: chat workspace outputs/general-football-assistant.png. Final local dev session remains running after verification.


### Current club analysis and follow-up quality — 2026-10-26

- Model-planned research can resolve a canonical club name through FotMob search. Exact normalized identity matching deduplicates IDs and keeps men's, women's and youth teams distinct; ambiguous matches fail closed. No model-supplied provider ID or arbitrary URL is fetched.
- Research now includes current league standings, five completed competitive fixtures, the latest two available match-stat summaries and selected incident narrative from the latest game. Each sample carries its date and scope; narrative failure preserves independently available stats.
- Analytical answers may explain supported patterns instead of requiring a source to state the entire conclusion. Chance counts alone cannot establish a high line, counterattack or bypassed press. Repeated why questions are instructed to add a new explanatory step.
- Live browser: exact “why are man united not doing well this season >” returned the current record, Bournemouth possession/shot/big-chance comparison and a reported defensive error, with a limited-sample qualification. This is a qualitative smoke check, not proof of consistent model quality.
- Node 22: isolated npm run check passed lint, route types, TypeScript, 182 tests across 37 files and production compilation using next build --webpack. The repository's default Turbopack build remains unverified in this environment because its CSS worker cannot bind a local port. No build-script change was made in the repository.


### Chat lifecycle and answer evaluation — 2026-10-27

- Whole-request 80-second deadline, abort-safe active-request guard and phase cancellation checks added; client retains Stop and 90-second recovery. Distinct busy, quota, timeout, invalid-reply and connection messages. Diagnostic logs contain random request IDs, categories/status and timing only.
- Added guard and actual-route tests for cancellation, stalled providers, retry, exclusion, rate windows, local origin protection and general-topic routing. Concepts bypass match loading; dated awards retain year/event across ranking follow-ups; season-before comparisons retrieve both years.
- Node 22 full isolated check passed lint, route types, TypeScript, 198 tests/39 files and webpack production build. Repository default build script unchanged. git diff --check passed.
- Live cancellation/retry smoke succeeded. Initial answer evaluation found substantive failures, which are recorded rather than counted as passes. Follow-up review and remaining limits: docs/CHAT-EVALUATION-RESULTS.md. No commits.


### First-answer match stage — 2026-10-27

- Preserved the MCP competition round in normalized MatchDetail and AI match evidence. Named stages/legs remain as reported; unknown stages stay unknown. Numeric rounds are not generically converted to knockout stages. The EFL Cup-specific fourth-round/last-16 equivalence was checked against EFL's 16 September 2026 round-four draw and the club's official draw announcement.
- The actual Fleetwood Town–Arsenal MCP response (6275367) reports EFL Cup parent ID 133 and round 4. A narrow viewed-match identification shortcut now answers with teams, competition and stage immediately, without a model request or team-history lookup. Other conversational questions retain normal analysis.
- Added missing-stage, named semi-final/leg, numeric league-round, intent-isolation, evidence and actual endpoint regressions. Added match-stage identification to the live evaluation suite.
- Node 22 full isolated check passed lint, route types, TypeScript, 202 tests/40 files and webpack production build. Live production endpoint for fotmob:6275367 returned HTTP 200 in about 0.19 seconds: “Fleetwood Town vs Arsenal — EFL Cup, Round of 16 (fourth round).” No model request was needed. Temporary verification server stopped afterward; the main running dev process needs restarting to pick up saved changes.


### Loopback host normalization — 2026-10-27

- Reproduced on existing port 3000: localhost reached input validation, but same-browser 127.0.0.1 received forbidden. Next's normalized Request.url used localhost while Origin/Host retained 127.0.0.1.
- Local origin guard now compares Origin with the actual Host authority, requiring a loopback destination/authority/origin and matching protocol/port. Forwarded-host headers are not trusted. Cross-site, cross-port, malformed, non-local and missing origins remain rejected.
- Node 22 full isolated check passed lint, route types, TypeScript, 206 tests/41 files and webpack production build. Actual updated production endpoint at port 3006 returned HTTP 200 with the correct EFL Cup round-of-16 identification through both localhost and 127.0.0.1.
- Existing old development process PID 78319 still owns port 3000; updated preview stays available at port 3006 pending the main-server restart.


### Long-answer connection recovery — 2026-10-27

- Original screenshot follow-up reproduced against port 3000 with the same recent turns: HTTP 200 after about 13 seconds. The original browser interruption was not independently reproduced; no claim is made that its underlying network cause is known.
- Replaced the browser's single long POST with local background tasks and short status requests. Repeated starts use one task ID/body and cannot intentionally duplicate generation. The existing origin check, 64KB body bound, answer rate guard, 80-second pipeline deadline and 90-second client fallback remain. Stop cancels the task, and late results cannot overwrite cancellation.
- Task status/result polling is origin-bound, UUID keyed and no-store. Completed tasks expire after three minutes; capacity is 32. Restart/lost task, provider error, invalid response and reconnection failure have distinct messages. No model-generation retry or provider switch was added. This in-memory mechanism is for the local Node prototype, not a durable/distributed deployment queue.
- Actual client helper + production endpoint tested with the exact screenshot question/history. Intentionally discarded the first start response and one poll response; the helper reconnected to the same task and returned an answer in about 22 seconds, with a factual-coverage limitation. This verifies transport recovery, not completeness of the football answer.
- Final Node 22 isolated check passed lint, route generation, TypeScript, 217 tests/44 files and webpack production build. The repository default build script is unchanged. The actual running dev server at 127.0.0.1:3000 also completed a match-identification task through the new client helper (start/status/result), confirming the user's server has loaded the new endpoint. A page refresh is needed for the updated browser client.


### Tournament-odds follow-up scope — 2026-10-27

- Reproduced the screenshot's context: EFL Cup competition finalists followed by “based on betting odds?”. The old path treated this as match evidence. Market requests now trigger current-research handling and retain the preceding user-established competition scope. Simple odds-definition questions remain conceptual.
- Inspected the FotMob MCP verified route inventory: zero odds routes. Raw match-details contain an odds-named fan poll, not verified bookmaker prices; it is not used as odds evidence. The default research provider has no live odds feed, so it returns an explicit conversational coverage limit and distinguishes earlier on-paper assessments from market rankings. No live odds feed, numerical prices, bookmaker comparisons or finalist probabilities were added.
- Optional Google-grounded research instructions require bookmaker, market and quote timestamp, and distinguish match-winner/outright/reach-final markets. That optional provider's availability/quota remains unchanged.
- Actual port-3000 follow-up returned HTTP 200 in about 0.07 seconds, retaining EFL Cup context, explaining unavailable live bookmaker prices and distinguishing tournament markets from one-match odds. It no longer uses the provided-match-data refusal.


### Odds API connection — 2026-10-27

- Found the newly supplied key in the shared .env.example template. Moved it to ignored .env.local without changing existing settings, and replaced the template value with an empty setting. No credentials are included in response text, source links, logs or this report.
- Live authenticated sports-catalog check returned HTTP 200. EFL Cup sport key soccer_england_efl_cup is active with has_outrights=false; no separate EFL Cup winner key was present. One explicit UK/h2h quote check used one credit (499 remained immediately afterward). Current Fleetwood Town–Arsenal event and multiple named bookmaker quotes were returned.
- Added server-only normalized odds adapter, two-minute quote cache/concurrent deduplication and thirty-minute catalog cache. Matches require both teams, orientation and kickoff; sport identity and three-way h2h market are checked. Invalid/partial/lay/fan-poll/stale/future quotes are not displayed as current match prices. Market values are rendered directly rather than invented by a language model.
- Live app at port 3000 returned an answered response with decimal 90-minute match quotes, bookmaker names and update times. Tournament follow-up returned an explicit current-catalog coverage limitation instead of substituting match odds for EFL Cup winner/finalist prices.
- Key-provider setup/quota/network errors are bounded and sanitized. Region is UK; no background quote refreshing is enabled. Free-tier usage still depends on cache misses; these are local process caches and are not a production/distributed quota service.
- Final Node 22 isolated check passed lint, route generation, TypeScript, 228 tests/45 files and webpack production build. The actual reconnectable chat-task path at 127.0.0.1:3000 also returned verified match quotes successfully. Website remains running with the private key loaded. No commits.


### Transfer-news roundup retrieval — 2026-10-27

- The suggested transfer-news question returned a blanket refusal despite dated transfer reporting being available. Existing generic football feeds missed the dedicated BBC transfer-gossip feed. Added that verified public RSS endpoint and Guardian's Rumour Mill series feed; the latter's current entries were older than the freshness window and are correctly excluded.
- Filtering now checks actual headline/summary text instead of matching injected publisher/topic labels. Whole-word transfer vocabulary avoids podcast “joined by”, award-shortlist “joins” and newsletter signup false positives. URLs are deduplicated and club-specific queries require entity relevance. Rumours remain unconfirmed reports; publication dates are explicit and old items are not called today's news.
- The first live retest still used stale server code. Restarted the owned dev process with webpack and file-change polling, without changing the repository's default dev script. Exact question then returned three concrete dated updates with BBC gossip article attribution instead of refusal. This checks source-based reporting, not independent truth of the rumours.
- Empty Sources controls are hidden when no sources or required provider suggestions exist. Added the exact suggested question plus club follow-up to the live evaluation suite.
- Final Node 22 isolated check passed lint, route generation, TypeScript, 231 tests/45 files and webpack production build. Exact suggested question also passed through the actual reconnectable chat client/task endpoint, returning four dated, explicitly reported/gossip updates and four BBC article references. Main development server remains running on port 3000 with webpack polling. No additional API key was required.


### Competition-wide tournament intelligence — 2026-10-27

- Added a separate normalized tournament model/adapter for full source fixtures, stage labels, explicit playoff ties and verified winners. Match details now retain canonical parent competition identity for selecting the correct feed. Current cup questions use this context before the match-only/generic research path; unsupported/historical competition scope can still fall back to general football research.
- EFL Cup is the first fully verified knockout format. Validated its eight active round-four ties and sixteen current participants. Completed single-leg losers are excluded; unresolved shootouts remain uncertain; aggregate winners are accepted only with finished required legs. Incomplete/duplicate-team/placeholder fields are not called exhaustive. List order/drawOrder never creates future bracket edges.
- Attached season-matched official EFL calendar from the fixed public competition page, parsed without executing embedded scripts. Current source gives 21 March 2027 as the final date, with no invented kickoff. Week-commencing dates remain scheduling windows. Calendar failures preserve usable cup fixtures.
- Team routes include reported cup results and next listed ties; later draws/opponents remain unknown. Optional same-season Premier League standings cover remaining top-flight clubs separately from cup results. FA Cup and Champions League fixture/stage feeds are partial; their complete progression rules/calendars are not yet connected.
- Live: listed all sixteen EFL Cup participants and eight ties; Arsenal's route included the Ipswich third-round result and Fleetwood tie while keeping future opponents unknown. Final-pair conflict question correctly ruled out Liverpool and Chelsea both progressing from their current tie. A qualified Manchester City–Arsenal pairing cited both clubs' actual 21 points/eight league games and acknowledged that a later draw could pair them earlier. These are football assessments, not bookmaker probabilities.
- Node 22 isolated full check passed lint, route generation, TypeScript, 242 tests/47 files and webpack production build. git diff --check passed. Exact final-date question also checked through the reconnectable client/task path. Website remains running at port 3000. No commits or new API key required.


### Cross-competition match identity — 2026-10-27

- Reproduced the routing cause for the Dortmund–Bremen screenshot: cup wording entered tournament routing, a three-ID whitelist rejected DFB Pokal, and fallback discarded known viewed-match evidence. The actual match feed supplies DFB Pokal, parent ID 209, round 2.
- Expanded structural match-identification phrasing (cup/competition/league/round, conversational fillers), accepted generic fixture context from any validated viewed parent competition ID, and retained match identity across general-research/unavailable-tournament fallbacks. Rule-specific progression remains conservative; generic fixture loading is not full calendar/bracket coverage.
- Actual screenshot question returned HTTP 200 in about 0.5 seconds: Dortmund–Bremen, DFB Pokal, Round 2. A non-shortcut paraphrase returned the correct competition and second round through the model using both match and tournament evidence. This verifies the fallback path as well as the factual shortcut.
- Added cross-competition/fallback regressions and a live evaluation case pinned to this DFB Pokal fixture; the runner now supports per-case match IDs. No new key or provider required.
- Final Node 22 isolated check passed lint, route generation, TypeScript, 247 tests/48 files and webpack production build. Evaluation runner syntax and git diff --check passed. Running website remains on port 3000 with polling enabled.

### Venue fallback (2026-10-27)
Missing match venues now trigger exact-fixture Google grounding when available, then a validated club-profile home-ground fallback. The usual home ground is explicitly qualified and never written into the confirmed match venue. Short venue follow-ups retain their topic. Google quota/auth failures back off; automatic research falls back to existing public lookups. Google grounding returned HTTP 429 on the configured project during verification; no billing settings were changed.

### Shared competition context (2026-10-27)
Live local chat probes from an unrelated A-Liga match resolved LaLiga standings/points gap, Spanish Supercopa semi-final fixtures/final date, and upcoming FA Cup fixtures from attached competition evidence. Source bracket fixtures supplement missing flat-list matches. League tables do not become knockout ties; explicit source participant counts can validate other cups' active fields. Exact-name search rejects ambiguous or team-only matches. Lint, typecheck, 259 tests and isolated Webpack production build pass. Competition-specific rules/calendar coverage is still source-dependent; no exhaustive live check of every provider competition was performed.

### Focused analysis milestone (2026-10-28)
Lint, typecheck, 267 tests and an isolated Webpack production build passed. Added regression checks for verified ratings, source timestamps/fractions, named-player context beyond 48 entries, mismatched-match rejection, injury wording, short follow-ups, subject retention and exact-rating-weight requests. Live requests exercised Barcelona–Madrid outcome analysis, player performance/rating questions, rating-formula follow-ups, substitution follow-ups and sparse A-Liga coverage. Sparse coverage correctly declined to infer pressing from a 5–0 score. A rating-weight response initially speculated about the share explained by goals; a bounded rating-method answer now prevents invented weights. A midfield follow-up initially switched to the opponent; explicit subject resolution was added and the live recheck stayed on Barcelona. Live model prose still needs continued factual review: tests and HTTP success do not certify every tactical interpretation, paraphrase or numerical presentation. No pass networks, shot-coordinate retrieval or before/after substitution event splits were introduced.

### Internal coverage-note leakage (2026-10-28)
Removed the obsolete blanket statement that external news/injury reporting is not loaded from the default match package. Added an output-boundary filter for known internal coverage boilerplate in both answer paragraphs and limitations, preserving specific uncertainty and football explanations. Regression checks cover mixed text, boilerplate-only paragraphs and preservation of a relevant substitution caveat. The change affects new replies; already displayed messages are not rewritten.

### Manager-comment retrieval (2026-10-28)
Verified the screenshot question against the local endpoint: research returned a dated speaker-specific report rather than the previous generic unavailable-comments answer. Added parser/intent tests for speaker selection, pronoun follow-ups, stale and unsafe results, and headline-versus-transcript boundaries. Native Google grounding remains quota-dependent; targeted news-headline lookup is a fallback, not proof that a complete press conference has been retrieved. Publication dates must not become inferred match dates. Lint, typecheck, all tests and isolated Webpack production build passed.

### News retrieval boundary and remaining blocker (2026-10-28)
Rechecked native Google-grounded generation using the configured private credentials: HTTP 429 RESOURCE_EXHAUSTED, quota exceeded. The public fallback retrieves dated headline metadata; tested Google News article URLs returned the Google News shell, not readable publisher article text. Consequently it is not a replacement for full article research. Research replies now strip leaked lookup IDs, prioritise newer statements and explicitly distinguish first-defeat remarks from statements after both defeats. Restoring working search quota or connecting a search/article provider remains necessary for reliable detailed current-news answers; no billing changes or new provider credentials were made.

### Search/article provider prepared (2026-10-28)
Google pricing documentation identifies Gemini 3.5 Flash-Lite Search grounding as unavailable on its free API tier. The configured grounded request returned 429; 2.5 Flash returned unavailable-to-new-users 404 and 3.1 Flash-Lite grounding returned 429. Added Tavily search with raw page text, shared grounded synthesis, dated-news validation, safe result links, bounded response/input sizes, private header credentials, basic-search settings and a two-minute cache. Auto mode prioritises Tavily when configured; explicit tavily mode requires it. Tests verify article-versus-summary handling, dates, private credentials, reuse, quota failures and routing. Lint, typecheck, all tests and isolated Webpack build pass. Live Tavily search is NOT verified: no Tavily API key has yet been supplied. Billing and account upgrades were not changed. `.env.local` has an empty server-only TAVILY_API_KEY entry ready for the user.

### Tavily activated and live-verified (2026-10-28)
Moved the user-saved Tavily key from the shared template into ignored `.env.local`; restored the template's empty placeholder. No credential values were logged. Direct live search returned HTTP 200, five results and extracted page text for all five. The actual chat endpoint answered the user's exact Flick/back-to-back-loss question with a substantive account and direct publisher source links, rather than Google News headline links or lookup-ID markers. Google billing remains unchanged. This supersedes the earlier activation-pending status; broader news accuracy remains subject to source availability and review.
