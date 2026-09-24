export default function Privacy() {
  return (
    <div className="scene prose-scene">
      <h1 className="page-title">Privacy</h1>
      <div className="prose">
        <p>
          Agna stores search results in a shared cache table so repeat gallery loads do not
          re-query the four source APIs. Cached rows carry only what the sources publish: id,
          title, url, thumb, tags, and filter key.
        </p>
        <p>
          Settings — API base, API origin, Supabase URL, and an optional Velouri portrait URL —
          live only in this browser&apos;s localStorage under <span className="mono">agna.settings.v1</span>.
          Nothing in Settings is sent to Postgres.
        </p>
        <p>
          Login uses the configured Supabase project only. Agna never opens a second Supabase
          project from the browser.
        </p>
      </div>
    </div>
  );
}
