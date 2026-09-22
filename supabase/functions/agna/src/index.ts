// index.ts — Deno entry point for the Supabase edge function `agna`.
// Thin wrapper: reads env, delegates to router.ts. Not deployed by this
// build pass — the user launches it.

import { route, type Env } from "./router.ts";

function readEnv(): Env {
  // Deno.env is available in the Supabase Edge Functions runtime.
  // deno-lint-ignore no-explicit-any
  const denoGlobal = (globalThis as any).Deno;
  const get = (key: string): string | undefined => denoGlobal?.env?.get?.(key);
  return {
    SUPABASE_URL: get("SUPABASE_URL"),
    SUPABASE_SERVICE_ROLE_KEY: get("SUPABASE_SERVICE_ROLE_KEY"),
    UNSPLASH_ACCESS_KEY: get("UNSPLASH_ACCESS_KEY"),
    PEXELS_API_KEY: get("PEXELS_API_KEY"),
    PUBLIC_HOST: get("PUBLIC_HOST"),
    AGNA_ADMIN_KEY: get("AGNA_ADMIN_KEY"),
  };
}

const env = readEnv();

// deno-lint-ignore no-explicit-any
const denoGlobal = (globalThis as any).Deno;
if (denoGlobal?.serve) {
  denoGlobal.serve((req: Request) => route(req, env));
}

export { route };
export default { fetch: (req: Request) => route(req, env) };
