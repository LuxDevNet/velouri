-- Agna + Velouri agency store.
-- Applies only to agency (wieldveraqrbygapidlo). Never applied to CODICE.
-- RLS on for all five tables. service_role writes (bypasses RLS by default
-- on Supabase). anon and authenticated get no policies at all.
--
-- Renamed from aoumai_* to agna_* in the Agna rebrand pass. This is a fresh
-- migration filename (not an ALTER on the old one) because the aoumai_*
-- migration was never applied to any live project — nothing to migrate.

-- ---------------------------------------------------------------------------
-- agna_items — gallery cache
-- ---------------------------------------------------------------------------
create table if not exists public.agna_items (
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

create index if not exists agna_items_filter_key_updated_at_idx
  on public.agna_items (filter_key, updated_at desc);

alter table public.agna_items enable row level security;

-- ---------------------------------------------------------------------------
-- agna_crons — cron definitions
-- ---------------------------------------------------------------------------
create table if not exists public.agna_crons (
  id text primary key,
  schedule text not null,
  query text not null,
  filter_key text not null,
  enabled boolean not null default true,
  last_run_at timestamptz null,
  meta jsonb not null default '{}'
);

alter table public.agna_crons enable row level security;

insert into public.agna_crons (id, schedule, query, filter_key, enabled, meta)
values
  ('gallery-default', '0 */6 * * *', 'landscape scenery horizon', 'landscape', true, '{}'::jsonb),
  ('velouri-gallery', '0 * * * *', 'portrait face studio', 'portrait', true, '{}'::jsonb)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- agna_cron_runs — cron run history
-- ---------------------------------------------------------------------------
create table if not exists public.agna_cron_runs (
  id bigint generated always as identity primary key,
  cron_id text not null references public.agna_crons (id),
  started_at timestamptz not null default now(),
  finished_at timestamptz null,
  status text not null check (status in ('running', 'ok', 'error')),
  detail jsonb not null default '{}'
);

alter table public.agna_cron_runs enable row level security;

-- ---------------------------------------------------------------------------
-- agna_spine — live catalog, same grain as CODICE spine rows.
-- Changes only in SQL migrations. Request handlers never insert here.
-- ---------------------------------------------------------------------------
create table if not exists public.agna_spine (
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

alter table public.agna_spine enable row level security;

-- ---------------------------------------------------------------------------
-- agna_releases — release ledger. W8 inserts 1.0.0 frozen after the
-- CODICE rows exist. Empty at the end of this migration.
-- ---------------------------------------------------------------------------
create table if not exists public.agna_releases (
  version text primary key,
  bump text not null check (bump in ('major', 'minor', 'patch')),
  notes text not null default '',
  applied_at timestamptz not null default now(),
  promotion_status text not null check (promotion_status in ('none', 'review', 'promoted', 'frozen')),
  promoted_at timestamptz null
);

alter table public.agna_releases enable row level security;

-- ---------------------------------------------------------------------------
-- Spine seed — full inventory from the plan. 103 rows.
-- ---------------------------------------------------------------------------
insert into public.agna_spine (entity_kind, entity_key, entity_ref, title, status, meta)
values
  -- app
  ('app', 'agna', null, 'Agna', 'active', '{}'::jsonb),

  -- models
  ('model', 'item', 'agna_items', 'AgnaItem', 'active', '{"table":"agna_items"}'::jsonb),
  ('model', 'cron', 'agna_crons', 'AgnaCron', 'active', '{"table":"agna_crons"}'::jsonb),
  ('model', 'cron_run', 'agna_cron_runs', 'AgnaCronRun', 'active', '{"table":"agna_cron_runs"}'::jsonb),
  ('model', 'spine_entity', 'agna_spine', 'AgnaSpineEntity', 'active', '{"table":"agna_spine"}'::jsonb),
  ('model', 'release', 'agna_releases', 'AgnaRelease', 'active', '{"table":"agna_releases"}'::jsonb),
  ('model', 'settings', 'agna.settings.v1', 'SettingsDocument', 'active', '{"storage":"agna.settings.v1"}'::jsonb),

  -- agents
  ('agent', 'gallery-default', null, 'gallery-default', 'scheduled', '{"schedule":"0 */6 * * *","writes":["agna_items"]}'::jsonb),
  ('agent', 'velouri-gallery', null, 'velouri-gallery', 'scheduled', '{"schedule":"0 * * * *","writes":["agna_items"]}'::jsonb),
  ('agent', 'agna-mcp', null, 'agna-mcp', 'active', '{"tools":["search","gallery","list_filters","list_sources","list_crons","upsert_cron","run_cron"],"writes":[]}'::jsonb),

  -- pages
  ('page', 'home', null, 'Home', 'active', '{"parent":"agna","route":"/"}'::jsonb),
  ('page', 'velouri', null, 'Velouri', 'active', '{"parent":"agna","route":"/velouri"}'::jsonb),
  ('page', 'plugins', null, 'Plugins', 'active', '{"parent":"agna","route":"/plugins"}'::jsonb),
  ('page', 'docs', null, 'Docs', 'active', '{"parent":"agna","route":"/docs"}'::jsonb),
  ('page', 'settings', null, 'Settings', 'active', '{"parent":"agna","route":"/settings"}'::jsonb),
  ('page', 'profile', null, 'Profile', 'alias', '{"parent":"agna","route":"/profile","aliasOf":"settings"}'::jsonb),
  ('page', 'login', null, 'Login', 'active', '{"parent":"agna","route":"/login"}'::jsonb),
  ('page', 'privacy', null, 'Privacy', 'active', '{"parent":"agna","route":"/privacy"}'::jsonb),
  ('page', 'terms', null, 'Terms', 'active', '{"parent":"agna","route":"/terms"}'::jsonb),
  ('page', 'data', null, 'Data', 'active', '{"parent":"agna","route":"/data"}'::jsonb),
  ('page', 'about', null, 'About', 'active', '{"parent":"agna","route":"/about"}'::jsonb),

  -- routes
  ('route', '/', null, 'home', 'active', '{"parent":"home"}'::jsonb),
  ('route', '/velouri', null, 'velouri', 'active', '{"parent":"velouri"}'::jsonb),
  ('route', '/plugins', null, 'plugins', 'active', '{"parent":"plugins"}'::jsonb),
  ('route', '/docs', null, 'docs', 'active', '{"parent":"docs"}'::jsonb),
  ('route', '/settings', null, 'settings', 'active', '{"parent":"settings"}'::jsonb),
  ('route', '/profile', null, 'profile', 'alias', '{"parent":"profile"}'::jsonb),
  ('route', '/login', null, 'login', 'active', '{"parent":"login"}'::jsonb),
  ('route', '/privacy', null, 'privacy', 'active', '{"parent":"privacy"}'::jsonb),
  ('route', '/terms', null, 'terms', 'active', '{"parent":"terms"}'::jsonb),
  ('route', '/data', null, 'data', 'active', '{"parent":"data"}'::jsonb),
  ('route', '/about', null, 'about', 'active', '{"parent":"about"}'::jsonb),

  -- endpoints
  ('endpoint', 'get-root', null, 'GET /', 'active', '{"method":"GET","path":"/"}'::jsonb),
  ('endpoint', 'get-v1', null, 'GET /v1', 'active', '{"method":"GET","path":"/v1"}'::jsonb),
  ('endpoint', 'search', null, 'search', 'active', '{"methods":["GET","POST"],"path":"/v1/search"}'::jsonb),
  ('endpoint', 'gallery', null, 'gallery', 'active', '{"method":"GET","path":"/v1/gallery"}'::jsonb),
  ('endpoint', 'gallery-filter', null, 'gallery-filter', 'active', '{"method":"GET","path":"/v1/gallery/:filter"}'::jsonb),
  ('endpoint', 'filters', null, 'filters', 'active', '{"method":"GET","path":"/v1/filters"}'::jsonb),
  ('endpoint', 'sources', null, 'sources', 'active', '{"method":"GET","path":"/v1/sources"}'::jsonb),
  ('endpoint', 'cron-collection', null, 'cron-collection', 'active', '{"methods":["GET","POST"],"path":"/v1/cron"}'::jsonb),
  ('endpoint', 'cron-one', null, 'cron-one', 'active', '{"method":"GET","path":"/v1/cron/:id"}'::jsonb),
  ('endpoint', 'cron-run', null, 'cron-run', 'active', '{"method":"POST","path":"/v1/cron/:id/run"}'::jsonb),
  ('endpoint', 'mcp', null, 'mcp', 'active', '{"methods":["GET","POST"],"path":"/mcp"}'::jsonb),

  -- sources
  ('source', 'unsplash', null, 'Unsplash', 'active', '{}'::jsonb),
  ('source', 'pexels', null, 'Pexels', 'active', '{}'::jsonb),
  ('source', 'openverse', null, 'Openverse', 'active', '{}'::jsonb),
  ('source', 'wikimedia', null, 'Wikimedia Commons', 'active', '{}'::jsonb),

  -- filters
  ('filter', 'landscape', null, 'Landscape', 'active', '{"query":"landscape scenery horizon"}'::jsonb),
  ('filter', 'portrait', null, 'Portrait', 'active', '{"query":"portrait face studio"}'::jsonb),
  ('filter', 'architecture', null, 'Architecture', 'active', '{"query":"architecture building interior"}'::jsonb),
  ('filter', 'nature', null, 'Nature', 'active', '{"query":"nature forest ocean"}'::jsonb),
  ('filter', 'studio', null, 'Studio', 'active', '{"query":"studio product still_life"}'::jsonb),

  -- mcp tools
  ('mcp_tool', 'search', null, 'search', 'active', '{}'::jsonb),
  ('mcp_tool', 'gallery', null, 'gallery', 'active', '{}'::jsonb),
  ('mcp_tool', 'list_filters', null, 'list_filters', 'active', '{}'::jsonb),
  ('mcp_tool', 'list_sources', null, 'list_sources', 'active', '{}'::jsonb),
  ('mcp_tool', 'list_crons', null, 'list_crons', 'active', '{}'::jsonb),
  ('mcp_tool', 'upsert_cron', null, 'upsert_cron', 'active', '{}'::jsonb),
  ('mcp_tool', 'run_cron', null, 'run_cron', 'active', '{}'::jsonb),

  -- navigation
  ('navigation_item', 'home', null, 'Home', 'active', '{"route":"/","order":1}'::jsonb),
  ('navigation_item', 'velouri', null, 'Velouri', 'active', '{"route":"/velouri","order":2}'::jsonb),
  ('navigation_item', 'plugins', null, 'Plugins', 'active', '{"route":"/plugins","order":3}'::jsonb),
  ('navigation_item', 'docs', null, 'Docs', 'active', '{"route":"/docs","order":4}'::jsonb),
  ('navigation_item', 'settings', null, 'Settings', 'active', '{"route":"/settings","order":5}'::jsonb),

  -- components
  ('component', 'viewfinder', null, 'viewfinder', 'active', '{"parent":"home"}'::jsonb),
  ('component', 'hero', null, 'hero', 'active', '{"parent":"home"}'::jsonb),
  ('component', 'contact-sheet', null, 'contact-sheet', 'active', '{"parent":"velouri"}'::jsonb),
  ('component', 'filter-chips', null, 'filter-chips', 'active', '{"parent":"velouri"}'::jsonb),
  ('component', 'stage', null, 'stage', 'active', '{"parent":"velouri"}'::jsonb),
  ('component', 'resolution', null, 'resolution', 'active', '{"parent":"velouri"}'::jsonb),
  ('component', 'source-grid', null, 'source-grid', 'active', '{"parent":"plugins"}'::jsonb),
  ('component', 'endpoint-list', null, 'endpoint-list', 'active', '{"parent":"docs"}'::jsonb),
  ('component', 'settings-form', null, 'settings-form', 'active', '{"parent":"settings"}'::jsonb),
  ('component', 'auth-form', null, 'auth-form', 'active', '{"parent":"login"}'::jsonb),
  ('component', 'prose-privacy', null, 'prose', 'active', '{"parent":"privacy"}'::jsonb),
  ('component', 'prose-terms', null, 'prose', 'active', '{"parent":"terms"}'::jsonb),
  ('component', 'prose-data', null, 'prose', 'active', '{"parent":"data"}'::jsonb),
  ('component', 'prose-about', null, 'prose', 'active', '{"parent":"about"}'::jsonb),

  -- buttons
  ('button', 'settings-save', null, 'settings-save', 'active', '{"parent":"settings-form"}'::jsonb),
  ('button', 'velouri-refresh', null, 'velouri-refresh', 'active', '{"parent":"contact-sheet","runsCron":"velouri-gallery"}'::jsonb),
  ('button', 'resolution-sd', null, 'resolution-sd', 'active', '{"parent":"resolution"}'::jsonb),
  ('button', 'resolution-hd', null, 'resolution-hd', 'active', '{"parent":"resolution"}'::jsonb),
  ('button', 'resolution-max', null, 'resolution-max', 'active', '{"parent":"resolution"}'::jsonb),
  ('button', 'login-submit', null, 'login-submit', 'active', '{"parent":"auth-form"}'::jsonb),
  ('button', 'filter-landscape', null, 'filter-landscape', 'active', '{"parent":"filter-chips"}'::jsonb),
  ('button', 'filter-portrait', null, 'filter-portrait', 'active', '{"parent":"filter-chips"}'::jsonb),
  ('button', 'filter-architecture', null, 'filter-architecture', 'active', '{"parent":"filter-chips"}'::jsonb),
  ('button', 'filter-nature', null, 'filter-nature', 'active', '{"parent":"filter-chips"}'::jsonb),
  ('button', 'filter-studio', null, 'filter-studio', 'active', '{"parent":"filter-chips"}'::jsonb),

  -- design preset
  ('design_preset', 'chamber-gelatin', null, 'Chamber Gelatin', 'active', '{"chamber":"#2C2A28","gelatin":"#C4B8A5","mercury":"#6E8B9A","tungsten":"#C9A06A","well":"#141312","specular":"#F3EDE3"}'::jsonb),

  -- storage key
  ('storage_key', 'agna.settings.v1', null, 'agna.settings.v1', 'active', '{}'::jsonb),

  -- features
  ('feature', 'federated-search', null, 'federated-search', 'active', '{}'::jsonb),
  ('feature', 'gallery-cache', null, 'gallery-cache', 'active', '{}'::jsonb),
  ('feature', 'velouri-stage', null, 'velouri-stage', 'active', '{}'::jsonb),
  ('feature', 'settings', null, 'settings', 'active', '{}'::jsonb),

  -- functions
  ('function', 'reshape', null, 'reshape', 'active', '{}'::jsonb),
  ('function', 'search', null, 'search', 'active', '{}'::jsonb),
  ('function', 'gallery', null, 'gallery', 'active', '{}'::jsonb),
  ('function', 'cron', null, 'cron', 'active', '{}'::jsonb),
  ('function', 'mcp', null, 'mcp', 'active', '{}'::jsonb),

  -- docs
  ('doc', 'DATA', null, 'DATA', 'active', '{}'::jsonb),
  ('doc', 'SPINE', null, 'SPINE', 'active', '{}'::jsonb),
  ('doc', 'PROMOTION', null, 'PROMOTION', 'active', '{}'::jsonb)

on conflict (entity_kind, entity_key) do nothing;
