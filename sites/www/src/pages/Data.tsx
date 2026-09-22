export default function Data() {
  return (
    <div className="scene prose-scene">
      <h1 className="page-title">Data</h1>
      <div className="prose">
        <p>
          Agna keeps five tables on one Postgres project: <span className="mono">agna_items</span>{" "}
          (gallery cache), <span className="mono">agna_crons</span>, <span className="mono">agna_cron_runs</span>,{" "}
          <span className="mono">agna_spine</span>, and <span className="mono">agna_releases</span>.
        </p>
        <p>
          The SPA and the edge function only ever write <span className="mono">agna_items</span>,{" "}
          <span className="mono">agna_crons</span>, and <span className="mono">agna_cron_runs</span>. Spine and
          release rows change only through SQL migrations, never through a request. Writes to
          the crons table and cron runs also require an admin-key header — see /docs.
        </p>
        <p>See /docs for the live endpoint list.</p>
      </div>
    </div>
  );
}
