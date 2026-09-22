import { useEffect, useState } from "react";

import { isVelouriHost } from "../lib/host";

// The shared Agnamo cross-app header, ported from agnamo.com's own public/app.js
// (renderTopNav) + public/styles.css (.topbar rules) — same pattern used by the
// `flow` app in canvas-two. This app shows its own brand ("Agna" on
// agna.agnamo.com, "Velouri" on velouri.agnamo.com) instead of "Agnamo", and
// filters both of its own slugs out of the tile list it renders.

interface Tile {
  slug: string;
  name: string;
  url: string;
  metadata?: { nav_label?: string };
}

const UTILITY_LINKS = [
  { href: "https://agnamo.com/downloads", label: "Downloads" },
  { href: "https://agnamo.com/connections", label: "Connections" },
];

// Fallback list (same apps as agnamo.com's live /api/tiles, minus this app's
// own two tiles) in case the cross-origin fetch fails — keeps the header
// usable even if agnamo.com is briefly unreachable. Registering `agna` and
// `velouri` themselves on the live agnamo.com hub is an out-of-repo step —
// see workers/README.md.
const FALLBACK_TILES: Tile[] = [
  { slug: "supadash", name: "Supadash", url: "https://dash.agnamo.com" },
  { slug: "control-tower", name: "Tower", url: "https://tower.agnamo.com" },
  { slug: "lux-chat", name: "Lux Chat", url: "https://chat.luxdeploy.com" },
  { slug: "comet-clip", name: "Anti Data", url: "https://float.agnamo.com" },
  { slug: "youbuilder", name: "youBuilder", url: "https://you.agnamo.com" },
  { slug: "flow", name: "Flow", url: "https://flow.agnamo.com" },
];

function ownSlug(): "agna" | "velouri" {
  return isVelouriHost() ? "velouri" : "agna";
}

export default function AgnamoHeader() {
  const [tiles, setTiles] = useState<Tile[]>(FALLBACK_TILES);
  const self = ownSlug();
  const brand = self === "velouri" ? "Velouri" : "Agna";

  useEffect(() => {
    fetch("https://agnamo.com/api/tiles")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        const list = (data.tiles as Tile[]).filter((t) => t.slug !== "agna" && t.slug !== "velouri" && t.slug !== "agnamo");
        if (list.length) setTiles(list);
      })
      .catch(() => {
        /* keep FALLBACK_TILES */
      });
  }, []);

  return (
    <header className="agn-topbar">
      <div className="agn-topbar-inner">
        <a className="agn-brand" href="https://agnamo.com" aria-label="Agnamo home">
          {brand}
        </a>
        <nav className="agn-topbar-nav" aria-label="Agnamo products">
          <ul className="agn-nav-links agn-nav-links-apps">
            {tiles.map((t) => (
              <li key={t.slug}>
                <a href={t.url} target="_blank" rel="noopener noreferrer">
                  {t.metadata?.nav_label ?? t.name}
                </a>
              </li>
            ))}
          </ul>
          <span className="agn-nav-divider" aria-hidden="true">|</span>
          <ul className="agn-nav-links agn-nav-links-utility">
            {UTILITY_LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} target="_blank" rel="noopener noreferrer" className="agn-nav-utility">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
