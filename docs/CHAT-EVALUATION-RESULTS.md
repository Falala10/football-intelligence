# Chat evaluation — 27 October 2026

This is a small live sample, not a benchmark accuracy score. Requests used the configured Gemini service and FotMob data through isolated local production previews. The default Turbopack build remains blocked by the verification environment's worker port restriction; production verification used webpack without changing the repository's build script.

## Findings and changes

- Whole-request cancellation and the 80-second server deadline now release the active request slot. Five guard tests plus route integration tests cover failure, cancellation, late completion, concurrency and retry. A real HTTP request cancelled after one second logged cancellation, and the following request answered successfully.
- An initial 14-turn run across ten scenarios returned 11 HTTP-success responses and three errors. Semantic review caught a wrong award runner-up, an unrelated-match topic switch, irrelevant transfer-news retrieval and overly broad causal wording. HTTP success was not treated as quality success.
- Explicit dated Ballon d'Or questions and ranking follow-ups now retrieve the same dated award article instead of relying on memory or a winner biography. Recheck: Dembélé then Lamine Yamal. The winner request took approximately 11 seconds versus 51 seconds in the initial run; individual timings are not a general performance guarantee.
- General-topic follow-ups keep their user-established context and bypass unrelated viewed-match retrieval. Regression tests cover the Manchester United follow-up, chained award references and switching away from an award topic. Assistant factual claims never select the award year.
- Transfer/drama filtering requires topic relevance. A match report about Barcelona is no longer sufficient as transfer evidence. Healthy lookups with no relevant current coverage return a plain conversational limitation; lookup outages remain errors.
- The comparison prompt “the season before” exposed missing retrieval of the comparison target. The season resolver now fetches both the referenced historical year and its preceding year. Live recheck returned the 2023/24 and 2024/25 league records correctly.

## Remaining limits

Gemini returned transient HTTP 503 responses during the initial run. Another current-club research request failed on recheck. No automatic quota-consuming retries or provider switch were added. Research failures and validated-output rejection remain possible; errors preserve the question for explicit retry. Diagnostics distinguish provider HTTP errors, malformed/incomplete output and boundary rejection without logging credentials or chat text.

Tactical answers in the recheck still sometimes narrated their inputs, repeated uncertainty or overstated the certainty of a causal link. These remain partial quality results. Current news coverage is constrained by the available publisher feeds and encyclopedia articles; absence of a result does not mean no news exists. Repeatable evaluation and routing fixes improve observability and reduce identified failures, but do not establish that all football questions are accurate or fluid.

The saved baseline/recheck reports are in this chat's output folder. The evaluation runner now writes completed results progressively and includes used match evidence where available. The current suite has seventeen scenarios, including an independent seeded club follow-up so a preceding provider failure cannot prevent that context test.

Final focused smoke: four requests returned HTTP 200. The historical comparison used both requested years; the transfer question returned a natural coverage limitation; the seeded Manchester United follow-up stayed on United and retrieved relevant club/match sources. That follow-up remains a partial semantic result because its assertions about probing and transition vulnerabilities exceed the cited statistics. Scope retention is verified; fully grounded tactical causality is not.

### 2026-10-28 focused analysis review
Live local probes covered match causality, midfield follow-ups, substitution impact, player ratings and sparse coverage. Inputs/rubrics are in `evals/football-chat.json` (`match-explanation-depth`, `rating-explanation`, `sparse-match-explanation`). Review found and addressed rating-weight speculation and opponent-topic drift. The final subject-retention probe answered about Barcelona's midfield. Exact rating point attribution now returns a verified-method limitation without claiming a proprietary breakdown. Continue reviewing tactical paraphrases: these samples demonstrate working retrieval and improved focus, not exhaustive accuracy certification. Detailed player rating and rounded lineup display may differ; both remain identifiable in evidence.
