/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AGNA_API: string;
  readonly VITE_AGNA_ORIGIN: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_VELOURI_PFP: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
