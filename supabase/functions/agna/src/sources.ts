// sources.ts — the four federated stock/photo sources. Server-side only;
// keys never reach the client. Unsplash and Pexels skip with a logged miss
// when their env keys are empty. Openverse and Wikimedia always run.

import type { AgnaItem } from "./store.ts";

export const SOURCE_IDS = ["unsplash", "pexels", "openverse", "wikimedia"] as const;
export type SourceId = (typeof SOURCE_IDS)[number];

export interface SourceEnv {
  UNSPLASH_ACCESS_KEY?: string;
  PEXELS_API_KEY?: string;
}

export interface SourceQuery {
  query: string;
  filterKey: string;
  limit: number;
}

const FETCH_TIMEOUT_MS = 10_000;

async function safeFetchJson(url: string, init?: RequestInit): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Unsplash
// ---------------------------------------------------------------------------

async function searchUnsplash(
  env: SourceEnv,
  { query, filterKey, limit }: SourceQuery,
): Promise<AgnaItem[]> {
  if (!env.UNSPLASH_ACCESS_KEY) {
    console.log("[sources] unsplash skipped: UNSPLASH_ACCESS_KEY not set");
    return [];
  }
  const url =
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}` +
    `&per_page=${limit}&content_filter=high`;
  const data = (await safeFetchJson(url, {
    headers: { Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}` },
  })) as { results?: Array<Record<string, unknown>> } | null;
  if (!data?.results) return [];
  return data.results
    .filter((r) => !(r as Record<string, unknown>).errors)
    .map((r) => {
      const urls = (r.urls ?? {}) as Record<string, string>;
      const user = (r.user ?? {}) as Record<string, unknown>;
      return {
        id: `unsplash:${r.id}`,
        source: "unsplash",
        kind: "image",
        title: (r.description as string) || (r.alt_description as string) || String(user.name ?? ""),
        url: urls.full || urls.regular || "",
        thumb: urls.small || urls.thumb || "",
        tags: [filterKey],
        filter_key: filterKey,
        payload: r,
      } satisfies AgnaItem;
    });
}

// ---------------------------------------------------------------------------
// Pexels
// ---------------------------------------------------------------------------

async function searchPexels(
  env: SourceEnv,
  { query, filterKey, limit }: SourceQuery,
): Promise<AgnaItem[]> {
  if (!env.PEXELS_API_KEY) {
    console.log("[sources] pexels skipped: PEXELS_API_KEY not set");
    return [];
  }
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${limit}`;
  const data = (await safeFetchJson(url, {
    headers: { Authorization: env.PEXELS_API_KEY },
  })) as { photos?: Array<Record<string, unknown>> } | null;
  if (!data?.photos) return [];
  return data.photos.map((p) => {
    const src = (p.src ?? {}) as Record<string, string>;
    return {
      id: `pexels:${p.id}`,
      source: "pexels",
      kind: "image",
      title: String(p.alt ?? ""),
      url: src.original || src.large2x || "",
      thumb: src.medium || src.small || "",
      tags: [filterKey],
      filter_key: filterKey,
      payload: p,
    } satisfies AgnaItem;
  });
}

// ---------------------------------------------------------------------------
// Openverse
// ---------------------------------------------------------------------------

async function searchOpenverse({ query, filterKey, limit }: SourceQuery): Promise<AgnaItem[]> {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=${limit}`;
  const data = (await safeFetchJson(url)) as { results?: Array<Record<string, unknown>> } | null;
  if (!data?.results) return [];
  return data.results
    .filter((r) => !r.mature)
    .map((r) => ({
      id: `openverse:${r.id}`,
      source: "openverse",
      kind: "image",
      title: String(r.title ?? ""),
      url: String(r.url ?? ""),
      thumb: String(r.thumbnail ?? r.url ?? ""),
      tags: [filterKey],
      filter_key: filterKey,
      payload: r,
    } satisfies AgnaItem));
}

// ---------------------------------------------------------------------------
// Wikimedia Commons
// ---------------------------------------------------------------------------

const VIDEO_EXTENSIONS = [".webm", ".ogv", ".mp4"];

function isNormalClip(url: string): boolean {
  const lower = url.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

async function searchWikimedia({ query, filterKey, limit }: SourceQuery): Promise<AgnaItem[]> {
  const url =
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*` +
    `&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=${limit}` +
    `&gsrnamespace=6&prop=imageinfo&iiprop=url|mime|extmetadata`;
  const data = (await safeFetchJson(url)) as
    | { query?: { pages?: Record<string, Record<string, unknown>> } }
    | null;
  const pages = data?.query?.pages;
  if (!pages) return [];
  const items: AgnaItem[] = [];
  for (const page of Object.values(pages)) {
    const imageinfo = (page.imageinfo as Array<Record<string, unknown>> | undefined)?.[0];
    if (!imageinfo) continue;
    const restricted = (imageinfo.extmetadata as Record<string, unknown> | undefined)?.[
      "Restrictions"
    ] as { value?: string } | undefined;
    if (restricted?.value) continue;
    const fileUrl = String(imageinfo.url ?? "");
    const mime = String(imageinfo.mime ?? "");
    const isVideo = mime.startsWith("video/") && isNormalClip(fileUrl);
    if (mime.startsWith("video/") && !isVideo) continue; // odd video container, skip
    items.push({
      id: `wikimedia:${page.pageid}`,
      source: "wikimedia",
      kind: isVideo ? "video" : "image",
      title: String(page.title ?? ""),
      url: fileUrl,
      thumb: fileUrl,
      tags: [filterKey],
      filter_key: filterKey,
      payload: page,
    });
  }
  return items;
}

// ---------------------------------------------------------------------------
// Federation entry point
// ---------------------------------------------------------------------------

export async function searchSource(
  source: SourceId,
  env: SourceEnv,
  q: SourceQuery,
): Promise<AgnaItem[]> {
  switch (source) {
    case "unsplash":
      return searchUnsplash(env, q);
    case "pexels":
      return searchPexels(env, q);
    case "openverse":
      return searchOpenverse(q);
    case "wikimedia":
      return searchWikimedia(q);
    default: {
      const _exhaustive: never = source;
      return _exhaustive;
    }
  }
}

export async function searchSources(
  sources: SourceId[],
  env: SourceEnv,
  q: SourceQuery,
): Promise<AgnaItem[]> {
  const results = await Promise.all(sources.map((s) => searchSource(s, env, q)));
  return results.flat();
}
