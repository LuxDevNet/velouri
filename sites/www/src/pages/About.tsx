export default function About() {
  return (
    <div className="scene prose-scene">
      <h1 className="page-title">About</h1>
      <div className="prose">
        <p>
          Agna is a federated stock-photo search API. It reshapes a handful of default filters
          into richer queries, fans them out to four sources, and caches what comes back.
        </p>
        <p>
          Velouri is its companion stage — the same cached gallery, staged in three dimensions,
          with an orbiting plate that carries either a portrait or a geometric placeholder.
        </p>
      </div>
    </div>
  );
}
