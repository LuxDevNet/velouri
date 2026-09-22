// Plugins.tsx — the four federated sources as a stagger-reveal grid. Live
// source ids come from GET /v1/sources with a hardcoded fallback so the
// page still renders with no API origin configured.

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

import { Viewfinder } from "../components/Viewfinder";
import { agnaApi } from "../lib/agnaApi";
import { motionEnabled } from "../lib/motion";

const DEFAULT_SOURCES = ["unsplash", "pexels", "openverse", "wikimedia"];

const SOURCE_COPY: Record<string, string> = {
  unsplash: "High-signal editorial photography. Always queried with content_filter=high.",
  pexels: "Broad stock catalogue of free-to-use photo and video.",
  openverse: "Openly licensed images indexed across the commons.",
  wikimedia: "Wikimedia Commons media — image or page kind, occasional clip.",
};

export default function Plugins() {
  const [sources, setSources] = useState<string[]>(DEFAULT_SOURCES);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    agnaApi
      .sources()
      .then((res) => {
        if (!cancelled && res.sources?.length) setSources(res.sources);
      })
      .catch(() => {
        // No API origin configured yet — keep the default source list.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!motionEnabled() || !gridRef.current) return;
    const cards = gsap.utils.toArray<HTMLElement>(".source-card", gridRef.current);
    gsap.set(cards, { opacity: 0, y: 24, filter: "brightness(0.6)" });
    gsap.to(cards, {
      opacity: 1,
      y: 0,
      filter: "brightness(1)",
      duration: 0.6,
      stagger: 0.08,
      ease: "power2.out",
    });
  }, [sources]);

  return (
    <div className="scene plugins-scene">
      <Viewfinder label="AGNA // PLUGINS" />
      <h1 className="page-title">Plugins</h1>
      <p className="page-lede">Four federated sources feed every search and every gallery lane.</p>
      <div className="source-grid" ref={gridRef}>
        {sources.map((source) => (
          <article key={source} className="source-card" data-depth="2">
            <p className="mono source-id">{source}</p>
            <p className="source-copy">{SOURCE_COPY[source] ?? "Federated source."}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
