# Day 2 plan — Agna + Velouri ready for users

Plan only. Do not deploy, migrate, change product code, or run the steps below until a later request says to execute Day 2.

Contract: `docs/refs/build-prompt.md`. Progress already checked off: `TODO.md`. If this plan and the build prompt disagree on hosts or write rules, the build prompt wins.

## Goal

A visitor can use both sites by end of day. Photos persist in Postgres. Admin writes are locked.

## Done when

- `https://agna.agnamo.com` loads Home, search, gallery, plugins, docs, and settings.
- `https://velouri.agnamo.com` redirects `/` to `/velouri`. The contact sheet and stage show real images.
- Gallery rows survive a function restart. They live in Postgres on `wieldveraqrbygapidlo`, not the in-memory store.
- `POST /v1/cron`, `POST /v1/cron/:id/run`, `GET /v1/gallery?refresh=1`, and MCP `upsert_cron` / `run_cron` return 401 without `X-Agna-Admin-Key`.

## Already built

Leave this code in place. Day 2 ships it.

- `supabase/functions/agna/` — REST, MCP, four sources, gallery, crons.
- `sites/www/` — Home, Velouri, Plugins, Docs, Settings/Profile, Login, Privacy, Terms, Data, About.
- `supabase/migrations/20260922020000_agna_store.sql` — written, not applied.
- `workers/agna` and `workers/velouri` — configured, not deployed.
- `node scripts/accept.mjs` — passes against the in-memory store.

## Hosts

```
SUPABASE_URL=https://wieldveraqrbygapidlo.supabase.co
SUPABASE_PROJECT_REF=wieldveraqrbygapidlo
API_ORIGIN=https://wieldveraqrbygapidlo.supabase.co/functions/v1/agna
SITE_ORIGIN=https://agna.agnamo.com
API_PUBLIC=https://agna.agnamo.com
PUBLIC_HOST=https://agna.agnamo.com,https://velouri.agnamo.com
```

Client build env, names only:

```
VITE_AGNA_API=https://agna.agnamo.com
VITE_AGNA_ORIGIN=https://wieldveraqrbygapidlo.supabase.co/functions/v1/agna
VITE_SUPABASE_URL=https://wieldveraqrbygapidlo.supabase.co
VITE_SUPABASE_ANON_KEY=
VITE_VELOURI_PFP=
```

Use credentials already available in the environment. Do not invent values. Do not write secrets into git. One Supabase project only: `wieldveraqrbygapidlo`.

Server secrets, when they are already available: `SUPABASE_SERVICE_ROLE_KEY`, `AGNA_ADMIN_KEY`, and optionally `UNSPLASH_ACCESS_KEY` and `PEXELS_API_KEY`. `AGNA_ADMIN_KEY` is a Supabase function secret only. Workers and the SPA do not hold it. If the Unsplash and Pexels keys are absent, ship on Openverse and Wikimedia. Do not add other media hosts.

## Order of work

### 1. Make the public build safe

- In `sites/www/src/pages/Velouri.tsx`, the refresh button calls `runCron("velouri-gallery")` with no admin key. Change it to reload `GET /v1/gallery`.
- Empty gallery still auto-seeds in `doGallery` (`supabase/functions/agna/src/router.ts`). That public seed stays.
- `?refresh=1` and cron run stay admin-only.
- Deploy the function with JWT verification off. The SPA and `workers/agna` do not send a Supabase bearer token, so default `verify_jwt` would reject every visitor. Writes stay behind `AGNA_ADMIN_KEY`. Session auth is not this day.
- Bake the client env into the Vite build. Login stays email and password for an existing user. There is no signup screen.

### 2. Database and API

1. Apply `supabase/migrations/20260922020000_agna_store.sql` to `wieldveraqrbygapidlo`.
2. Set function secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_HOST`, `AGNA_ADMIN_KEY`, plus Unsplash and Pexels when those keys exist.
3. Deploy: `supabase functions deploy agna --project-ref wieldveraqrbygapidlo --no-verify-jwt`
4. Confirm before Cloudflare: `GET /v1` returns `{ "service": "agna" }`, a gallery read returns items, and `POST /v1/cron` without the admin header is 401.

### 3. Sites

Build the SPA once. Both workers serve `sites/www/dist`.

```
cd sites/www && npm install && npm run build
cd workers/agna && npm install && npx wrangler deploy
cd workers/velouri && npm install && npx wrangler deploy
```

`custom_domain: true` in each `wrangler.jsonc` provisions `agna.agnamo.com` and `velouri.agnamo.com`. This needs a Cloudflare account with zone access to `agnamo.com`. If that zone is not on the account, stop. Do not pick a different domain.

### 4. Check the live sites

- Home search returns images.
- Velouri filters change the sheet. The stage renders. Refresh reloads the cache and does not 401.
- Settings save sticks under `agna.settings.v1`.
- Login works for an existing agency user when one is available.
- After a function restart, gallery rows are still there.
- Admin write paths 401 without the admin header.

## Not this day

- W8. Do not apply `supabase/codice/001_register_agna.sql`. Do not write CODICE. Do not freeze v1.0.0.
- Agnamo hub tiles. The header already falls back when `https://agnamo.com/api/tiles` omits this app.
- A schedule that calls `POST /v1/cron/:id/run`. First visit seeds the cache.
- Signup, `verify_jwt` cutover, and any media host beyond the four named sources.

## Write rule

Request-path writes are only `public.agna_items`, `public.agna_crons`, and `public.agna_cron_runs` on `wieldveraqrbygapidlo`. The app never opens a CODICE client.
