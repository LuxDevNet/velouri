# Agna — Data Schema

Human-readable copy of the agency schema. The executable schema is
`supabase/migrations/20260922020000_agna_store.sql`. If the two ever
disagree, the migration wins.

Applies only to agency `wieldveraqrbygapidlo`. Never applied to CODICE
(`rktwcqzmwkitjwnvtusc`). RLS is on for all five tables. `service_role`
writes (bypasses RLS by default on Supabase). `anon` and `authenticated`
get no policies at all — the SPA uses the anon key for Auth only, and talks
to data through the edge function.

## Write rule

Request-path writes are only:

- `public.agna_items`
- `public.agna_crons`
- `public.agna_cron_runs`

`store.ts` allowlists exactly these three tables (`assertAllowedTable`) and
throws `DisallowedTableError` for anything else, including
`agna_spine` and `agna_releases`. Those two change only in SQL
migrations; request handlers never insert into them.

## Write-path auth (added in the rename/security pass)

The three mutating surfaces — `POST /v1/cron`, `POST /v1/cron/:id`,
`POST /v1/cron/:id/run`, `GET /v1/gallery?refresh=1`, and the MCP
`upsert_cron` / `run_cron` tools — are gated by a shared-secret header,
`X-Agna-Admin-Key`, compared against env `AGNA_ADMIN_KEY` in
`router.ts`. When `AGNA_ADMIN_KEY` is unset (local dev / `accept.mjs`),
the gate is a no-op — set it before any public deploy. This is a stopgap
until real session auth exists; see `TODO.md`'s security note and
`nitemcp/docs/ROLLOUT.md` for the staged-cutover pattern to follow next.
CORS on the function is restricted to the origins in `PUBLIC_HOST`
(comma-separated; defaults to `https://agna.agnamo.com` and
`https://velouri.agnamo.com`).

## Tables

### `agna_items` — gallery cache

Primary key `id` text, shape `source:remoteId` (example `unsplash:abc`).

```sql
create table public.agna_items (
  id text primary key,
  source text not null check (source in ('unsplash', 'pexels', 'openverse', 'wikimedia')),
  kind text not null check (kind in ('image', 'video', 'page')),
  title text not null default '',
  url text not null,
  thumb text not null default '',
  tags text[] not null default '{}',
  filter_key text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index agna_items_filter_key_updated_at_idx
  on public.agna_items (filter_key, updated_at desc);
```

`kind = 'video'` only when Wikimedia returns a normal clip (`.webm`,
`.ogv`, `.mp4`). Rows the source marks rejected or restricted are dropped
before they ever reach this table.

Item shape returned by the API:

```json
{
  "id": "unsplash:abc",
  "source": "unsplash",
  "kind": "image",
  "title": "Ridge at dusk",
  "url": "https://...",
  "thumb": "https://...",
  "tags": ["landscape"],
  "filter_key": "landscape",
  "payload": {}
}
```

### `agna_crons` — cron definitions

```sql
create table public.agna_crons (
  id text primary key,
  schedule text not null,
  query text not null,
  filter_key text not null,
  enabled boolean not null default true,
  last_run_at timestamptz null,
  meta jsonb not null default '{}'
);
```

Seed:

| id | schedule | query | filter_key |
| --- | --- | --- | --- |
| `gallery-default` | `0 */6 * * *` | `landscape scenery horizon` | `landscape` |
| `velouri-gallery` | `0 * * * *` | `portrait face studio` | `portrait` |

### `agna_cron_runs` — cron run history

```sql
create table public.agna_cron_runs (
  id bigint generated always as identity primary key,
  cron_id text not null references public.agna_crons (id),
  started_at timestamptz not null default now(),
  finished_at timestamptz null,
  status text not null check (status in ('running', 'ok', 'error')),
  detail jsonb not null default '{}'
);
```

### `agna_spine` — live catalog (migration-only writes)

Same grain as CODICE spine rows. Primary key `(entity_kind, entity_key)`.
Seeded once in the migration (103 rows spanning app, models, agents,
pages, routes, endpoints, sources, filters, mcp_tools, navigation,
components, buttons, design preset, storage key, features, functions,
docs). Request handlers never insert here.

```sql
create table public.agna_spine (
  entity_kind text not null,
  entity_key text not null,
  entity_ref text null,
  title text null,
  status text null,
  meta jsonb not null default '{}',
  release text not null default '1.0.0',
  updated_at timestamptz not null default now(),
  primary key (entity_kind, entity_key)
);
```

### `agna_releases` — release ledger (migration-only writes)

```sql
create table public.agna_releases (
  version text primary key,
  bump text not null check (bump in ('major', 'minor', 'patch')),
  notes text not null default '',
  applied_at timestamptz not null default now(),
  promotion_status text not null check (promotion_status in ('none', 'review', 'promoted', 'frozen')),
  promoted_at timestamptz null
);
```

Empty at the end of the migration. W8 inserts `1.0.0` frozen only after the
CODICE rows exist — out of scope for this pass. This ledger, and the
`spine.agna` CODICE draft, both start clean under the new name: the old
`aoumai_*` migration and `001_register_aoumai.sql` were never applied to
any live project, so this rename did not need a promotion-review bump.

## Client document (not a table)

`localStorage` key `agna.settings.v1`:

```ts
{
  apiBase: string;      // default VITE_AGNA_API (https://agna.agnamo.com)
  originBase: string;   // default VITE_AGNA_ORIGIN (the Supabase function URL)
  supabaseUrl: string;  // default https://wieldveraqrbygapidlo.supabase.co
  velouriPfp: string;   // default VITE_VELOURI_PFP or ''
}
```

Spine kind `model` key `settings`, kind `storage_key` key
`agna.settings.v1`. Never written to Postgres. The API client
(`agnaApi.ts`) resolves the request base URL as `apiBase || originBase ||
""` — `apiBase` (the public custom domain, once the Cloudflare worker
proxies `/v1/*` and `/mcp`) wins when set; `originBase` (the raw Supabase
function URL) is the fallback for local dev or if the worker proxy isn't
live yet.

## API behavior

Reshape map (`src/reshape.ts`), other tokens pass through unchanged:

| token | expands to |
| --- | --- |
| `landscape` | `landscape scenery horizon` |
| `portrait` | `portrait face studio` |
| `architecture` | `architecture building interior` |
| `nature` | `nature forest ocean` |
| `studio` | `studio product still_life` |

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/` or `/v1` | `{ "service": "agna" }` |
| GET/POST | `/v1/search` | reshape + federate. `q`, `sources` (csv, default all four), `limit` clamped to 50. Drops rows the source marks rejected/restricted. Unsplash always sends `content_filter=high`. |
| GET | `/v1/gallery` | reads cache. Empty cache auto-seeds. `?refresh=1` refetches — **requires `X-Agna-Admin-Key` when `AGNA_ADMIN_KEY` is set**. `?filter=` and `?limit=` optional. |
| GET | `/v1/gallery/:filter` | one lane. Must return 200 even when empty (`{ "items": [] }`). |
| GET | `/v1/filters` | `landscape`, `portrait`, `architecture`, `nature`, `studio` |
| GET | `/v1/sources` | `unsplash`, `pexels`, `openverse`, `wikimedia` |
| GET/POST | `/v1/cron` | list / upsert — **POST requires `X-Agna-Admin-Key`**. |
| GET | `/v1/cron/:id` | one cron |
| POST | `/v1/cron/:id/run` | runs now, writes `agna_cron_runs` — **requires `X-Agna-Admin-Key`**. |
| GET/POST | `/mcp` | `initialize`, `tools/list`, `tools/call`, `ping` — `upsert_cron`/`run_cron` tool calls require the same header. |

MCP tools (`src/mcp.ts`): `search`, `gallery`, `list_filters`,
`list_sources`, `list_crons`, `upsert_cron`, `run_cron`.

Sources are server-side only; keys never reach the client. Unsplash and
Pexels skip with a logged miss when their env keys are empty. Openverse
and Wikimedia always run.

## Local dev without a service role

When `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are both absent (local
dev, `scripts/accept.mjs`), `store.ts` falls back to an in-memory store
scoped to the process, pre-seeded with the two default crons. This is the
mode `scripts/accept.mjs` runs in — it never opens a database connection.
