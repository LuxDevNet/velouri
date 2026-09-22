// workers/velouri/src/index.ts — serves the same built SPA (sites/www/dist)
// as static assets, redirecting the bare "/" to "/velouri" so this domain
// lands directly on the Velouri stage instead of the Agna home page. Every
// other path (including /velouri itself, and client-side router paths like
// /docs) is served as-is via the SPA fallback.

export interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/") {
      return Response.redirect(new URL("/velouri", url).toString(), 302);
    }
    return env.ASSETS.fetch(req);
  },
};
