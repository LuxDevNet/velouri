// store.ts — the only module allowed to talk to Postgres.
//
// Write rule: the app writes only public.agna_items, public.agna_crons,
// and public.agna_cron_runs on agency wieldveraqrbygapidlo. It never opens
// a CODICE client and never writes agents, registry, security, vault, or
// public.accounts. agna_spine and agna_releases change only in SQL
// migrations — this module refuses to touch them.
//
// When SUPABASE_SERVICE_ROLE_KEY is absent (local dev, accept.mjs), all
// operations fall back to an in-memory store scoped to the process.

export type AllowedTable = "agna_items" | "agna_crons" | "agna_cron_runs";

const ALLOWED_TABLES: ReadonlySet<string> = new Set([
  "agna_items",
  "agna_crons",
  "agna_cron_runs",
]);

export class DisallowedTableError extends Error {
  constructor(table: string) {
    super(
      `store.ts write guard: table "${table}" is not in the request-path allowlist ` +
        `(agna_items, agna_crons, agna_cron_runs). Refusing write.`,
    );
    this.name = "DisallowedTableError";
  }
}

export function assertAllowedTable(table: string): AllowedTable {
  if (!ALLOWED_TABLES.has(table)) {
    throw new DisallowedTableError(table);
  }
  return table as AllowedTable;
}

export interface StoreEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export interface AgnaItem {
  id: string;
  source: "unsplash" | "pexels" | "openverse" | "wikimedia";
  kind: "image" | "video" | "page";
  title: string;
  url: string;
  thumb: string;
  tags: string[];
  filter_key: string;
  payload: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface AgnaCron {
  id: string;
  schedule: string;
  query: string;
  filter_key: string;
  enabled: boolean;
  last_run_at: string | null;
  meta: Record<string, unknown>;
}

export interface AgnaCronRun {
  id?: number;
  cron_id: string;
  started_at?: string;
  finished_at?: string | null;
  status: "running" | "ok" | "error";
  detail: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// In-memory fallback (used whenever SUPABASE_SERVICE_ROLE_KEY is not set)
// ---------------------------------------------------------------------------

const memory = {
  agna_items: new Map<string, AgnaItem>(),
  agna_crons: new Map<string, AgnaCron>([
    [
      "gallery-default",
      {
        id: "gallery-default",
        schedule: "0 */6 * * *",
        query: "landscape scenery horizon",
        filter_key: "landscape",
        enabled: true,
        last_run_at: null,
        meta: {},
      },
    ],
    [
      "velouri-gallery",
      {
        id: "velouri-gallery",
        schedule: "0 * * * *",
        query: "portrait face studio",
        filter_key: "portrait",
        enabled: true,
        last_run_at: null,
        meta: {},
      },
    ],
  ]),
  agna_cron_runs: [] as AgnaCronRun[],
  nextRunId: 1,
};

function isServiceRoleConfigured(env: StoreEnv): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

// ---------------------------------------------------------------------------
// Supabase REST helpers (no client SDK dependency — plain fetch against
// PostgREST so the function has zero extra runtime deps)
// ---------------------------------------------------------------------------

function restHeaders(env: StoreEnv): Record<string, string> {
  const key = env.SUPABASE_SERVICE_ROLE_KEY as string;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

async function restRequest(
  env: StoreEnv,
  table: AllowedTable,
  init: RequestInit & { query?: string },
): Promise<Response> {
  const base = (env.SUPABASE_URL as string).replace(/\/$/, "");
  const query = init.query ?? "";
  const url = `${base}/rest/v1/${table}${query}`;
  const { query: _q, ...rest } = init;
  return fetch(url, {
    ...rest,
    headers: { ...restHeaders(env), ...(rest.headers ?? {}) },
  });
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export async function upsertItems(env: StoreEnv, items: AgnaItem[]): Promise<void> {
  assertAllowedTable("agna_items");
  if (items.length === 0) return;
  if (!isServiceRoleConfigured(env)) {
    for (const item of items) {
      memory.agna_items.set(item.id, { ...item, updated_at: new Date().toISOString() });
    }
    return;
  }
  const res = await restRequest(env, "agna_items", {
    method: "POST",
    query: "?on_conflict=id",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(items),
  });
  if (!res.ok) {
    throw new Error(`store.ts upsertItems failed: ${res.status} ${await res.text()}`);
  }
}

export async function listItemsByFilter(
  env: StoreEnv,
  filterKey: string | null,
  limit: number,
): Promise<AgnaItem[]> {
  assertAllowedTable("agna_items");
  if (!isServiceRoleConfigured(env)) {
    let rows = Array.from(memory.agna_items.values());
    if (filterKey) rows = rows.filter((r) => r.filter_key === filterKey);
    rows.sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
    return rows.slice(0, limit);
  }
  const filterQuery = filterKey ? `&filter_key=eq.${encodeURIComponent(filterKey)}` : "";
  const res = await restRequest(env, "agna_items", {
    method: "GET",
    query: `?select=*${filterQuery}&order=updated_at.desc&limit=${limit}`,
  });
  if (!res.ok) {
    throw new Error(`store.ts listItemsByFilter failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as AgnaItem[];
}

export async function countItems(env: StoreEnv): Promise<number> {
  assertAllowedTable("agna_items");
  if (!isServiceRoleConfigured(env)) {
    return memory.agna_items.size;
  }
  const res = await restRequest(env, "agna_items", {
    method: "GET",
    query: "?select=id",
    headers: { Prefer: "count=exact" },
  });
  if (!res.ok) {
    throw new Error(`store.ts countItems failed: ${res.status} ${await res.text()}`);
  }
  const contentRange = res.headers.get("content-range");
  if (contentRange) {
    const total = contentRange.split("/")[1];
    if (total && total !== "*") return Number(total);
  }
  return (await res.json() as unknown[]).length;
}

// ---------------------------------------------------------------------------
// Crons
// ---------------------------------------------------------------------------

export async function listCrons(env: StoreEnv): Promise<AgnaCron[]> {
  assertAllowedTable("agna_crons");
  if (!isServiceRoleConfigured(env)) {
    return Array.from(memory.agna_crons.values());
  }
  const res = await restRequest(env, "agna_crons", { method: "GET", query: "?select=*" });
  if (!res.ok) {
    throw new Error(`store.ts listCrons failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as AgnaCron[];
}

export async function getCron(env: StoreEnv, id: string): Promise<AgnaCron | null> {
  assertAllowedTable("agna_crons");
  if (!isServiceRoleConfigured(env)) {
    return memory.agna_crons.get(id) ?? null;
  }
  const res = await restRequest(env, "agna_crons", {
    method: "GET",
    query: `?select=*&id=eq.${encodeURIComponent(id)}`,
  });
  if (!res.ok) {
    throw new Error(`store.ts getCron failed: ${res.status} ${await res.text()}`);
  }
  const rows = (await res.json()) as AgnaCron[];
  return rows[0] ?? null;
}

export async function upsertCron(env: StoreEnv, cron: AgnaCron): Promise<AgnaCron> {
  assertAllowedTable("agna_crons");
  if (!isServiceRoleConfigured(env)) {
    memory.agna_crons.set(cron.id, cron);
    return cron;
  }
  const res = await restRequest(env, "agna_crons", {
    method: "POST",
    query: "?on_conflict=id",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify([cron]),
  });
  if (!res.ok) {
    throw new Error(`store.ts upsertCron failed: ${res.status} ${await res.text()}`);
  }
  const rows = (await res.json()) as AgnaCron[];
  return rows[0] ?? cron;
}

export async function markCronRanAt(env: StoreEnv, id: string, iso: string): Promise<void> {
  assertAllowedTable("agna_crons");
  if (!isServiceRoleConfigured(env)) {
    const existing = memory.agna_crons.get(id);
    if (existing) memory.agna_crons.set(id, { ...existing, last_run_at: iso });
    return;
  }
  const res = await restRequest(env, "agna_crons", {
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(id)}`,
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ last_run_at: iso }),
  });
  if (!res.ok) {
    throw new Error(`store.ts markCronRanAt failed: ${res.status} ${await res.text()}`);
  }
}

// ---------------------------------------------------------------------------
// Cron runs
// ---------------------------------------------------------------------------

export async function startCronRun(env: StoreEnv, cronId: string): Promise<AgnaCronRun> {
  assertAllowedTable("agna_cron_runs");
  const run: AgnaCronRun = {
    cron_id: cronId,
    started_at: new Date().toISOString(),
    finished_at: null,
    status: "running",
    detail: {},
  };
  if (!isServiceRoleConfigured(env)) {
    const stored = { ...run, id: memory.nextRunId++ };
    memory.agna_cron_runs.push(stored);
    return stored;
  }
  const res = await restRequest(env, "agna_cron_runs", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([run]),
  });
  if (!res.ok) {
    throw new Error(`store.ts startCronRun failed: ${res.status} ${await res.text()}`);
  }
  const rows = (await res.json()) as AgnaCronRun[];
  return rows[0] ?? run;
}

export async function finishCronRun(
  env: StoreEnv,
  runId: number | undefined,
  cronId: string,
  status: "ok" | "error",
  detail: Record<string, unknown>,
): Promise<void> {
  assertAllowedTable("agna_cron_runs");
  const finishedAt = new Date().toISOString();
  if (!isServiceRoleConfigured(env)) {
    const run = memory.agna_cron_runs.find((r) => r.id === runId && r.cron_id === cronId);
    if (run) {
      run.status = status;
      run.finished_at = finishedAt;
      run.detail = detail;
    }
    return;
  }
  if (runId === undefined) return;
  const res = await restRequest(env, "agna_cron_runs", {
    method: "PATCH",
    query: `?id=eq.${runId}`,
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status, finished_at: finishedAt, detail }),
  });
  if (!res.ok) {
    throw new Error(`store.ts finishCronRun failed: ${res.status} ${await res.text()}`);
  }
}

// Exported for accept.mjs — never used on the request path.
export const __memoryForTests = memory;
