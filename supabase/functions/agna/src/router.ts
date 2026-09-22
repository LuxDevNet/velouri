// router.ts — HTTP routing for the agna edge function. Exposes handler
// functions individually so both the HTTP entry point (index.ts) and the
// MCP surface (mcp.ts) can call the same logic.
//
// Security note (added in the rename/security pass): mutating routes —
// POST /v1/cron, POST /v1/cron/:id/run, and GET /v1/gallery?refresh=1 — and
// the MCP upsert_cron/run_cron tools require header `X-Agna-Admin-Key` to
// equal env.AGNA_ADMIN_KEY. When AGNA_ADMIN_KEY is unset (local dev,
// accept.mjs), the gate is a no-op — set it before any public deploy. This
// is a stopgap shared secret, not session auth; see docs/DATA.md and
// TODO.md's security note for the follow-up (Supabase verify_jwt / a real
// staged auth cutover, modeled on nitemcp/docs/ROLLOUT.md).
//
// CORS is restricted to the origins listed in env.PUBLIC_HOST (comma
// separated), defaulting to the two public workers this project ships:
// https://agna.agnamo.com and https://velouri.agnamo.com.

import { reshape, DEFAULT_FILTERS, isDefaultFilter } from "./reshape.ts";
import { searchSources, SOURCE_IDS, type SourceId } from "./sources.ts";
import {
  listItemsByFilter,
  upsertItems,
  countItems,
  listCrons,
  getCron,
  upsertCron as storeUpsertCron,
  markCronRanAt,
  startCronRun,
  finishCronRun,
  type AgnaCron,
  type StoreEnv,
} from "./store.ts";
import { handleMcp } from "./mcp.ts";

export interface Env extends StoreEnv {
  UNSPLASH_ACCESS_KEY?: string;
  PEXELS_API_KEY?: string;
  PUBLIC_HOST?: string;
  AGNA_ADMIN_KEY?: string;
}

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 24;
const DEFAULT_ALLOWED_ORIGINS = ["https://agna.agnamo.com", "https://velouri.agnamo.com"];
const ADMIN_KEY_HEADER = "x-agna-admin-key";

function clampLimit(raw: string | number | undefined | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(n), MAX_LIMIT);
}

function parseSources(raw: string | undefined | null): SourceId[] {
  if (!raw) return [...SOURCE_IDS];
  const requested = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const valid = requested.filter((s): s is SourceId => (SOURCE_IDS as readonly string[]).includes(s));
  return valid.length > 0 ? valid : [...SOURCE_IDS];
}

// ---------------------------------------------------------------------------
// Auth gate — shared-secret header, enforced only when AGNA_ADMIN_KEY is set
// ---------------------------------------------------------------------------

export function isAdminAuthorized(req: Request, env: Env): boolean {
  if (!env.AGNA_ADMIN_KEY) return true; // unset = unenforced (local dev only)
  return req.headers.get(ADMIN_KEY_HEADER) === env.AGNA_ADMIN_KEY;
}

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

function allowedOrigins(env: Env): string[] {
  if (!env.PUBLIC_HOST) return DEFAULT_ALLOWED_ORIGINS;
  const parsed = env.PUBLIC_HOST.split(",").map((s) => s.trim()).filter(Boolean);
  return parsed.length > 0 ? parsed : DEFAULT_ALLOWED_ORIGINS;
}

function corsHeaders(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = allowedOrigins(env);
  const headers: Record<string, string> = { Vary: "Origin" };
  if (origin && allowed.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] = `Content-Type, ${ADMIN_KEY_HEADER}`;
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
  }
  return headers;
}

// ---------------------------------------------------------------------------
// Handler bodies (shared by REST router and MCP tools)
// ---------------------------------------------------------------------------

export async function doSearch(
  env: Env,
  params: { q: string; sources?: string; limit?: number },
): Promise<{ items: unknown[] }> {
  const query = reshape(params.q ?? "");
  const sources = parseSources(params.sources);
  const limit = clampLimit(params.limit);
  const items = await searchSources(sources, env, {
    query,
    filterKey: isDefaultFilter(params.q) ? params.q : params.q,
    limit,
  });
  return { items: items.slice(0, limit) };
}

export async function doGallery(
  env: Env,
  params: { filter?: string; limit?: number; refresh?: boolean },
): Promise<{ items: unknown[] }> {
  const limit = clampLimit(params.limit);
  const filter = params.filter && isDefaultFilter(params.filter) ? params.filter : params.filter;

  if (params.refresh) {
    await seedFilter(env, filter ?? null, limit);
    const items = await listItemsByFilter(env, filter ?? null, limit);
    return { items };
  }

  const existingCount = await countItems(env);
  if (existingCount === 0) {
    await seedAllFilters(env, limit);
  }

  const items = await listItemsByFilter(env, filter ?? null, limit);
  return { items };
}

export async function doGalleryLane(
  env: Env,
  filter: string,
  limit = DEFAULT_LIMIT,
): Promise<{ items: unknown[] }> {
  const existingCount = await countItems(env);
  if (existingCount === 0) {
    await seedAllFilters(env, limit);
  }
  const items = await listItemsByFilter(env, filter, limit);
  return { items };
}

async function seedFilter(env: Env, filterKey: string | null, limit: number): Promise<void> {
  const key = filterKey ?? DEFAULT_FILTERS[0];
  const query = reshape(key);
  const items = await searchSources([...SOURCE_IDS], env, { query, filterKey: key, limit });
  await upsertItems(env, items);
}

async function seedAllFilters(env: Env, limit: number): Promise<void> {
  for (const filterKey of DEFAULT_FILTERS) {
    await seedFilter(env, filterKey, limit);
  }
}

export function doFilters(): { filters: readonly string[] } {
  return { filters: DEFAULT_FILTERS };
}

export function doSources(): { sources: readonly string[] } {
  return { sources: SOURCE_IDS };
}

export async function doListCrons(env: Env): Promise<AgnaCron[]> {
  return listCrons(env);
}

export async function doGetCron(env: Env, id: string): Promise<AgnaCron | null> {
  return getCron(env, id);
}

export async function doUpsertCron(
  env: Env,
  input: Partial<AgnaCron> & { id: string },
): Promise<AgnaCron> {
  const existing = await getCron(env, input.id);
  const merged: AgnaCron = {
    id: input.id,
    schedule: input.schedule ?? existing?.schedule ?? "0 * * * *",
    query: input.query ?? existing?.query ?? "",
    filter_key: input.filter_key ?? existing?.filter_key ?? DEFAULT_FILTERS[0],
    enabled: input.enabled ?? existing?.enabled ?? true,
    last_run_at: existing?.last_run_at ?? null,
    meta: input.meta ?? existing?.meta ?? {},
  };
  return storeUpsertCron(env, merged);
}

export async function doRunCron(
  env: Env,
  id: string,
): Promise<{ ok: boolean; run: unknown; error?: string }> {
  const cron = await getCron(env, id);
  if (!cron) {
    return { ok: false, run: null, error: `cron not found: ${id}` };
  }
  const run = await startCronRun(env, id);
  try {
    const query = reshape(cron.query || cron.filter_key);
    const items = await searchSources([...SOURCE_IDS], env, {
      query,
      filterKey: cron.filter_key,
      limit: DEFAULT_LIMIT,
    });
    await upsertItems(env, items);
    const nowIso = new Date().toISOString();
    await markCronRanAt(env, id, nowIso);
    await finishCronRun(env, run.id, id, "ok", { itemCount: items.length });
    return { ok: true, run: { ...run, status: "ok", finished_at: nowIso } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finishCronRun(env, run.id, id, "error", { error: message });
    return { ok: false, run: { ...run, status: "error" }, error: message };
  }
}

// ---------------------------------------------------------------------------
// HTTP routing
// ---------------------------------------------------------------------------

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

export async function route(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = req.method.toUpperCase();
  const cors = corsHeaders(req, env);

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  function j(data: unknown, status = 200): Response {
    return json(data, status, cors);
  }

  function requireAdmin(): Response | null {
    if (isAdminAuthorized(req, env)) return null;
    return j({ error: "unauthorized", detail: `missing or invalid ${ADMIN_KEY_HEADER}` }, 401);
  }

  // GET / and GET /v1 -> health
  if (method === "GET" && (path === "/" || path === "/v1")) {
    return j({ service: "agna" });
  }

  // /v1/search
  if (path === "/v1/search" && (method === "GET" || method === "POST")) {
    const params =
      method === "GET"
        ? {
            q: url.searchParams.get("q") ?? "",
            sources: url.searchParams.get("sources") ?? undefined,
            limit: url.searchParams.get("limit") ?? undefined,
          }
        : ((await req.json().catch(() => ({}))) as Record<string, unknown>);
    const result = await doSearch(env, {
      q: String(params.q ?? ""),
      sources: params.sources ? String(params.sources) : undefined,
      limit: params.limit ? Number(params.limit) : undefined,
    });
    return j(result);
  }

  // /v1/gallery/:filter — one lane, must 200 even when empty
  const laneMatch = path.match(/^\/v1\/gallery\/([^/]+)$/);
  if (laneMatch && method === "GET") {
    const limit = clampLimit(url.searchParams.get("limit"));
    const result = await doGalleryLane(env, laneMatch[1], limit);
    return j(result);
  }

  // /v1/gallery
  if (path === "/v1/gallery" && method === "GET") {
    const refresh = url.searchParams.get("refresh") === "1";
    if (refresh) {
      const denied = requireAdmin();
      if (denied) return denied;
    }
    const result = await doGallery(env, {
      filter: url.searchParams.get("filter") ?? undefined,
      limit: clampLimit(url.searchParams.get("limit")),
      refresh,
    });
    return j(result);
  }

  // /v1/filters
  if (path === "/v1/filters" && method === "GET") {
    return j(doFilters());
  }

  // /v1/sources
  if (path === "/v1/sources" && method === "GET") {
    return j(doSources());
  }

  // /v1/cron collection
  if (path === "/v1/cron" && method === "GET") {
    return j({ crons: await doListCrons(env) });
  }
  if (path === "/v1/cron" && method === "POST") {
    const denied = requireAdmin();
    if (denied) return denied;
    const body = (await req.json().catch(() => ({}))) as Partial<AgnaCron> & { id?: string };
    if (!body.id) return j({ error: "id is required" }, 400);
    const cron = await doUpsertCron(env, { ...body, id: body.id });
    return j({ cron });
  }

  // /v1/cron/:id and /v1/cron/:id/run
  const cronRunMatch = path.match(/^\/v1\/cron\/([^/]+)\/run$/);
  if (cronRunMatch && method === "POST") {
    const denied = requireAdmin();
    if (denied) return denied;
    const result = await doRunCron(env, cronRunMatch[1]);
    return j(result, result.ok ? 200 : 404);
  }
  const cronOneMatch = path.match(/^\/v1\/cron\/([^/]+)$/);
  if (cronOneMatch && method === "GET") {
    const cron = await doGetCron(env, cronOneMatch[1]);
    if (!cron) return j({ error: "not found" }, 404);
    return j({ cron });
  }

  // /mcp
  if (path === "/mcp" && (method === "GET" || method === "POST")) {
    const body =
      method === "GET"
        ? { method: url.searchParams.get("method") ?? "ping" }
        : ((await req.json().catch(() => ({}))) as Record<string, unknown>);
    const result = await handleMcp(env, body, isAdminAuthorized(req, env));
    return j(result);
  }

  return j({ error: "not found", path }, 404);
}
