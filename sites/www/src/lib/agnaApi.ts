// agnaApi.ts — thin fetch client for the agna edge function.
//
// Base URL precedence (fixed in the rename/security pass — Settings' "API
// base" field was previously dead; only originBase was ever read):
//
//   settings.apiBase  (public custom domain, e.g. the agna.agnamo.com worker
//                       once it proxies /v1/* and /mcp)
//     || settings.originBase  (the raw Supabase function origin — default
//                                VITE_AGNA_ORIGIN; always works, CORS-open)
//     || ""  (hasApiOrigin() reports false; callers tell the user to set
//              Settings or env)
//
// Always re-reads settings.getSettings() per call (no stale module-level
// cache) so a Settings save takes effect immediately.
//
// This module never references the CODICE project. It only ever talks to
// whatever origin the user's Settings (or env) point at.

import { getSettings } from "./settings";

export interface AgnaItem {
  id: string;
  source: "unsplash" | "pexels" | "openverse" | "wikimedia";
  kind: "image" | "video" | "page";
  title: string;
  url: string;
  thumb: string;
  tags: string[];
  filter_key: string;
  payload: Record<string, unknown>;
}

export interface AgnaCron {
  id: string;
  schedule: string;
  query: string;
  filter_key: string;
  enabled: boolean;
  last_run_at: string | null;
  meta: Record<string, unknown>;
}

export class AgnaApiError extends Error {}

function baseUrl(): string {
  const { apiBase, originBase } = getSettings();
  return (apiBase || originBase || "").replace(/\/+$/, "");
}

export function hasApiOrigin(): boolean {
  return Boolean(baseUrl());
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = baseUrl();
  if (!base) {
    throw new AgnaApiError(
      "Agna API origin is not set. Open Settings and set the API base or origin, or set VITE_AGNA_API / VITE_AGNA_ORIGIN.",
    );
  }
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new AgnaApiError(`agnaApi ${path} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export const agnaApi = {
  health(): Promise<{ service: string }> {
    return request("/v1");
  },
  search(q: string, opts?: { sources?: string; limit?: number }): Promise<{ items: AgnaItem[] }> {
    const params = new URLSearchParams({ q });
    if (opts?.sources) params.set("sources", opts.sources);
    if (opts?.limit) params.set("limit", String(opts.limit));
    return request(`/v1/search?${params.toString()}`);
  },
  gallery(opts?: { filter?: string; limit?: number; refresh?: boolean }): Promise<{ items: AgnaItem[] }> {
    const params = new URLSearchParams();
    if (opts?.filter) params.set("filter", opts.filter);
    if (opts?.limit) params.set("limit", String(opts.limit));
    if (opts?.refresh) params.set("refresh", "1");
    const qs = params.toString();
    return request(`/v1/gallery${qs ? `?${qs}` : ""}`);
  },
  galleryLane(filter: string, limit?: number): Promise<{ items: AgnaItem[] }> {
    const qs = limit ? `?limit=${limit}` : "";
    return request(`/v1/gallery/${encodeURIComponent(filter)}${qs}`);
  },
  filters(): Promise<{ filters: string[] }> {
    return request("/v1/filters");
  },
  sources(): Promise<{ sources: string[] }> {
    return request("/v1/sources");
  },
  listCrons(): Promise<{ crons: AgnaCron[] }> {
    return request("/v1/cron");
  },
  getCron(id: string): Promise<{ cron: AgnaCron }> {
    return request(`/v1/cron/${encodeURIComponent(id)}`);
  },
  runCron(id: string): Promise<{ ok: boolean; run: unknown; error?: string }> {
    return request(`/v1/cron/${encodeURIComponent(id)}/run`, { method: "POST" });
  },
};
