# Agna + Velouri

**Agna** is the product and API: a federated stock-photo search service (Unsplash,
Pexels, Openverse, Wikimedia Commons) with a cached gallery, crons, a REST surface,
and an MCP surface. **Velouri** is its companion stage — the same cached gallery,
rendered in three dimensions (React Three Fiber), with an orbiting plate.

Renamed from `aoumai` → `agna` in this pass. Velouri's name is unchanged. See
`docs/build-prompt.md` for the full contract and `TODO.md` for wave status and the
current security note (read before deploying).

## Layout

- `sites/www/` — the Vite + React SPA (routes: Home, Velouri, Plugins, Docs,
  Settings/Profile, Login, Privacy, Terms, Data, About).
- `supabase/functions/agna/` — the Deno edge function (REST + MCP).
- `supabase/migrations/` — agency (`wieldveraqrbygapidlo`) table DDL.
- `supabase/codice/` — draft CODICE spine registration (not yet applied).
- `workers/agna/`, `workers/velouri/` — Cloudflare Worker configs that serve the
  SPA at `agna.agnamo.com` and `velouri.agnamo.com`. See `workers/README.md`.
- `scripts/accept.mjs` — local acceptance check (no deploy required).
- `docs/` — `DATA.md` (schema), `SPINE.md` (catalog inventory), `PROMOTION.md`
  (the CODICE freeze/promotion rule), `build-prompt.md` (full contract copy).

## Local dev

```sh
cp .env.example .env   # fill in what you have; empty is fine for local dev
cd sites/www && npm install && npm run dev
```

With no `SUPABASE_SERVICE_ROLE_KEY`, the edge function falls back to an in-memory
store — `node scripts/accept.mjs` exercises it end to end without any deploy.

## Deploy (not done by this build — see `TODO.md` and `workers/README.md`)

1. `supabase functions deploy agna --project-ref wieldveraqrbygapidlo`
2. `cd sites/www && npm run build`
3. `cd workers/agna && npx wrangler deploy`
4. `cd workers/velouri && npx wrangler deploy`

## Security — read before any public deploy

`POST /v1/cron*`, `GET /v1/gallery?refresh=1`, and the MCP `upsert_cron`/`run_cron`
tools are gated by a shared-secret header (`X-Agna-Admin-Key` vs. env
`AGNA_ADMIN_KEY`) in `supabase/functions/agna/src/router.ts`. **This is unenforced
until `AGNA_ADMIN_KEY` is set** — set it as a Supabase function secret before
exposing either worker publicly. CORS is restricted to `PUBLIC_HOST` (default
`https://agna.agnamo.com`, `https://velouri.agnamo.com`). See `docs/DATA.md`
"Write-path auth" and `TODO.md` for the full note, including that the Velouri
refresh button currently calls `runCron` anonymously and will 401 once the key is
enforced, unless refresh is moved to a backend-admin path.
