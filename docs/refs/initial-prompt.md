Build Aoumai + Velouri

Aoumai is the product and API. Velouri is the companion stage.

Hosts

SUPABASE_URL=https://wieldveraqrbygapidlo.supabase.co
SUPABASE_PROJECT_REF=wieldveraqrbygapidlo
API_ORIGIN=https://wieldveraqrbygapidlo.supabase.co/functions/v1/aoumai
SITE_ORIGIN=https://aoumai.com
API_PUBLIC=https://api.aoumai.com

Until DNS for aoumai.com exists, run the API at API_ORIGIN and the SPA on Cloudflare Pages or a worker. Do not call any other Supabase project.

Client env:

VITE_AOUMAI_API=https://api.aoumai.com
VITE_AOUMAI_ORIGIN=https://wieldveraqrbygapidlo.supabase.co/functions/v1/aoumai
VITE_SUPABASE_URL=https://wieldveraqrbygapidlo.supabase.co
VITE_SUPABASE_ANON_KEY=
VITE_VELOURI_PFP=

Edge env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PUBLIC_HOST. Optional: UNSPLASH_ACCESS_KEY, PEXELS_API_KEY.

Product

Aoumai — search, cached gallery, crons, REST + MCP.

Velouri — 3D stage + the same gallery. Same settings. Same API.

Settings — API, origin, Supabase URL, Velouri portrait.

UI: Home, Velouri, Plugins, Docs, Settings. Neutral product copy.

Sources are general stock/photo APIs only: Unsplash, Pexels, Openverse, Wikimedia Commons. Prefer each host’s highest content filter when the API offers one (content_filter=high on Unsplash). Drop rows that the source marks as rejected or restricted. Do not add other media hosts without an explicit ask.

Layout

workers/aoumai/ or supabase/functions/aoumai
src/index.ts
src/router.ts
src/reshape.ts
src/sources.ts
src/store.ts
src/mcp.ts
wrangler.jsonc api.aoumai.com/_ when DNS exists
cron 0 _/6 \* \* _
sites/www/
public/\_redirects /_ /index.html 200
src/App.tsx
src/lib/settings.ts
src/lib/aoumaiApi.ts
src/components/VelouriStage.tsx
src/pages/{Home,Velouri,Plugins,Docs,Settings,Login}.tsx

GET /v1 returns { "service": "aoumai" }.

Settings

localStorage key aoumai.settings.v1:

{
apiBase: string;
originBase: string;
supabaseUrl: string;
velouriPfp: string;
}

Defaults from the VITE\_\* env vars. /settings and /profile are the same page. Save dispatches aoumai-settings. Empty API → tell the user to set Settings or env.

API

Method

Path

Behavior

GET

/ or /v1

{ service: "aoumai" }

GET/POST

/v1/search

reshape + federate. q, sources, limit<=50

GET

/v1/gallery

cache. empty auto-seeds. ?refresh=1 ?filter= ?limit=

GET

/v1/gallery/:filter

one lane. Must 200.

GET

/v1/filters

default filters

GET

/v1/sources

source ids

GET/POST

/v1/cron

list / upsert

GET

/v1/cron/:id

one cron

POST

/v1/cron/:id/run

run now

GET/POST

/mcp

initialize, tools/list, tools/call, ping

MCP tools: search gallery list_filters list_sources list_crons upsert_cron run_cron.

Defaults:

filters: landscape portrait architecture nature studio

sources: unsplash pexels openverse wikimedia

crons: gallery-default every 6 hours, velouri-gallery hourly

Reshape examples: landscape → landscape scenery horizon; portrait → portrait face studio; architecture → architecture building interior; nature → nature forest ocean; studio → studio product still_life. Other tokens pass through.

Item:

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

kind: image | video | page. Video only from Wikimedia when the file is a normal clip.

Sources

Server-side only:

Unsplash GET https://api.unsplash.com/search/photos?query=&per_page=&content_filter=high

Pexels GET https://api.pexels.com/v1/search?query=&per_page=

Openverse GET https://api.openverse.org/v1/images/?q=&page_size=

Wikimedia Commons MediaWiki action=query&generator=search with imageinfo urls

Store

On wieldveraqrbygapidlo:

public.aoumai_items

public.aoumai_crons

public.aoumai_cron_runs

Local without a service role may use memory.

SPA

Routes: / /velouri /plugins /docs /settings /profile /login /privacy /terms /data /about.

Home introduces Aoumai. Velouri is stage on the right, gallery on the left, five filter chips, refresh runs velouri-gallery.

VelouriStage: React Three Fiber, transparent canvas, no card or floor, simple figure or plate, pointer orbit, resolution sd | hd | max, portrait from settings or VITE_VELOURI_PFP. If that URL is empty, use a geometric placeholder.

Auth: Supabase on https://wieldveraqrbygapidlo.supabase.co. No password compiled into the client.

Acceptance

API=https://wieldveraqrbygapidlo.supabase.co/functions/v1/aoumai

curl -s "$API/v1"
curl -s "$API/v1/search?q=forest"
curl -s "$API/v1/gallery?filter=nature"
curl -s "$API/v1/gallery/nature"
curl -s "$API/v1/sources"

Visible brand strings are Aoumai and Velouri only.

Keys

SUPABASE_URL=https://wieldveraqrbygapidlo.supabase.co
API_ORIGIN=https://wieldveraqrbygapidlo.supabase.co/functions/v1/aoumai
SITE_ORIGIN=https://aoumai.com
API_PUBLIC=https://api.aoumai.com
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
UNSPLASH_ACCESS_KEY=
PEXELS_API_KEY=
VITE_VELOURI_PFP=
