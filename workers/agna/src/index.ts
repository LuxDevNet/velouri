// workers/agna/src/index.ts — serves the built SPA (sites/www/dist) as
// static assets, and proxies /v1/* + /mcp to the Supabase edge function so
// the public domain (agna.agnamo.com) is a single origin for both the app
// and its API. This is what makes settings.apiBase = "https://agna.agnamo.com"
// (the default) actually work — see sites/www/src/lib/agnaApi.ts.
//
// AGNA_ADMIN_KEY is intentionally NOT read or injected here — the shared
// secret is a caller-supplied header (X-Agna-Admin-Key), passed through
// unchanged. This worker does not hold the admin key.

export interface Env {
  ASSETS: Fetcher;
  AGNA_FUNCTION_ORIGIN?: string;
}

const DEFAULT_FUNCTION_ORIGIN = "https://wieldveraqrbygapidlo.supabase.co/functions/v1/agna";
const PROXIED_PREFIXES = ["/v1", "/mcp"];

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const shouldProxy = PROXIED_PREFIXES.some(
      (prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
    );

    if (shouldProxy) {
      const origin = env.AGNA_FUNCTION_ORIGIN || DEFAULT_FUNCTION_ORIGIN;
      const target = new URL(url.pathname + url.search, origin);
      const proxied = new Request(target.toString(), req);
      return fetch(proxied);
    }

    return env.ASSETS.fetch(req);
  },
};
