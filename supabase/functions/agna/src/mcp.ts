// mcp.ts — minimal MCP (Model Context Protocol) surface over the same
// handlers the REST router calls. No direct table writes here beyond what
// the underlying handlers already do (agna_crons, agna_cron_runs via
// store.ts).
//
// Security note: `upsert_cron` and `run_cron` are mutating tools, gated by
// the same admin-key check as their REST equivalents. The router passes in
// whether the caller presented a valid X-Agna-Admin-Key; callTool refuses
// those two tool names when it did not (and AGNA_ADMIN_KEY is set).

import type { Env } from "./router.ts";
import {
  doSearch,
  doGallery,
  doFilters,
  doSources,
  doListCrons,
  doUpsertCron,
  doRunCron,
} from "./router.ts";

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string };
}

const ADMIN_ONLY_TOOLS = new Set(["upsert_cron", "run_cron"]);

const TOOLS = [
  {
    name: "search",
    description: "Federated search across unsplash, pexels, openverse, wikimedia.",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string" },
        sources: { type: "string", description: "csv of source ids" },
        limit: { type: "number" },
      },
      required: ["q"],
    },
  },
  {
    name: "gallery",
    description: "Read the cached gallery, optionally filtered.",
    inputSchema: {
      type: "object",
      properties: {
        filter: { type: "string" },
        limit: { type: "number" },
        refresh: { type: "boolean" },
      },
    },
  },
  {
    name: "list_filters",
    description: "List the default filter keys.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_sources",
    description: "List the source ids.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_crons",
    description: "List configured crons.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "upsert_cron",
    description: "Create or update a cron definition. Requires the admin key.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        schedule: { type: "string" },
        query: { type: "string" },
        filter_key: { type: "string" },
        enabled: { type: "boolean" },
      },
      required: ["id", "schedule", "query", "filter_key"],
    },
  },
  {
    name: "run_cron",
    description: "Run a cron now and record the run. Requires the admin key.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
] as const;

async function callTool(
  env: Env,
  name: string,
  args: Record<string, unknown>,
  authorized: boolean,
): Promise<unknown> {
  if (ADMIN_ONLY_TOOLS.has(name) && !authorized) {
    throw new Error(`Tool "${name}" requires the admin key (X-Agna-Admin-Key).`);
  }
  switch (name) {
    case "search":
      return doSearch(env, {
        q: String(args.q ?? ""),
        sources: args.sources ? String(args.sources) : undefined,
        limit: args.limit ? Number(args.limit) : undefined,
      });
    case "gallery":
      return doGallery(env, {
        filter: args.filter ? String(args.filter) : undefined,
        limit: args.limit ? Number(args.limit) : undefined,
        refresh: Boolean(args.refresh),
      });
    case "list_filters":
      return doFilters();
    case "list_sources":
      return doSources();
    case "list_crons":
      return { crons: await doListCrons(env) };
    case "upsert_cron":
      return doUpsertCron(env, args as never);
    case "run_cron":
      return doRunCron(env, String(args.id ?? ""));
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export async function handleMcp(
  env: Env,
  body: JsonRpcRequest,
  authorized = true,
): Promise<JsonRpcResponse> {
  const id = body.id ?? null;
  try {
    switch (body.method) {
      case "initialize":
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            serverInfo: { name: "agna", version: "1.0.0" },
            capabilities: { tools: {} },
          },
        };
      case "ping":
        return { jsonrpc: "2.0", id, result: {} };
      case "tools/list":
        return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
      case "tools/call": {
        const params = body.params ?? {};
        const name = String(params.name ?? "");
        const args = (params.arguments ?? {}) as Record<string, unknown>;
        const output = await callTool(env, name, args, authorized);
        return {
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: JSON.stringify(output) }] },
        };
      }
      default:
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${body.method}` },
        };
    }
  } catch (err) {
    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32000, message: err instanceof Error ? err.message : String(err) },
    };
  }
}
