// settings.ts — the client settings document. Not a table: this is
// localStorage key agna.settings.v1, per the plan's "Client document"
// section. /settings and /profile render the same page against this module.

export interface AgnaSettings {
  apiBase: string;
  originBase: string;
  supabaseUrl: string;
  velouriPfp: string;
}

export const SETTINGS_STORAGE_KEY = "agna.settings.v1";
export const SETTINGS_EVENT = "agna-settings";

function readEnv(key: keyof ImportMetaEnv): string {
  return (import.meta.env[key] as string | undefined) ?? "";
}

function defaults(): AgnaSettings {
  return {
    apiBase: readEnv("VITE_AGNA_API") || "https://agna.agnamo.com",
    originBase: readEnv("VITE_AGNA_ORIGIN"),
    supabaseUrl: readEnv("VITE_SUPABASE_URL") || "https://wieldveraqrbygapidlo.supabase.co",
    velouriPfp: readEnv("VITE_VELOURI_PFP"),
  };
}

export function getSettings(): AgnaSettings {
  const base = defaults();
  if (typeof window === "undefined" || !window.localStorage) return base;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<AgnaSettings>;
    return { ...base, ...parsed };
  } catch {
    return base;
  }
}

export function saveSettings(next: AgnaSettings): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent<AgnaSettings>(SETTINGS_EVENT, { detail: next }));
}

export function onSettingsChange(handler: (settings: AgnaSettings) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<AgnaSettings>).detail;
    handler(detail ?? getSettings());
  };
  window.addEventListener(SETTINGS_EVENT, listener);
  return () => window.removeEventListener(SETTINGS_EVENT, listener);
}
