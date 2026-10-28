import { readFile, writeFile } from 'node:fs/promises';
// Uses the app's local endpoint; no keys are loaded or written by this runner.
const base = new URL(process.env.CHAT_EVAL_URL || 'http://localhost:3000');
if (!['localhost', '127.0.0.1', '[::1]'].includes(base.hostname) || base.username || base.password) throw new Error('Use a local app URL.');
const suite = JSON.parse(await readFile(new URL('../evals/football-chat.json', import.meta.url), 'utf8'));
const selected = process.env.CHAT_EVAL_CASES?.split(',');
const cases = selected ? suite.filter(c => selected.includes(c.id)) : suite;
if (!cases.length) throw new Error('No evaluation cases selected.');
const matchId = process.env.CHAT_EVAL_MATCH || 'fotmob:5868105';
const report = { startedAt: new Date().toISOString(), matchId, results: [], note: 'Transport checks are automatic. Football accuracy, grounding and conversational quality require review against each case rubric. A successful response is not a quality pass.' };
const output = process.env.CHAT_EVAL_OUTPUT || '/tmp/football-chat-evaluation.json';
const save = () => writeFile(output, JSON.stringify(report, null, 2));
let requestCount = 0;
for (const item of cases) {
  const caseMatchId = item.matchId || matchId;
  let history = item.history || [];
  for (const question of [item.question, ...(item.turns || [])]) {
    // Stay well below the local 8/minute guard, even for fast knowledge replies.
    if (requestCount++) await new Promise(r => setTimeout(r, 8500));
    const started = Date.now(); let result;
    try {
      const response = await fetch(new URL('/api/match-ai', base), { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base.origin }, body: JSON.stringify({ matchId: caseMatchId, question, conversation: { matchId: caseMatchId, messages: history.slice(-12) } }), signal: AbortSignal.timeout(95000) });
      const data = await response.json();
      const reply = data.answer ? [...data.answer.claims.map(c => c.text), ...data.answer.limitations].join('\n\n') : '';
      result = { case: item.id, matchId: caseMatchId, question, httpStatus: response.status, elapsedMs: Date.now() - started, reply, error: data.message, sources: data.research?.sources, evidence: data.evidence, review: 'pending', rubric: item.checks };
      if (response.ok && reply) history = [...history, { role: 'user', text: question }, { role: 'assistant', text: reply }];
      else { report.results.push(result); await save(); console.log(`${item.id}: HTTP ${response.status}`); break; }
    } catch (e) { result = { case: item.id, matchId: caseMatchId, question, elapsedMs: Date.now() - started, error: e.name, review: 'blocked', rubric: item.checks }; }
    report.results.push(result); await save(); console.log(`${item.id}: ${result.httpStatus || result.error}, ${result.elapsedMs}ms`);
  }
}
report.finishedAt = new Date().toISOString();
await save();
if (report.results.some(r => r.httpStatus !== 200)) process.exitCode = 1;
