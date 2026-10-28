# Chat reliability and quality checks

The local chat has two separate checks. Unit/route tests exercise timeout, cancellation, concurrent-request exclusion, rate limiting and recovery. Live evaluation exercises actual AI answers; HTTP success does not establish football accuracy.

## Reliability

The server bounds the whole answer pipeline to 80 seconds, including data loading and research. Client Stop aborts its request; cancellation or timeout releases the process-local request slot. Late provider completion cannot release a newer request's slot. Each data-loading stage checks cancellation before starting the next stage or asking the model. A provider that ignores cancellation may finish its existing read in the background; its result is discarded.

The client retains the question after an error, stop or its 90-second fallback timeout. Non-JSON errors are recoverable. Busy and provider quota errors have distinct messages. The server records only a random request ID, error code and elapsed time in diagnostics; it does not log question text or credentials. The browser submits an in-memory task, then uses short status requests instead of holding one network connection open for the entire answer. Transport retries reuse the same task ID; they never intentionally generate a second answer. Stop sends cancellation to the task. A lost task after a server restart is reported explicitly, rather than silently starting a second model call. Completed task results and request bodies expire after three minutes, with at most 32 retained tasks; this is ephemeral local recovery, not durable chat history or a production job queue. The synchronous endpoint remains for evaluation tools. There are no automatic model-generation retries.

The guard remains local to one server process, with eight accepted attempts per minute. This is appropriate for the local prototype, not authentication or a production/distributed rate limiter.

## Live answer evaluation

Start the app and FotMob server, then use Node 22:

```sh
npm run eval:chat
```

The default endpoint is localhost:3000; a different local port can be selected with `CHAT_EVAL_URL`. Results go to `/tmp/football-chat-evaluation.json`. Optional `CHAT_EVAL_CASES` is a comma-separated list of scenario IDs from `evals/football-chat.json`; `CHAT_EVAL_MATCH` selects the viewed match ID. The runner sends public football test questions to the configured AI service through the local app and spaces requests to respect the prototype limit. It never loads the API key itself.

The seventeen scenarios include multi-turn references, topic changes, historical season selection, tactical uncertainty, news freshness, injury causation and opinion handling. The default match-specific examples refer to fotmob:5868105; update the questions/rubrics if using a different match. Current form/news answers must be reviewed against sources dated at the time of the run, not frozen expected numbers.

Review each answer against its saved rubric and mark pass/partial/fail with a short reason. Check factual accuracy, specific supporting observations, proportionate inference, useful uncertainty and natural continuation. Do not score an answer as correct solely because it contains a keyword, source link or a successful HTTP status. The runner intentionally leaves semantic review pending.

Reports should remain outside the repository unless reviewed and intentionally added. They contain test questions and model responses but never credentials. Re-run after changes to prompts, routing, models or retrieval sources. Offline tests run in `npm run check`; live AI evaluation is an explicit separate action because it uses network access and API quota.

Individual scenarios may pin a different `matchId` to verify cross-competition context; these take precedence over the runner's default match. The DFB Pokal identity scenario checks both a short factual question and a general-model paraphrase.
