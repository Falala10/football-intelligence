"use client";
import { useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import type { ResearchDisplay } from "@/lib/ai/research";
/** Keep Google's supplied suggestions visible, with isolated styling and no executable HTML. */
export function ResearchAttribution({ research }: { research: ResearchDisplay }) {
  const host = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!host.current) return;
    const root = host.current.shadowRoot ?? host.current.attachShadow({ mode: "open" });
    root.innerHTML = DOMPurify.sanitize(research.suggestionsHtml, { FORCE_BODY: true, ADD_TAGS: ["style"], FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "link", "meta", "base"] });
    root.querySelectorAll("a").forEach(a => { a.target = "_blank"; a.rel = "noopener noreferrer"; });
  }, [research.suggestionsHtml]);
  if (!research.sources.length && !research.suggestionsHtml) return null;
  const links = <div className="ai-research-links" aria-label="Web sources">{research.sources.map((source, i) => <a key={`${i}-${source.url}`} href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>)}</div>;
  if (!research.suggestionsHtml) return <details className="ai-research"><summary>Sources</summary>{links}<small>Sources checked · {new Date(research.checkedAtUtc).toLocaleDateString()}</small></details>;
  return <div className="ai-research">
    {links}
    <div ref={host} className="ai-search-suggestions" aria-label={research.suggestionsHtml ? "Google Search suggestions" : "Research attribution"} />
    <small>Sources checked · {new Date(research.checkedAtUtc).toLocaleDateString()}</small>
  </div>;
}
