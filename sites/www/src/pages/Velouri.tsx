// Velouri.tsx — left contact sheet with five filter chips and a refresh
// button that runs the velouri-gallery cron; right VelouriStage (R3F,
// transparent canvas, orbit, sd|hd|max). No WebGL leaks into other pages —
// this is the only page that imports VelouriStage.

import { useEffect, useState } from "react";

import { agnaApi, type AgnaItem } from "../lib/agnaApi";
import { getSettings, onSettingsChange } from "../lib/settings";
import { VelouriStage, type VelouriResolution } from "../components/VelouriStage";

const FILTERS = ["landscape", "portrait", "architecture", "nature", "studio"] as const;
type FilterKey = (typeof FILTERS)[number];

const RESOLUTIONS: VelouriResolution[] = ["sd", "hd", "max"];

export default function Velouri() {
  const [filter, setFilter] = useState<FilterKey>("portrait");
  const [items, setItems] = useState<AgnaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolution, setResolution] = useState<VelouriResolution>("hd");
  const [settings, setSettings] = useState(getSettings());

  useEffect(() => onSettingsChange(setSettings), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    agnaApi
      .galleryLane(filter, 24)
      .then((res) => {
        if (!cancelled) setItems(res.items ?? []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter]);

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      // This remains an anonymous SPA call, so it surfaces backend auth
      // errors inline.
      await agnaApi.runCron("velouri-gallery");
      const res = await agnaApi.galleryLane(filter, 24);
      setItems(res.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="velouri-layout">
      <section className="contact-sheet" aria-label="Velouri contact sheet">
        <div className="filter-chips" role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f}
              id={`filter-${f}`}
              role="tab"
              aria-selected={filter === f}
              className={`chip${filter === f ? " chip-active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <button id="velouri-refresh" className="refresh-btn" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? "Refreshing\u2026" : "Refresh (runs velouri-gallery)"}
        </button>
        {error && (
          <p className="api-error" role="alert">
            {error}
          </p>
        )}
        <div className="contact-grid">
          {loading && <p className="muted">Loading\u2026</p>}
          {!loading && items.length === 0 && !error && (
            <p className="muted">No cached items yet. Refresh to seed the gallery.</p>
          )}
          {items.map((item) => (
            <figure key={item.id} className="contact-frame">
              <img src={item.thumb || item.url} alt={item.title || item.filter_key} loading="lazy" />
              <figcaption>{item.title || item.source}</figcaption>
            </figure>
          ))}
        </div>
      </section>
      <section className="stage-panel" aria-label="Velouri stage">
        <div className="resolution-row">
          {RESOLUTIONS.map((r) => (
            <button
              key={r}
              id={`resolution-${r}`}
              className={`res-btn${resolution === r ? " res-active" : ""}`}
              onClick={() => setResolution(r)}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="stage-canvas-wrap">
          <VelouriStage pfpUrl={settings.velouriPfp || undefined} resolution={resolution} />
        </div>
      </section>
    </div>
  );
}
