import "server-only";

import { callMcpTool, McpError } from "./mcp-http";

// The FotMob MCP runs locally in HTTP mode: `fotmob-mcp --transport streamable-http --port 8000`.
// Override with FOTMOB_MCP_URL if it runs elsewhere. Only server code may import this module.
const MCP_URL = process.env.FOTMOB_MCP_URL ?? "http://127.0.0.1:8000/mcp";

export { McpError as FotMobMcpError };

/** Call one FotMob MCP tool and return its structured result. Throws FotMobMcpError on any failure. */
export function callFotMobTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  return callMcpTool(MCP_URL, name, args);
}
