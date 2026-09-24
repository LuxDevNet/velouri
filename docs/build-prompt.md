# Agna + Velouri — Implementation Contract

Repo copy of the build prompt. This is a copy, not a substitute for the plan file at
`c:\Users\gabri\.cursor\plans\aoumai_velouri_build_d66e232c.plan.md`. If the two ever
disagree, the plan file wins. (The plan file's filename keeps the original `aoumai_velouri`
slug intentionally — see `docs/refs/initial-prompt.md`, which is also left unrenamed as the
immutable historical record of the original brief.)

## Write rule

The app (SPA and edge function) writes only `public.agna_*` on agency `wieldveraqrbygapidlo`.
It never opens a CODICE client. It never writes `agents`, `registry`, `security`, `vault`, or
`public.accounts`.

Request-path writes are only:

- `public.agna_items`
- `public.agna_crons`
- `public.agna_cron_runs`

`public.agna_spine` and `public.agna_releases` change only in SQL migrations. `store.ts`
rejects any other table name.

CODICE `rktwcqzmwkitjwnvtusc` is the catalog. This build may edit it once, in W8, to register
the spine, models, and agents. Stopping point is `v1.0.0` with `promotion_status = frozen`.
After that, CODICE stays frozen. A later major bump updates agency tables first and sets
`promotion_status = review`. CODICE changes only after that review is explicitly approved.
Minor and patch bumps do not open a review and do not touch CODICE.

`public.agents` and `public.models` on CODICE are an unrelated demo picker (six sample agents,
a name list). Leave them alone. Product models and agents are spine rows.

## Hosts

- Agency runtime: `wieldveraqrbygapidlo`, project name agency, `us-east-1`, `ACTIVE_HEALTHY`.
  API origin `https://wieldveraqrbygapidlo.supabase.co/functions/v1/agna`.
- CODICE catalog: `rktwcqzmwkitjwnvtusc`. Existing spines: `agnamo`, `mako`, `agentops`, `pool`,
  `youbuilder`, unioned by `spine.v_spine`. No `agna` row yet (W8 pending).
- Public surfaces: Cloudflare Workers `agna.agnamo.com` (`workers/agna`, serves the SPA and
  proxies `/v1/*` + `/mcp` to the Supabase function origin) and `velouri.agnamo.com`
  (`workers/velouri`, serves the same SPA, redirects `/` → `/velouri`). Neither has been
  deployed from this session — no Cloudflare credentials available; see `workers/README.md`.
- Keys stay out of git. Unsplash and Pexels skip with a logged miss when their env keys are
  empty. Openverse and Wikimedia still run.

## Agency table DDL (executable copy lives in the migration)

### agna_items

Gallery cache. Primary key `id` text, shape `source:remoteId` (example `unsplash:abc`).

```sql
create table public.agna_items (
  id text primary key,
  source text not null check (source in ('unsplash','pexels','openverse','wikimedia')),
  kind text not null check (kind in ('image','video','page')),
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

### agna_crons

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

- `gallery-default`, schedule `0 */6 * * *`, query `landscape scenery horizon`, filter `landscape`
- `velouri-gallery`, schedule `0 * * * *`, query `portrait face studio`, filter `portrait`

### agna_cron_runs

```sql
create table public.agna_cron_runs (
  id bigint generated always as identity primary key,
  cron_id text not null references public.agna_crons(id),
  started_at timestamptz not null default now(),
  finished_at timestamptz null,
  status text not null check (status in ('running','ok','error')),
  detail jsonb not null default '{}'
);
```

### agna_spine

Live catalog, same grain as CODICE spine rows. Primary key `(entity_kind, entity_key)`.
Seeded once in the migration; request handlers never insert here.

### agna_releases

`version` primary key, `bump` check `major|minor|patch`, `promotion_status` check
`none|review|promoted|frozen`. W8 inserts `1.0.0` frozen only after the CODICE rows exist.

RLS is on for all five tables. `service_role` writes. `anon` and `authenticated` have no
policies. The SPA uses the anon key for Auth only, and talks to data through the edge function.

## Client settings document (not a table)

`localStorage` key `agna.settings.v1`:

```ts
{
  apiBase: string;      // default VITE_AGNA_API (https://agna.agnamo.com)
  originBase: string;   // default VITE_AGNA_ORIGIN
  supabaseUrl: string;  // default https://wieldveraqrbygapidlo.supabase.co
  velouriPfp: string;   // default VITE_VELOURI_PFP or ''
}
```

`/settings` and `/profile` render the same page. Save dispatches `agna-settings`. The client
resolves the request base as `apiBase || originBase || ""` — set `apiBase` to the public
worker domain once it proxies the API; `originBase` (the raw Supabase function URL) is the
fallback. Empty of both tells the user to set Settings or env. This object is spine kind
`model` key `settings` and kind `storage_key` key `agna.settings.v1`. It is not written to
Postgres.

## API behavior summary

Reshape map, other tokens pass through:

- `landscape` → `landscape scenery horizon`
- `portrait` → `portrait face studio`
- `architecture` → `architecture building interior`
- `nature` → `nature forest ocean`
- `studio` → `studio product still_life`

- `GET /` and `GET /v1` → `{ "service": "agna" }`
- `GET/POST /v1/search` — reshape + federate. `q`, `sources` (csv, default all four),
  `limit` clamped to 50. Drop rows the source marks rejected/restricted. Unsplash always sends
  `content_filter=high`.
- `GET /v1/gallery` — read cache. Empty cache auto-seeds by running search for each default
  filter. `?refresh=1` refetches — requires `X-Agna-Admin-Key` when `AGNA_ADMIN_KEY` is set.
  `?filter=` and `?limit=` optional.
- `GET /v1/gallery/:filter` — one lane, must return 200 even when empty (`{ items: [] }`).
- `GET /v1/filters` — `landscape`, `portrait`, `architecture`, `nature`, `studio`.
- `GET /v1/sources` — `unsplash`, `pexels`, `openverse`, `wikimedia`.
- `GET/POST /v1/cron` (POST requires the admin key), `GET /v1/cron/:id`,
  `POST /v1/cron/:id/run` (requires the admin key; writes `agna_cron_runs`).
- `GET/POST /mcp` — `initialize`, `tools/list`, `tools/call`, `ping`. Tools: `search`,
  `gallery`, `list_filters`, `list_sources`, `list_crons`, `upsert_cron` (gated), `run_cron`
  (gated).

CORS is restricted to the origins in `PUBLIC_HOST` (default `https://agna.agnamo.com`,
`https://velouri.agnamo.com`).

## Spine inventory

One app, key `agna`, title Agna, status `active`. Velouri is a page of that app, not a
second spine. `_source_ref` on every CODICE row would be `wieldveraqrbygapidlo`.

Models (kind `model`): `item`→`agna_items`, `cron`→`agna_crons`, `cron_run`→`agna_cron_runs`,
`spine_entity`→`agna_spine`, `release`→`agna_releases`, `settings`→storage
`agna.settings.v1`.

Agents (kind `agent`, add `agna` to `used_by`): `gallery-default` (scheduled, writes items),
`velouri-gallery` (scheduled, writes items), `agna-mcp` (active, no direct table writes).

Pages/routes: `home /`, `velouri /velouri`, `plugins /plugins`, `docs /docs`,
`settings /settings`, `profile /profile` (alias of settings), `login /login`,
`privacy /privacy`, `terms /terms`, `data /data`, `about /about`.

Endpoints: `get-root`, `get-v1`, `search` (GET/POST), `gallery`, `gallery-filter`, `filters`,
`sources`, `cron-collection` (GET/POST), `cron-one`, `cron-run`, `mcp` (GET/POST).

Sources: `unsplash`, `pexels`, `openverse`, `wikimedia`. Filters: the five defaults, meta holds
the reshape query. MCP tools: the seven tool names above.

Navigation: Home, Velouri, Plugins, Docs, Settings.

Components: Home `viewfinder`, `hero`; Velouri `contact-sheet`, `filter-chips`, `stage`,
`resolution`; Plugins `source-grid`; Docs `endpoint-list`; Settings `settings-form`; Login
`auth-form`; Privacy/Terms/Data/About one `prose` component each.

Buttons: `settings-save`, `velouri-refresh` (runs cron `velouri-gallery`), `resolution-sd`,
`resolution-hd`, `resolution-max`, `login-submit`, `filter-landscape`, `filter-portrait`,
`filter-architecture`, `filter-nature`, `filter-studio`.

Also seed: `design_preset` key `chamber-gelatin` (hex tokens below), `storage_key` key
`agna.settings.v1`, `feature` keys `federated-search`, `gallery-cache`, `velouri-stage`,
`settings`, `function` keys `reshape`, `search`, `gallery`, `cron`, `mcp`, `doc` keys `DATA`,
`SPINE`, `PROMOTION`.

`meta.parent` links a page to app `agna`, a component to its page, a button to its component.
That is the only hierarchy field. No extra edge table.

## CODICE freeze rule (W8 only — still pending)

Apply `supabase/codice/001_register_agna.sql` to `rktwcqzmwkitjwnvtusc` only, once, after a
human confirms CODICE access. Create `spine.agna` matching `spine.pool`'s columns, insert
`spine.source_project`, add vocabulary rows with `first_spine = agna`, append `agna` to
`used_by` on existing kinds this spine uses, copy the agency seed with explicit inserts, and
extend `spine.v_spine`'s union. Then, and only then, write agency `agna_releases` v1.0.0 as
`frozen`. After that insert, no further CODICE writes happen in this pass. Later major bumps
update agency tables first and set `promotion_status = review`; CODICE changes only after
that review is approved.

## Design tokens (also stored on design preset `chamber-gelatin`)

- Chamber `#2C2A28`
- Gelatin `#C4B8A5`
- Mercury `#6E8B9A`
- Tungsten `#C9A06A`
- Well `#141312`
- Specular `#F3EDE3`

Type: Syne display, Figtree body, IBM Plex Mono for paths and ids. Signature: viewfinder corner
ticks as chrome, gallery as a contact sheet.

## File list

- `supabase/migrations/20260922020000_agna_store.sql`
- `supabase/codice/001_register_agna.sql`
- `supabase/functions/agna/src/{index,router,reshape,sources,store,mcp}.ts`
- `sites/www/src/App.tsx`, `lib/settings.ts`, `lib/agnaApi.ts`, `components/VelouriStage.tsx`,
  `components/Nav.tsx`
- `sites/www/src/pages/{Home,Velouri,Plugins,Docs,Settings,Login,Privacy,Terms,Data,About}.tsx`
- `sites/www/public/_redirects` with `/* /index.html 200`
- `docs/DATA.md`, `docs/SPINE.md`, `docs/PROMOTION.md`, `docs/build-prompt.md`
- `scripts/accept.mjs`
- `TODO.md`, `.env.example`
- `workers/agna/`, `workers/velouri/`, `workers/README.md`
