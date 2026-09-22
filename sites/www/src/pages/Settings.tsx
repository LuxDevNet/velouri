// Settings.tsx — rendered for both /settings and /profile (same page, per
// the plan). Writes to localStorage agna.settings.v1 only; never touches
// Postgres.

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { getSettings, saveSettings, type AgnaSettings } from "../lib/settings";

export default function Settings() {
  const [form, setForm] = useState<AgnaSettings>(getSettings());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm(getSettings());
  }, []);

  function update<K extends keyof AgnaSettings>(key: K, value: AgnaSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveSettings(form);
    setSaved(true);
  }

  const apiMissing = !form.apiBase && !form.originBase;

  return (
    <div className="scene prose-scene">
      <h1 className="page-title">Settings</h1>
      <p className="page-lede">
        Also available at /profile. Stored only in this browser under{" "}
        <span className="mono">agna.settings.v1</span>.
      </p>
      {apiMissing && (
        <p className="api-warning" role="alert">
          No API origin is set. Set an origin below, or set VITE_AGNA_API / VITE_AGNA_ORIGIN before building.
        </p>
      )}
      <form className="settings-form" onSubmit={handleSubmit}>
        <label>
          API base
          <input
            value={form.apiBase}
            onChange={(event) => update("apiBase", event.target.value)}
            placeholder="https://agna.agnamo.com"
          />
        </label>
        <label>
          Origin base
          <input
            value={form.originBase}
            onChange={(event) => update("originBase", event.target.value)}
            placeholder="https://wieldveraqrbygapidlo.supabase.co/functions/v1/agna"
          />
        </label>
        <label>
          Supabase URL
          <input
            value={form.supabaseUrl}
            onChange={(event) => update("supabaseUrl", event.target.value)}
            placeholder="https://wieldveraqrbygapidlo.supabase.co"
          />
        </label>
        <label>
          Velouri portrait URL
          <input
            value={form.velouriPfp}
            onChange={(event) => update("velouriPfp", event.target.value)}
            placeholder="Optional image URL — empty renders a geometric plate"
          />
        </label>
        <button id="settings-save" type="submit" className="btn-primary">
          Save
        </button>
        {saved && <span className="save-confirm">Saved.</span>}
      </form>
    </div>
  );
}
