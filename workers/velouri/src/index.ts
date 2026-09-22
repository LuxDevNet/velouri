// workers/velouri/src/index.ts — serves the shared SPA (sites/www/dist) at
// velouri.agnamo.com.
//
// With static assets, Cloudflare serves a matching file before the Worker
// unless assets.run_worker_first is set. "/" is index.html, so without that
// flag this script never runs and the host returns HTTP 200 with
// <title>Agna</title>. The flag lets "/" redirect onto the Velouri stage,
// and every HTML response is retitled so the shell is Velouri, not Agna.
// The agna worker is unchanged and keeps the Agna title.

export interface Env {
  ASSETS: Fetcher;
}

const VELOURI_TITLE = "Velouri";
const VELOURI_DESCRIPTION =
  "Velouri — the companion stage that renders the Agna gallery in three dimensions.";

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/") {
      return Response.redirect(new URL("/velouri", url).toString(), 302);
    }

    const asset = await env.ASSETS.fetch(req);
    return brandHtml(asset);
  },
};

function brandHtml(res: Response): Response {
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) return res;
  return new HTMLRewriter()
    .on("title", {
      element(element) {
        element.setInnerContent(VELOURI_TITLE);
      },
    })
    .on('meta[name="description"]', {
      element(element) {
        element.setAttribute("content", VELOURI_DESCRIPTION);
      },
    })
    .transform(res);
}
