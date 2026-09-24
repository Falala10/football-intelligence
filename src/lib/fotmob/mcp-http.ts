// A minimal client for calling one tool on an MCP server over HTTP (streamable HTTP transport).
//
// It only sends POST requests and reads each reply, then deletes its session. It deliberately never opens
// the optional background "server messages" stream that the full client library opens on every connection:
// that stream is not needed to ask a question, and opening and closing it for every call leaked connections
// and made calls fail intermittently.

const PROTOCOL_VERSION = "2025-03-26";
const CLIENT_INFO = { name: "football-intelligence-web", version: "0.1.0" };
const ACCEPT = "application/json, text/event-stream";
const DEFAULT_TIMEOUT_MS = 15_000;
const CLEANUP_TIMEOUT_MS = 2_000;

export class McpError extends Error {}

type FetchLike = typeof fetch;
type RpcMessage = { id?: unknown; result?: unknown; error?: { message?: unknown } };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Find the reply to request `id` in a JSON body or an event-stream body. */
export function readRpcMessage(contentType: string, body: string, id: number): RpcMessage {
  if (contentType.includes("text/event-stream")) {
    for (const block of body.split(/\r?\n\r?\n/)) {
      const data = block
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (!data) continue;
      let message: unknown;
      try {
        message = JSON.parse(data);
      } catch {
        continue;
      }
      if (isRecord(message) && message.id === id) return message as RpcMessage;
    }
    throw new McpError("The MCP reply did not contain an answer to the request.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new McpError("The MCP reply was not valid JSON.");
  }
  if (!isRecord(parsed) || parsed.id !== id) throw new McpError("The MCP reply did not contain an answer to the request.");
  return parsed as RpcMessage;
}

function toolResult(name: string, result: unknown): unknown {
  if (!isRecord(result)) throw new McpError(`The tool "${name}" returned no result.`);
  if (result.isError === true) throw new McpError(`The tool "${name}" reported an error.`);
  if (result.structuredContent !== undefined && result.structuredContent !== null) return result.structuredContent;

  const first = Array.isArray(result.content) ? result.content[0] : undefined;
  if (isRecord(first) && first.type === "text" && typeof first.text === "string") {
    try {
      return JSON.parse(first.text);
    } catch {
      throw new McpError(`The tool "${name}" returned text that is not JSON.`);
    }
  }
  throw new McpError(`The tool "${name}" returned no usable content.`);
}

/**
 * Call one MCP tool and return its result. Throws McpError on any failure (network, HTTP status, protocol
 * error, or an error reported by the tool). Every call is independent: it starts and ends its own session.
 */
export async function callMcpTool(
  url: string,
  name: string,
  args: Record<string, unknown>,
  options: { fetchImpl?: FetchLike; timeoutMs?: number } = {},
): Promise<unknown> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const signal = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let headers: Record<string, string> = { "content-type": "application/json", accept: ACCEPT };
  let sessionId: string | undefined;

  const post = (body: object) =>
    fetchImpl(url, { method: "POST", headers, body: JSON.stringify(body), signal, cache: "no-store" });

  try {
    const initResponse = await post({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: CLIENT_INFO },
    });
    if (!initResponse.ok) throw new McpError(`The MCP refused to start a session (HTTP ${initResponse.status}).`);
    sessionId = initResponse.headers.get("mcp-session-id") ?? undefined;
    const init = readRpcMessage(initResponse.headers.get("content-type") ?? "", await initResponse.text(), 1);
    if (init.error) throw new McpError(`The MCP could not start a session: ${String(init.error.message ?? "unknown error")}.`);

    const negotiated =
      isRecord(init.result) && typeof init.result.protocolVersion === "string" ? init.result.protocolVersion : PROTOCOL_VERSION;
    headers = { ...headers, "mcp-protocol-version": negotiated, ...(sessionId ? { "mcp-session-id": sessionId } : {}) };

    const ack = await post({ jsonrpc: "2.0", method: "notifications/initialized" });
    await ack.text().catch(() => "");
    if (!ack.ok) throw new McpError(`The MCP did not accept the session (HTTP ${ack.status}).`);

    const response = await post({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name, arguments: args } });
    if (!response.ok) throw new McpError(`The MCP request for "${name}" failed (HTTP ${response.status}).`);
    const message = readRpcMessage(response.headers.get("content-type") ?? "", await response.text(), 2);
    if (message.error) throw new McpError(`The tool "${name}" failed: ${String(message.error.message ?? "unknown error")}.`);
    return toolResult(name, message.result);
  } catch (error) {
    if (error instanceof McpError) throw error;
    throw new McpError(`Could not get "${name}" from the FotMob MCP at ${url}.`, { cause: error });
  } finally {
    if (sessionId) {
      // Best-effort cleanup so sessions do not pile up on the server; a failure here never matters.
      await fetchImpl(url, { method: "DELETE", headers, signal: AbortSignal.timeout(CLEANUP_TIMEOUT_MS) })
        .then((response) => response.text())
        .catch(() => undefined);
    }
  }
}
