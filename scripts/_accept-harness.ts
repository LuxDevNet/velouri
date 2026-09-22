// _accept-harness.ts — runs under Deno (no deploy needed). Exercises the
// agna edge function's router and store write guard directly, in
// memory-fallback mode (no SUPABASE_SERVICE_ROLE_KEY, no AGNA_ADMIN_KEY —
// the admin-key gate is a no-op when unset, so these mutating calls are
// expected to succeed here). Invoked by scripts/accept.mjs via `deno run`.
// Prints one JSON line on success; throws (non-zero exit) on any failed
// assertion.

import { route, type Env } from "../supabase/functions/agna/src/router.ts";
import {
  assertAllowedTable,
  DisallowedTableError,
  __memoryForTests,
} from "../supabase/functions/agna/src/store.ts";

const env: Env = {};

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(`ASSERTION FAILED: ${message}`);
}

async function call(method: string, path: string, body?: unknown): Promise<{ status: number; json: any }> {
  const req = new Request(`http://local.test${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const res = await route(req, env);
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function main() {
  const results: Record<string, unknown> = {};

  // GET / and GET /v1 -> { service: "agna" }
  const root = await call("GET", "/");
  assert(root.status === 200 && root.json?.service === "agna", "GET / must return service=agna");
  const v1 = await call("GET", "/v1");
  assert(v1.status === 200 && v1.json?.service === "agna", "GET /v1 must return service=agna");
  results.health = v1.json;

  // Write guard: allowlist is only the three request tables.
  assertAllowedTable("agna_items");
  assertAllowedTable("agna_crons");
  assertAllowedTable("agna_cron_runs");
  let rejectedAgents = false;
  try {
    assertAllowedTable("agents");
  } catch (err) {
    rejectedAgents = err instanceof DisallowedTableError;
  }
  assert(rejectedAgents, "store.ts must reject table 'agents'");
  let rejectedAccounts = false;
  try {
    assertAllowedTable("public.accounts");
  } catch (err) {
    rejectedAccounts = err instanceof DisallowedTableError;
  }
  assert(rejectedAccounts, "store.ts must reject table 'public.accounts'");
  let rejectedSpine = false;
  try {
    assertAllowedTable("agna_spine");
  } catch (err) {
    rejectedSpine = err instanceof DisallowedTableError;
  }
  assert(rejectedSpine, "store.ts must reject 'agna_spine' on the request path");
  results.writeGuard = "ok";

  // /v1/filters and /v1/sources
  const filters = await call("GET", "/v1/filters");
  assert(
    filters.status === 200 && Array.isArray(filters.json?.filters) && filters.json.filters.length === 5,
    "GET /v1/filters must return 5 default filters",
  );
  const sources = await call("GET", "/v1/sources");
  assert(
    sources.status === 200 && Array.isArray(sources.json?.sources) && sources.json.sources.length === 4,
    "GET /v1/sources must return 4 source ids",
  );
  results.filters = filters.json;
  results.sources = sources.json;

  // /v1/search — shape only; network to Openverse/Wikimedia may be
  // unavailable in a sandboxed environment, so tolerate empty results.
  const search = await call("GET", "/v1/search?q=forest");
  assert(search.status === 200 && Array.isArray(search.json?.items), "GET /v1/search must return items[]");
  results.search = { status: search.status, itemCount: search.json.items.length };

  // /v1/gallery/:filter — one lane, must 200 even when empty.
  const lane = await call("GET", "/v1/gallery/nature");
  assert(lane.status === 200 && Array.isArray(lane.json?.items), "GET /v1/gallery/nature must 200 with items[]");
  results.galleryLane = { status: lane.status, itemCount: lane.json.items.length };

  // /v1/gallery
  const gallery = await call("GET", "/v1/gallery?filter=landscape");
  assert(gallery.status === 200 && Array.isArray(gallery.json?.items), "GET /v1/gallery must return items[]");
  results.gallery = { status: gallery.status, itemCount: gallery.json.items.length };

  // /v1/cron — seeded crons present
  const cronList = await call("GET", "/v1/cron");
  assert(Array.isArray(cronList.json?.crons) && cronList.json.crons.length >= 2, "GET /v1/cron must list seeded crons");
  results.cronList = cronList.json.crons.map((c: any) => c.id);

  // upsert + run a cron, then confirm a cron_runs row was written. No
  // AGNA_ADMIN_KEY is set in this harness env, so the admin gate is a
  // no-op and these calls succeed without the header.
  const upsert = await call("POST", "/v1/cron", {
    id: "accept-test",
    schedule: "0 0 * * *",
    query: "studio product",
    filter_key: "studio",
  });
  assert(upsert.status === 200 && upsert.json?.cron?.id === "accept-test", "POST /v1/cron must upsert");

  const runsBefore = __memoryForTests.agna_cron_runs.length;
  const run = await call("POST", "/v1/cron/accept-test/run");
  assert(run.status === 200 && run.json?.ok === true, "POST /v1/cron/:id/run must succeed for a known cron");
  const runsAfter = __memoryForTests.agna_cron_runs.length;
  assert(runsAfter === runsBefore + 1, "cron run must write a row to agna_cron_runs");
  results.cronRun = { ok: run.json.ok, cronRunsWritten: runsAfter - runsBefore };

  const missingRun = await call("POST", "/v1/cron/does-not-exist/run");
  assert(missingRun.status === 404, "running an unknown cron must 404");

  // MCP surface
  const mcpInit = await call("POST", "/mcp", { jsonrpc: "2.0", id: 1, method: "initialize" });
  assert(mcpInit.json?.result?.serverInfo?.name === "agna", "MCP initialize must report serverInfo.name=agna");

  const mcpTools = await call("POST", "/mcp", { jsonrpc: "2.0", id: 2, method: "tools/list" });
  const toolNames = (mcpTools.json?.result?.tools ?? []).map((t: any) => t.name);
  const expectedTools = [
    "search",
    "gallery",
    "list_filters",
    "list_sources",
    "list_crons",
    "upsert_cron",
    "run_cron",
  ];
  for (const tool of expectedTools) {
    assert(toolNames.includes(tool), `MCP tools/list must include ${tool}`);
  }
  results.mcpTools = toolNames;

  const mcpPing = await call("GET", "/mcp?method=ping");
  assert(mcpPing.status === 200, "GET /mcp?method=ping must 200");

  console.log(JSON.stringify({ ok: true, results }));
}

main().catch((err) => {
  console.error(String(err?.stack ?? err));
  Deno.exit(1);
});
