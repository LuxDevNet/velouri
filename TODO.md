# Agna + Velouri — Wave list

Source of truth is the plan file. This is a repo-visible copy of the wave
list for tracking progress during the build.

- [x] **W1** — Scaffold, agency `agna_*` DDL + spine seed, write guard, `GET /v1`, `docs/DATA.md`, `scripts/accept.mjs`
- [x] **W2** — `reshape` + four sources + `GET/POST /v1/search` and `/v1/sources`
- [x] **W3** — `store`, gallery cache/seed, `/v1/gallery` and `/v1/filters`
- [x] **W4** — cron CRUD/run + MCP tools — `node scripts/accept.mjs` passes end to end
      (write guard, filters, sources, search, gallery + lane, cron CRUD/run, all 7 MCP
      tools, no CODICE ref / secret leak). Agency migration is written but **not
      confirmed applied** — `wieldveraqrbygapidlo` is not reachable from this session's
      Supabase MCP connection (only `magellan`, `CODICE`, `agnamo`, `lux-chat`, `mako`,
      `BASE`, `pool` are visible). Apply
      `supabase/migrations/20260922020000_agna_store.sql` to the agency project before
      relying on Postgres-backed storage; the function runs correctly today on the
      in-memory fallback.
- [x] **W5** — Vite routes, settings v1 (`agna.settings.v1`), API client with
      apiBase→originBase→env precedence, Supabase login on agency only.
- [x] **W6** — Home/Plugins/Docs 2.5D identity + motion.
- [x] **W7** — Velouri contact sheet + R3F stage; acceptance curls.
- [ ] **W8** — Register `spine.agna`, models, agents on CODICE, then freeze v1.0.0
      (`supabase/codice/001_register_agna.sql` is written but **not applied** — no
      `agna` row exists on CODICE yet; do not apply until a human confirms CODICE
      access and reviews the seed).
- [x] **Rename pass** — Aoumai → Agna everywhere (code, docs, env keys, storage key,
      edge function path/service string, DB table names, CODICE registration draft).
      Velouri name unchanged. See `docs/build-prompt.md` for the full rename map. This
      was safe to do as a straight rename, not a promotion-review bump, because neither
      the agency migration nor the CODICE registration had been applied under the old
      `aoumai_*` names — nothing live to break. If a live deployment under the old
      names is ever discovered, follow `docs/PROMOTION.md`'s major-bump rule instead of
      re-renaming in place.
- [x] **Git init** — repo initialized, `.gitignore` added, initial commit made.
- [x] **Cloudflare workers** — `workers/agna` (serves the SPA at `agna.agnamo.com` and
      proxies `/v1/*` + `/mcp` to the Supabase function origin) and `workers/velouri`
      (serves the same SPA at `velouri.agnamo.com`, redirects `/` → `/velouri`). Neither
      has been `wrangler deploy`ed from this session — no Cloudflare credentials were
      available. See `workers/README.md` for launch steps.

## Security note (do not ship without reading)

`supabase/functions/agna/src/router.ts` gates `POST /v1/cron`, `POST /v1/cron/:id`,
`POST /v1/cron/:id/run`, `GET /v1/gallery?refresh=1`, and the MCP `upsert_cron` /
`run_cron` tools behind a shared-secret header (`X-Agna-Admin-Key`, compared to env
`AGNA_ADMIN_KEY`). **This only enforces when `AGNA_ADMIN_KEY` is set.** Set it before
any public deploy, or these write/refresh paths are open to anyone who can reach the
function. This is a stopgap, not real auth — `supabase functions deploy agna` should
also be reviewed for `verify_jwt` / gateway auth once the SPA has real sessions (see
`nitemcp/docs/ROLLOUT.md` for the staged-auth-cutover pattern this project should
eventually follow). `runCron` is currently called from the anonymous SPA (the Velouri
refresh button) — that call will 401 once `AGNA_ADMIN_KEY` is enforced in production
unless refresh is moved to a backend-admin path first.

## Out of this pass

- Actually running `wrangler deploy` (no Cloudflare account access from this session).
- Filling anon, service-role, Unsplash, Pexels, portrait URL, and admin-key secrets.
- Agency vault and `Worker aoumai-auth` (superseded — no worker-side auth built yet).
- Any media host beyond the four named sources.
- Any CODICE write — `001_register_agna.sql` is written, not applied.

## Deploy (not done by this build — user launches)

- `supabase functions deploy agna --project-ref wieldveraqrbygapidlo`
- `cd sites/www && npm install && npm run build`
- `cd workers/agna && npm install && npx wrangler deploy`
- `cd workers/velouri && npm install && npx wrangler deploy`
- Add DNS/custom domain routes for `agna.agnamo.com` and `velouri.agnamo.com` in the
  Cloudflare dashboard (or confirm `routes[].custom_domain` in each `wrangler.jsonc`
  provisions them) once the Agnamo account has zone access for `agnamo.com`.
