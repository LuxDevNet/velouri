// supabaseClient.ts — Supabase Auth against the agency project only. Reads
// the URL from Settings (default VITE_SUPABASE_URL, the wieldveraqrbygapidlo
// agency project) and the anon key from VITE_SUPABASE_ANON_KEY. This module
// never references the CODICE project ref or URL.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSettings, onSettingsChange } from "./settings";

const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

let cachedClient: SupabaseClient | null = null;
let cachedUrl = "";

export function getSupabaseClient(): SupabaseClient {
  const url = getSettings().supabaseUrl;
  if (!cachedClient || cachedUrl !== url) {
    cachedClient = createClient(url, anonKey);
    cachedUrl = url;
  }
  return cachedClient;
}

// Settings can change the Supabase URL at runtime (Settings page); drop the
// cached client so the next call rebuilds against the new URL.
onSettingsChange(() => {
  cachedClient = null;
});
