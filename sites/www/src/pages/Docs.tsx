// Docs.tsx — the endpoint surface with a line clip-wipe reveal.

import { useEffect, useRef } from "react";
import gsap from "gsap";

import { Viewfinder } from "../components/Viewfinder";
import { motionEnabled } from "../lib/motion";

interface EndpointRow {
  method: string;
  path: string;
  note: string;
}

const ENDPOINTS: EndpointRow[] = [
  { method: "GET", path: "/v1", note: 'Health. Returns { "service": "agna" }.' },
  { method: "GET/POST", path: "/v1/search", note: "Reshape + federate. q, sources (csv), limit<=50." },
  { method: "GET", path: "/v1/gallery", note: "Cache read. Empty auto-seeds. refresh=1 (admin key), filter=, limit=." },
  { method: "GET", path: "/v1/gallery/:filter", note: "One lane. Always 200, even when empty." },
  { method: "GET", path: "/v1/filters", note: "Default filter keys." },
  { method: "GET", path: "/v1/sources", note: "Source ids." },
  { method: "GET/POST", path: "/v1/cron", note: "List crons / upsert a cron (POST needs admin key)." },
  { method: "GET", path: "/v1/cron/:id", note: "One cron." },
  { method: "POST", path: "/v1/cron/:id/run", note: "Run now (admin key), writes agna_cron_runs." },
  { method: "GET/POST", path: "/mcp", note: "initialize, tools/list, tools/call, ping." },
];

export default function Docs() {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!motionEnabled() || !listRef.current) return;
    const rows = gsap.utils.toArray<HTMLElement>(".endpoint-row", listRef.current);
    gsap.set(rows, { clipPath: "inset(0 100% 0 0)" });
    gsap.to(rows, {
      clipPath: "inset(0 0% 0 0)",
      duration: 0.5,
      ease: "power2.out",
      stagger: 0.05,
    });
  }, []);

  return (
    <div className="scene docs-scene">
      <Viewfinder label="AGNA // DOCS" />
      <h1 className="page-title">Docs</h1>
      <p className="page-lede">The full surface of the agna edge function.</p>
      <div className="endpoint-list" ref={listRef}>
        {ENDPOINTS.map((endpoint) => (
          <div className="endpoint-row" key={endpoint.path + endpoint.method}>
            <span className="mono endpoint-method">{endpoint.method}</span>
            <span className="mono endpoint-path">{endpoint.path}</span>
            <span className="endpoint-note">{endpoint.note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
