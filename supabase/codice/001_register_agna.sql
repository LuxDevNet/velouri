-- CODICE registration for agna (W8, one-time, NOT YET APPLIED). Applies
-- only to CODICE (rktwcqzmwkitjwnvtusc). Never applied to the agency
-- project. After this migration, plus the agency agna_releases v1.0.0
-- frozen insert, CODICE stays frozen until a later major bump opens an
-- approved promotion review.
--
-- Renamed from 001_register_aoumai.sql in the Agna rebrand pass. That file
-- was never applied to CODICE (no `aoumai` row exists there), so this is a
-- fresh draft under the new name, not a promotion event — see
-- docs/PROMOTION.md. Do not run this against CODICE until a human confirms
-- access and reviews the seed below.

-- ---------------------------------------------------------------------------
-- spine.agna — same columns as spine.pool
-- ---------------------------------------------------------------------------
create table if not exists spine.agna (
  _source_ref text not null default 'wieldveraqrbygapidlo',
  _ingested_at timestamptz not null default now(),
  entity_kind text not null,
  entity_key text not null,
  entity_ref text null,
  title text null,
  status text null,
  meta jsonb not null default '{}'::jsonb,
  primary key (entity_kind, entity_key)
);

create index if not exists spine_agna_ref_idx on spine.agna using btree (entity_ref);
create index if not exists spine_agna_kind_idx on spine.agna using btree (entity_kind);
create index if not exists spine_agna_meta_idx on spine.agna using gin (meta);

alter table spine.agna enable row level security;

drop policy if exists spine_service_role_all on spine.agna;
create policy spine_service_role_all
  on spine.agna
  for all
  to service_role
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- spine.source_project — register the agna source project
-- ---------------------------------------------------------------------------
insert into spine.source_project
  (project_slug, descriptor, source_ref, source_schema, has_live_data, table_count, ingested_rows, ingested_at, notes)
values (
  'agna',
  'federated gallery API and Velouri stage',
  'wieldveraqrbygapidlo',
  'public',
  true,
  5,
  103,
  now(),
  'public.agna_items, agna_crons, agna_cron_runs, agna_spine, agna_releases. Request-path writes only the first three (cron writes gated by AGNA_ADMIN_KEY). Renamed from aoumai in the Agna rebrand pass — the aoumai name was never registered on CODICE. Registered once at W8, then frozen at v1.0.0; later major bumps update agency tables first and require an approved promotion review before any further CODICE write.'
)
on conflict (project_slug) do update set
  descriptor = excluded.descriptor,
  source_ref = excluded.source_ref,
  source_schema = excluded.source_schema,
  has_live_data = excluded.has_live_data,
  table_count = excluded.table_count,
  ingested_rows = excluded.ingested_rows,
  ingested_at = excluded.ingested_at,
  notes = excluded.notes;

-- ---------------------------------------------------------------------------
-- spine.glossary — new vocabulary, first spined by agna
-- ---------------------------------------------------------------------------
insert into spine.glossary (kind, description, first_spine, used_by, notes)
values
  ('model', 'A typed data shape backing a table or a client storage document.', 'agna', array['agna'], null),
  ('endpoint', 'An HTTP route exposed by an edge function.', 'agna', array['agna'], null),
  ('source', 'An external media or content provider federated by search.', 'agna', array['agna'], null),
  ('filter', 'A named search shortcut that expands into a fuller query.', 'agna', array['agna'], null),
  ('mcp_tool', 'A tool exposed over the Model Context Protocol.', 'agna', array['agna'], null)
on conflict (kind) do nothing;

-- Existing kinds this spine uses: append 'agna' to used_by, once.
update spine.glossary
set used_by = array_append(used_by, 'agna')
where kind in (
  'app', 'page', 'route', 'component', 'button', 'navigation_item',
  'agent', 'design_preset', 'storage_key', 'feature', 'function', 'doc'
)
and not ('agna' = any(used_by));

-- ---------------------------------------------------------------------------
-- spine.agna seed — explicit copy of the agency seed (no foreign
-- connection between projects). 103 rows, matching
-- supabase/migrations/20260922020000_agna_store.sql exactly.
-- ---------------------------------------------------------------------------
insert into spine.agna (entity_kind, entity_key, entity_ref, title, status, meta)
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

-- ---------------------------------------------------------------------------
-- spine.v_spine — extend the union with agna, keep existing branches
-- intact (agnamo, mako, agentops, pool, youbuilder). No `aoumai` branch
-- ever existed here, so there is nothing to drop.
-- ---------------------------------------------------------------------------
create or replace view spine.v_spine as
 SELECT 'agnamo'::text AS spine,
    agnamo.entity_kind, agnamo.entity_key, agnamo.entity_ref, agnamo.title,
    agnamo.status, agnamo.meta, agnamo._source_ref, agnamo._ingested_at
   FROM spine.agnamo
UNION ALL
 SELECT 'mako'::text AS spine,
    mako.entity_kind, mako.entity_key, mako.entity_ref, mako.title,
    mako.status, mako.meta, mako._source_ref, mako._ingested_at
   FROM spine.mako
UNION ALL
 SELECT 'agentops'::text AS spine,
    agentops.entity_kind, agentops.entity_key, agentops.entity_ref, agentops.title,
    agentops.status, agentops.meta, agentops._source_ref, agentops._ingested_at
   FROM spine.agentops
UNION ALL
 SELECT 'pool'::text AS spine,
    pool.entity_kind, pool.entity_key, pool.entity_ref, pool.title,
    pool.status, pool.meta, pool._source_ref, pool._ingested_at
   FROM spine.pool
UNION ALL
 SELECT 'youbuilder'::text AS spine,
    youbuilder.entity_kind, youbuilder.entity_key, youbuilder.entity_ref, youbuilder.title,
    youbuilder.status, youbuilder.meta, youbuilder._source_ref, youbuilder._ingested_at
   FROM spine.youbuilder
UNION ALL
 SELECT 'agna'::text AS spine,
    agna.entity_kind, agna.entity_key, agna.entity_ref, agna.title,
    agna.status, agna.meta, agna._source_ref, agna._ingested_at
   FROM spine.agna;

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------
do $$
declare
  v_count integer;
  v_models integer;
  v_agents integer;
begin
  select count(*) into v_count from spine.v_spine where spine = 'agna';
  if v_count <> 103 then
    raise exception 'spine.v_spine agna row count is %, expected 103', v_count;
  end if;

  select count(*) into v_models from spine.v_spine where spine = 'agna' and entity_kind = 'model';
  if v_models <> 6 then
    raise exception 'expected 6 agna model rows, found %', v_models;
  end if;

  select count(*) into v_agents from spine.v_spine where spine = 'agna' and entity_kind = 'agent';
  if v_agents <> 3 then
    raise exception 'expected 3 agna agent rows, found %', v_agents;
  end if;
end $$;
