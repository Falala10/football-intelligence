"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ChatRequestError, sendChatTask } from "@/lib/ai/chat-client";
import { recentConversation } from "@/lib/ai/conversation";
import Markdown from "react-markdown";
import { ResearchAttribution } from "./ResearchAttribution";
import type { ResearchDisplay } from "@/lib/ai/research";
import type { ChatMessage } from "@/lib/ai/conversation";
const suggestions = ["Why did the match finish this way?", "Who won the last Ballon d’Or?", "What’s the latest transfer news?"];
export function MatchAiPanel({ matchId, title, configured }: { matchId: string; title: string; configured: boolean }) {
  const uid = useId();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<(ChatMessage & { research?: ResearchDisplay })[]>([]);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const lock = useRef(false);
  const log = useRef<HTMLDivElement | null>(null);
  const input = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => () => { abort.current?.abort(); }, []);
  useEffect(() => {
    if (log.current) {
      const last = log.current.lastElementChild as HTMLElement | null;
      log.current.scrollTop = busy ? log.current.scrollHeight : Math.max(0, (last?.offsetTop ?? 0) - 12);
    }
    if (!busy && (messages.length || error)) input.current?.focus({ preventScroll: true });
  }, [messages, busy, error]);
  async function ask(event: FormEvent) {
    event.preventDefault();
    if (lock.current || !question.trim() || !configured) return;
    const submitted = question.trim();
    lock.current = true; setBusy(true); setError(""); setPending(submitted); setQuestion("");
    const controller = new AbortController(); abort.current = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, 90000);
    try {
      const data = await sendChatTask(JSON.stringify({ matchId, question: submitted, conversation: { matchId, messages: recentConversation(messages.map(({ role, text }) => ({ role, text }))) } }), controller.signal, crypto.randomUUID());
      const text = [...data.answer.claims.map((claim: { text: string }) => claim.text), ...data.answer.limitations].join("\n\n");
      setMessages(previous => [...previous, { role: "user", text: submitted }, { role: "assistant", text, research: data.research }]);
    } catch (failure) {
      setQuestion(submitted);
      setError(timedOut ? "That took too long. Your question is saved—try sending again." : controller.signal.aborted ? "Stopped. You can edit your question or send it again." : failure instanceof ChatRequestError ? failure.message : "The chat couldn’t finish this request. Your question is saved—try again.");
    }
    finally { window.clearTimeout(timeout); abort.current = null; lock.current = false; setBusy(false); setPending(""); input.current?.focus(); }
  }
  function reset() { setMessages([]); setQuestion(""); setError(""); input.current?.focus(); }
  return <section id="match-ai" className="lab-card detail-panel match-ai" aria-labelledby={`${uid}-title`}>
    <div className="ai-heading"><div><p className="lab-eyebrow">FOOTBALL INTELLIGENCE</p><h2 id={`${uid}-title`}>Talk football</h2></div><button className="ai-reset" type="button" disabled={busy || !messages.length} onClick={reset}>New chat</button></div>
    <p className="ai-intro">Ask about any football topic, or dig into {title}.</p>
    {!configured ? <p className="ai-notice" role="status">AI isn’t connected yet. Match stats and heatmaps are still available.</p> : null}
    <div ref={log} className="ai-chat-log" role="log" aria-label="Match conversation" aria-live="polite" aria-busy={busy} tabIndex={0}>
      {!messages.length && !busy ? <div className="ai-chat-empty"><p>Ask about anything football—this match, players, awards, transfers, tactics or the latest news.</p><div className="ai-suggestions" aria-label="Suggested questions">{suggestions.map(text => <button key={text} type="button" onClick={() => { setQuestion(text); input.current?.focus(); }}>{text}<span aria-hidden="true"> ↗</span></button>)}</div></div> : null}
      {messages.map((message, index) => <article className={`ai-message ai-message-${message.role}`} key={index} aria-label={message.role === "user" ? "Your message" : "Analyst reply"}><span className="ai-message-role">{message.role === "user" ? "You" : "Football Intelligence"}</span><div>{message.research ? <Markdown skipHtml components={{ img: () => null, a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> }}>{message.text}</Markdown> : message.text.split("\n\n").map((paragraph, i) => <p key={i}>{paragraph}</p>)}</div>{message.research ? <ResearchAttribution research={message.research} /> : null}</article>)}
      {busy ? <><article className="ai-message ai-message-user" aria-label="Your message"><span className="ai-message-role">You</span><p>{pending}</p></article><p className="ai-thinking" role="status">Thinking…</p></> : null}
    </div>
    {error ? <p role="alert" className="ai-notice">{error}</p> : null}
    <form onSubmit={ask} className="ai-chat-composer">
      <label className="sr-only" htmlFor={`${uid}-question`}>Your question</label>
      <textarea ref={input} id={`${uid}-question`} value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} maxLength={1200} rows={2} placeholder={messages.length ? "Ask a follow-up or a new question…" : "Ask anything football…"} aria-describedby={`${uid}-scope`} disabled={busy}/>
      <div className="ai-actions"><span>Enter to send · Shift + Enter for a new line</span>{busy ? <button type="button" onClick={() => abort.current?.abort()}>Stop</button> : <button type="submit" disabled={!configured || !question.trim()}>Send ↑</button>}</div>
    </form>
    <p className="ai-footnote" id={`${uid}-scope`}>Anything football · Knowledge, match data & web research · Conversation isn’t saved to an account. Your question and recent messages go to Gemini; web research may send relevant context to Tavily or Google and uses public sources. AI can make mistakes.</p>
  </section>;
}
