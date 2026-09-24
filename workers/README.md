# Agna + Velouri — Cloudflare Workers

Two workers, both serving the one `sites/www` SPA build, on two custom domains:

- **`workers/agna`** → `agna.agnamo.com` — the main app. Also proxies `/v1/*` and
  `/mcp` to the Supabase function origin, so the public domain works as
  `settings.apiBase` out of the box (no CORS hop needed for same-origin calls).
- **`workers/velouri`** → `velouri.agnamo.com` — the same build, redirecting `/` to
  `/velouri` so the domain lands directly on the stage.

Config pattern ported from `canvas-two/wrangler.jsonc` (the `flow` worker): Cloudflare
Workers **assets** mode (`assets.directory` + `not_found_handling:
"single-page-application"`) with a `custom_domain` route.

## Launch steps (not run from this session — no Cloudflare credentials available)

```sh
# 1. Build the shared SPA once — both workers point at its dist/ output.
cd sites/www
npm install
npm run build

# 2. Deploy Agna (serves the SPA + proxies the API).
cd ../../workers/agna
npm install
npx wrangler deploy

# 3. Deploy Velouri (serves the SPA, redirects "/" to "/velouri").
cd ../velouri
npm install
npx wrangler deploy
```

`wrangler deploy` needs an authenticated Cloudflare account with zone access to
`agnamo.com` (for the `custom_domain: true` routes to provision DNS). Run
`npx wrangler login` first, or set `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`.

## Blockers / what this pass did not do

- **No `wrangler deploy` was run.** This session had no Cloudflare credentials, so
  both workers are configured but not live. `agna.agnamo.com` and
  `velouri.agnamo.com` do not resolve yet.
- **`AGNA_ADMIN_KEY` is not set anywhere.** Until it is (as a `wrangler secret` on
  the Supabase function, not on these workers — the workers never see it), the
  cron write / gallery refresh / MCP mutation gate in
  `supabase/functions/agna/src/router.ts` is unenforced. See `docs/DATA.md`
  "Write-path auth" and `TODO.md`'s security note.
