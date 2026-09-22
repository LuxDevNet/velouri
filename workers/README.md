# Agna + Velouri — Cloudflare Workers

Two workers, both serving the one `sites/www` SPA build, on two custom domains:

- **`workers/agna`** → `agna.agnamo.com` — the main app. Also proxies `/v1/*` and
  `/mcp` to the Supabase function origin, so the public domain works as
  `settings.apiBase` out of the box (no CORS hop needed for same-origin calls).
- **`workers/velouri`** → `velouri.agnamo.com` — the same build. `run_worker_first`
  is required: otherwise Cloudflare serves `index.html` for `/` and the Worker
  never runs, so the host returns HTTP 200 with `<title>Agna</title>`. With the
  flag, `/` redirects to `/velouri` and HTML responses are retitled **Velouri**.

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

# 3. Deploy Velouri (redirects "/" to "/velouri" and retitles HTML to Velouri).
cd ../velouri
npm install
npx wrangler deploy
```

`wrangler deploy` needs an authenticated Cloudflare account with zone access to
`agnamo.com` (for the `custom_domain: true` routes to provision DNS). Run
`npx wrangler login` first, or set `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`.

## Blockers / what this pass did not do

- **The Velouri branding fix still needs `wrangler deploy`.** The `velouri` worker
  is already on the account and `velouri.agnamo.com` resolves, but this session
  had no Wrangler credentials (`npx wrangler whoami` was unauthenticated). Deploy
  with the commands above. Do not add a zone route `*agnamo.com/*`.
- **No tile was registered on the live `agnamo.com` hub.** The cross-app header
  (`sites/www/src/components/AgnamoHeader.tsx`, ported from
  `canvas-two/src/components/layout/AgnamoHeader.tsx`) fetches
  `https://agnamo.com/api/tiles` at runtime and falls back to a hardcoded list if
  that fetch fails or doesn't include this app. Getting `agna` and `velouri`
  tiles onto agnamo.com's actual `/api/tiles` response is owned by whichever repo
  runs the Agnamo hub itself — that repo was not found under
  `Z:\luxdev\dev\002 Tier Two Projects\` in this workspace, so it could not be
  edited from here. Whoever owns that hub needs to add two tile rows, roughly:
  `{ slug: "agna", name: "Agna", url: "https://agna.agnamo.com" }` and
  `{ slug: "velouri", name: "Velouri", url: "https://velouri.agnamo.com" }`.
- **`AGNA_ADMIN_KEY` is not set anywhere.** Until it is (as a `wrangler secret` on
  the Supabase function, not on these workers — the workers never see it), the
  cron write / gallery refresh / MCP mutation gate in
  `supabase/functions/agna/src/router.ts` is unenforced. See `docs/DATA.md`
  "Write-path auth" and `TODO.md`'s security note.
