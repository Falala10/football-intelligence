import { describe, expect, it } from "vitest";

import { callMcpTool, McpError, readRpcMessage } from "./mcp-http";

const URL_ = "http://127.0.0.1:8000/mcp";

type Call = { method: string; headers: Record<string, string>; body?: { method?: string; id?: number; params?: unknown } };

function sse(message: object): Response {
  return new Response(`event: message\ndata: ${JSON.stringify(message)}\n\n`, {
    status: 200,
    headers: { "content-type": "text/event-stream", "mcp-session-id": "sess-1" },
  });
}

function json(message: object, status = 200): Response {
  return new Response(JSON.stringify(message), { status, headers: { "content-type": "application/json", "mcp-session-id": "sess-1" } });
}

/** A scripted fake server. `overrides` replaces the reply to a given JSON-RPC method (or DELETE). */
function fakeServer(overrides: Record<string, () => Response | Promise<Response>> = {}) {
  const calls: Call[] = [];
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    const body = typeof init.body === "string" ? JSON.parse(init.body) : undefined;
    calls.push({ method: init.method ?? "GET", headers: init.headers as Record<string, string>, body });
    const key = init.method === "DELETE" ? "DELETE" : (body?.method as string);
    if (overrides[key]) return overrides[key]();
    if (key === "initialize") return sse({ jsonrpc: "2.0", id: 1, result: { protocolVersion: "2025-03-26" } });
    if (key === "notifications/initialized") return new Response(null, { status: 202 });
    if (key === "tools/call") return sse({ jsonrpc: "2.0", id: 2, result: { structuredContent: { ok: true } } });
    if (key === "DELETE") return new Response(null, { status: 200 });
    throw new Error(`unexpected request ${key}`);
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

describe("readRpcMessage", () => {
  it("reads the matching message from an event stream", () => {
    const body = 'event: message\ndata: {"jsonrpc":"2.0","id":7,"result":{"a":1}}\n\n';
    expect(readRpcMessage("text/event-stream", body, 7).result).toEqual({ a: 1 });
  });

  it("skips unrelated and malformed events", () => {
    const body = 'data: {"id":1,"result":"other"}\n\ndata: not json\n\ndata: {"id":2,"result":"mine"}\n\n';
    expect(readRpcMessage("text/event-stream; charset=utf-8", body, 2).result).toBe("mine");
  });

  it("reads a plain JSON body", () => {
    expect(readRpcMessage("application/json", '{"id":3,"result":5}', 3).result).toBe(5);
  });

  it("throws when there is no reply to the request", () => {
    expect(() => readRpcMessage("text/event-stream", 'data: {"id":1}\n\n', 2)).toThrow(McpError);
    expect(() => readRpcMessage("application/json", '{"id":9}', 2)).toThrow(McpError);
    expect(() => readRpcMessage("application/json", "<html>", 2)).toThrow(McpError);
  });
});

describe("callMcpTool", () => {
  it("runs the full sequence and returns the structured result", async () => {
    const { calls, fetchImpl } = fakeServer();
    await expect(callMcpTool(URL_, "get_matches_by_date", { date: "today" }, { fetchImpl })).resolves.toEqual({ ok: true });

    expect(calls.map((c) => c.body?.method ?? c.method)).toEqual(["initialize", "notifications/initialized", "tools/call", "DELETE"]);
    expect(calls[2].body?.params).toEqual({ name: "get_matches_by_date", arguments: { date: "today" } });
  });

  it("sends the session id and negotiated protocol version after initialising", async () => {
    const { calls, fetchImpl } = fakeServer();
    await callMcpTool(URL_, "t", {}, { fetchImpl });
    expect(calls[0].headers["mcp-session-id"]).toBeUndefined();
    for (const call of calls.slice(1)) {
      expect(call.headers["mcp-session-id"]).toBe("sess-1");
      expect(call.headers["mcp-protocol-version"]).toBe("2025-03-26");
    }
  });

  it("accepts plain JSON replies as well as event streams", async () => {
    const { fetchImpl } = fakeServer({
      initialize: () => json({ jsonrpc: "2.0", id: 1, result: { protocolVersion: "2025-03-26" } }),
      "tools/call": () => json({ jsonrpc: "2.0", id: 2, result: { structuredContent: { n: 1 } } }),
    });
    await expect(callMcpTool(URL_, "t", {}, { fetchImpl })).resolves.toEqual({ n: 1 });
  });

  it("falls back to JSON text content when there is no structured content", async () => {
    const { fetchImpl } = fakeServer({
      "tools/call": () => sse({ jsonrpc: "2.0", id: 2, result: { content: [{ type: "text", text: '{"from":"text"}' }] } }),
    });
    await expect(callMcpTool(URL_, "t", {}, { fetchImpl })).resolves.toEqual({ from: "text" });
  });

  it("fails when the tool reports an error", async () => {
    const { fetchImpl } = fakeServer({ "tools/call": () => sse({ jsonrpc: "2.0", id: 2, result: { isError: true, content: [] } }) });
    await expect(callMcpTool(URL_, "t", {}, { fetchImpl })).rejects.toThrow(/reported an error/);
  });

  it("fails on a protocol error and surfaces its message", async () => {
    const { fetchImpl } = fakeServer({ "tools/call": () => sse({ jsonrpc: "2.0", id: 2, error: { code: -32602, message: "bad arguments" } }) });
    await expect(callMcpTool(URL_, "t", {}, { fetchImpl })).rejects.toThrow(/bad arguments/);
  });

  it("fails when the tool returns text that is not JSON, or nothing usable", async () => {
    const notJson = fakeServer({ "tools/call": () => sse({ jsonrpc: "2.0", id: 2, result: { content: [{ type: "text", text: "hello" }] } }) });
    await expect(callMcpTool(URL_, "t", {}, { fetchImpl: notJson.fetchImpl })).rejects.toThrow(/not JSON/);
    const empty = fakeServer({ "tools/call": () => sse({ jsonrpc: "2.0", id: 2, result: { content: [] } }) });
    await expect(callMcpTool(URL_, "t", {}, { fetchImpl: empty.fetchImpl })).rejects.toThrow(/no usable content/);
  });

  it("fails on HTTP errors at each step", async () => {
    const init = fakeServer({ initialize: () => new Response("no", { status: 500 }) });
    await expect(callMcpTool(URL_, "t", {}, { fetchImpl: init.fetchImpl })).rejects.toThrow(/HTTP 500/);
    const ack = fakeServer({ "notifications/initialized": () => new Response(null, { status: 400 }) });
    await expect(callMcpTool(URL_, "t", {}, { fetchImpl: ack.fetchImpl })).rejects.toThrow(/HTTP 400/);
    const call = fakeServer({ "tools/call": () => new Response("no", { status: 404 }) });
    await expect(callMcpTool(URL_, "t", {}, { fetchImpl: call.fetchImpl })).rejects.toThrow(/HTTP 404/);
  });

  it("wraps network failures in McpError and keeps the cause", async () => {
    const fetchImpl = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    const error = await callMcpTool(URL_, "t", {}, { fetchImpl }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(McpError);
    expect((error as McpError).cause).toBeInstanceOf(TypeError);
  });

  it("still ends the session when the tool call fails, and ignores cleanup failures", async () => {
    const { calls, fetchImpl } = fakeServer({
      "tools/call": () => sse({ jsonrpc: "2.0", id: 2, error: { message: "boom" } }),
      DELETE: () => {
        throw new Error("network down");
      },
    });
    await expect(callMcpTool(URL_, "t", {}, { fetchImpl })).rejects.toThrow(/boom/);
    expect(calls.at(-1)?.method).toBe("DELETE");
  });

  it("does not try to end a session that never started", async () => {
    const { calls, fetchImpl } = fakeServer({ initialize: () => new Response("no", { status: 503 }) });
    await callMcpTool(URL_, "t", {}, { fetchImpl }).catch(() => undefined);
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
  });
});
