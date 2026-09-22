# Agna — Spine

Every key seeded into `public.agna_spine` (agency `wieldveraqrbygapidlo`) is drafted to be
copied verbatim into `spine.agna` on CODICE (`rktwcqzmwkitjwnvtusc`) at W8 — **not yet
applied to either project**. 103 rows total. One app, key `agna`. Velouri is a page of that
app, not a second spine. `_source_ref` on every CODICE row would be `wieldveraqrbygapidlo`.

This doc was renamed from `aoumai`/`spine.aoumai` in the Agna rename pass. Neither the old
nor the new spine registration has ever been applied to CODICE, so this was a plain rename,
not a promotion-review bump — see `docs/PROMOTION.md`.

## app (1)

- `agna` — Agna, status `active`

## model (6)

| key | title | ref |
| --- | --- | --- |
| `item` | AgnaItem | table `agna_items` |
| `cron` | AgnaCron | table `agna_crons` |
| `cron_run` | AgnaCronRun | table `agna_cron_runs` |
| `spine_entity` | AgnaSpineEntity | table `agna_spine` |
| `release` | AgnaRelease | table `agna_releases` |
| `settings` | SettingsDocument | storage `agna.settings.v1` |

## agent (3)

| key | status | meta |
| --- | --- | --- |
| `gallery-default` | `scheduled` | schedule `0 */6 * * *`, writes `agna_items` |
| `velouri-gallery` | `scheduled` | schedule `0 * * * *`, writes `agna_items` |
| `agna-mcp` | `active` | tools: search, gallery, list_filters, list_sources, list_crons, upsert_cron, run_cron; no direct table writes of its own |

## page (11) / route (11)

| page key | route | status |
| --- | --- | --- |
| `home` | `/` | active |
| `velouri` | `/velouri` | active |
| `plugins` | `/plugins` | active |
| `docs` | `/docs` | active |
| `settings` | `/settings` | active |
| `profile` | `/profile` | alias of settings |
| `login` | `/login` | active |
| `privacy` | `/privacy` | active |
| `terms` | `/terms` | active |
| `data` | `/data` | active |
| `about` | `/about` | active |

Each `page` row's `meta.parent` is `agna`. Each `route` row's `meta.parent` is the matching
page key.

## endpoint (11)

`get-root`, `get-v1`, `search` (GET/POST), `gallery`, `gallery-filter`, `filters`, `sources`,
`cron-collection` (GET/POST), `cron-one`, `cron-run`, `mcp` (GET/POST).

## source (4)

`unsplash`, `pexels`, `openverse`, `wikimedia`.

## filter (5)

`landscape`, `portrait`, `architecture`, `nature`, `studio` — `meta.query` holds the reshape
expansion.

## mcp_tool (7)

`search`, `gallery`, `list_filters`, `list_sources`, `list_crons`, `upsert_cron`, `run_cron`.

## navigation_item (5)

`home`, `velouri`, `plugins`, `docs`, `settings` — ordered 1-5.

## component (14)

| page | components |
| --- | --- |
| home | `viewfinder`, `hero` |
| velouri | `contact-sheet`, `filter-chips`, `stage`, `resolution` |
| plugins | `source-grid` |
| docs | `endpoint-list` |
| settings | `settings-form` |
| login | `auth-form` |
| privacy | `prose-privacy` |
| terms | `prose-terms` |
| data | `prose-data` |
| about | `prose-about` |

Each component's `meta.parent` is its page key.

## button (11)

`settings-save`, `velouri-refresh` (runs cron `velouri-gallery`), `resolution-sd`,
`resolution-hd`, `resolution-max`, `login-submit`, `filter-landscape`, `filter-portrait`,
`filter-architecture`, `filter-nature`, `filter-studio`. Each button's `meta.parent` is its
component key.

## design_preset (1)

`chamber-gelatin` — `meta` holds the six hex tokens (chamber, gelatin, mercury, tungsten,
well, specular).

## storage_key (1)

`agna.settings.v1`.

## feature (4)

`federated-search`, `gallery-cache`, `velouri-stage`, `settings`.

## function (5)

`reshape`, `search`, `gallery`, `cron`, `mcp`.

## doc (3)

`DATA`, `SPINE`, `PROMOTION`.

---

`meta.parent` is the only hierarchy field: it links a page to app `agna`, a component to its
page, and a button to its component. No extra edge table.

## CODICE mirror (draft — not applied)

- `spine.agna` — same columns as `spine.pool` (`_source_ref`, `_ingested_at`, `entity_kind`,
  `entity_key`, `entity_ref`, `title`, `status`, `meta`). RLS on, `service_role`-only write
  policy, no anon write policy. Indexed on `entity_ref`, `entity_kind`, gin(`meta`).
- `spine.source_project` row `agna`: descriptor "federated gallery API and Velouri stage",
  `source_ref = wieldveraqrbygapidlo`, `source_schema = public`, `has_live_data = true`,
  `table_count = 5`.
- `spine.glossary` — new rows `model`, `endpoint`, `source`, `filter`, `mcp_tool` with
  `first_spine = agna`. Existing kinds `app`, `page`, `route`, `component`, `button`,
  `navigation_item`, `agent`, `design_preset`, `storage_key`, `feature`, `function`, `doc` get
  `agna` appended to `used_by`.
- `spine.v_spine` — extends the six-way union (`agnamo`, `mako`, `agentops`, `pool`,
  `youbuilder`, plus this project) to seven branches, replacing the never-applied `aoumai`
  branch with `agna`.
- Verify (once applied): `select count(*) from spine.v_spine where spine = 'agna'` = 103.
  `public.agents` and `public.models` on CODICE (the unrelated six-item demo picker) are not
  touched.
